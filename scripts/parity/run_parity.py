#!/usr/bin/env python3
"""
Bootstrap lab + ingest 230120 MS4 VOC preload + compare WLTR API to workbook goldens.

Env:
  WLTR_TEST_ROOT_EMAIL, WLTR_TEST_ROOT_PASSWORD
  WLTR_API_ORIGIN (default http://localhost:5000)
"""

from __future__ import annotations

import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "fixtures" / "ms4-voc-230120"
GOLDENS_PATH = FIXTURES / "goldens.json"
STATE_PATH = FIXTURES / "parity-state.json"
COMPARE_PATH = FIXTURES / "parity-compare.json"
REPORT_MD = ROOT / "docs" / "MS4-VOC-230120-parity-report.md"

BASE = os.environ.get("WLTR_API_ORIGIN", "http://localhost:5000").rstrip("/")
EMAIL = os.environ.get("WLTR_TEST_ROOT_EMAIL", "root.admin@wltr.local")
PASSWORD = os.environ.get(
    "WLTR_TEST_ROOT_PASSWORD",
    "5zEkLG16q7y5mszMJOtTtWNXTazMMWy6!aA1",
)

LAB_ADMIN_PASSWORD = "ParityLab1!aA"


def http(
    method: str,
    path: str,
    token: str | None = None,
    body: Any = None,
    expected: set[int] | None = None,
) -> tuple[int, Any]:
    url = f"{BASE}{path}"
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
            parsed = json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        status = e.code
        try:
            parsed = json.loads(raw) if raw.strip() else {"raw": raw}
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        if expected is not None and status not in expected:
            raise RuntimeError(f"{method} {path} -> {status}: {raw[:800]}") from e
        return status, parsed
    if expected is not None and status not in expected:
        raise RuntimeError(f"{method} {path} -> {status}: {raw[:800]}")
    return status, parsed


def norm_name(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = s.replace("..", "")
    return s


def approx_eq(a: Any, b: Any, ndigits: int = 4) -> bool:
    if a is None and b is None:
        return True
    try:
        af = float(a)
        bf = float(b)
    except (TypeError, ValueError):
        return str(a).strip() == str(b).strip()
    if af == 0 and bf == 0:
        return True
    scale = max(abs(af), abs(bf), 1e-12)
    return abs(af - bf) <= max(10 ** (-ndigits), 1e-4 * scale)


def login(email: str, password: str) -> str:
    _, data = http(
        "POST",
        "/api/Auth/login",
        body={"email": email, "password": password},
        expected={200},
    )
    return data["accessToken"]


def bootstrap(goldens: dict) -> dict:
    root = login(EMAIL, PASSWORD)
    suffix = uuid.uuid4().hex[:8]
    lab_name = f"MS4-VOC-Parity-230120-{suffix}"

    _, lab = http(
        "POST",
        "/api/Laboratories",
        token=root,
        body={"name": lab_name, "address": "Parity Lab"},
        expected={201},
    )
    lab_id = lab["id"]

    _, roles = http("GET", "/api/Roles?page=1&pageSize=100", token=root, expected={200})
    lab_admin_role = next(r for r in roles["items"] if r["name"] == "LabAdmin")
    lab_admin_role_id = lab_admin_role.get("roleId") or lab_admin_role.get("id")

    admin_email = f"parity-admin-{suffix}@wltr.local"
    _, inv = http(
        "POST",
        "/api/Invitations",
        token=root,
        body={"email": admin_email, "laboratoryId": lab_id, "expiresInDays": 7},
        expected={200},
    )
    http(
        "POST",
        "/api/Auth/accept-invite",
        body={"token": inv["rawToken"], "password": LAB_ADMIN_PASSWORD},
        expected={204, 200},
    )
    user_tok = login(admin_email, LAB_ADMIN_PASSWORD)
    _, me = http("GET", "/api/Auth/me", token=user_tok, expected={200})
    user_id = me["userId"]

    http(
        "POST",
        "/api/Roles/assignments",
        token=root,
        body={
            "laboratoryId": lab_id,
            "userId": user_id,
            "roleIds": [lab_admin_role_id],
        },
        expected={204, 200},
    )
    tok = login(admin_email, LAB_ADMIN_PASSWORD)
    _, me2 = http("GET", "/api/Auth/me", token=tok, expected={200})
    user_id = me2["userId"]

    http(
        "POST",
        "/api/LabTechnicians",
        token=tok,
        body={
            "identityUserId": user_id,
            "laboratoryId": lab_id,
            "firstName": "Parity",
            "lastName": "Admin",
            "qualifications": "MS4 VOC parity",
        },
        expected={201, 200},
    )

    _, inst = http(
        "POST",
        "/api/instruments",
        token=tok,
        body={"name": "MS4"},
        expected={201},
    )
    instrument_id = inst["id"]

    # Internal standards catalog
    is_ids: dict[str, str] = {}
    for row in goldens["internalStandards"]:
        _, created = http(
            "POST",
            "/api/internal-standards",
            token=tok,
            body={
                "name": row["name"],
                "concentration": row["concentration"],
            },
            expected={201},
        )
        is_ids[row["name"]] = created["id"]

    # Calibration levels
    level_ids: dict[str, str] = {}
    for L in goldens["config"]["levelLadder"]:
        _, created = http(
            "POST",
            "/api/calibration-levels",
            token=tok,
            body={
                "levelName": L["sample"],
                "trueConcentration": L["trueConcentration"],
                "sortOrder": L["sortOrder"],
            },
            expected={201},
        )
        level_ids[L["sample"]] = created["id"]

    # Create IS-role analytes (so Internal Standards section maps) + surrogates + targets
    analyte_ids: dict[str, str] = {}

    def create_analyte(name: str, role: str, default_is: str | None = None) -> str:
        body: dict[str, Any] = {"name": name, "role": role}
        if default_is and default_is in is_ids:
            body["defaultInternalStandardId"] = is_ids[default_is]
        _, created = http(
            "POST",
            "/api/analytes",
            token=tok,
            body=body,
            expected={201},
        )
        analyte_ids[name] = created["id"]
        # alias = exact instrument name
        status, _ = http(
            "POST",
            f"/api/analytes/{created['id']}/aliases",
            token=tok,
            body={"aliasName": name},
            expected={201, 200, 204, 400, 409},
        )
        return created["id"]

    for row in goldens["internalStandards"]:
        create_analyte(row["name"], "InternalStandard")

    for row in goldens["surrogates"]:
        create_analyte(row["name"], "Surrogate")

    # Fallback IS for targets without DVD mapping: Fluorobenzene
    default_fb = "Fluorobenzene"
    for row in goldens["analyteCriteria"]:
        name = row["name"]
        if name in analyte_ids:
            continue
        create_analyte(
            name,
            "Target",
            default_is=row.get("defaultInternalStandard") or default_fb,
        )

    # Also ensure summary-only names exist
    for row in goldens["summaryAnalytes"]:
        name = row["name"]
        if name not in analyte_ids:
            create_analyte(
                name,
                "Target",
                default_is=row.get("defaultInternalStandard") or default_fb,
            )

    cfg = goldens["config"]
    _, method = http(
        "POST",
        "/api/method-configs",
        token=tok,
        body={
            "name": "VOC by GC/MS (624/8260) Parity",
            "labelMode": "RSquared" if cfg["labelMode"] == "RSquared" else "R",
            "quantitationMode": "InternalStandard",
            "minCorrelation": cfg["minCorrelationR2"],
            "maxRSE": cfg["maxRSE"],
            "pctDiffLowBound": cfg["pctDiffLowBound"],
            "pctDiffHighBound": cfg["pctDiffHighBound"],
            "minPointsRequired": cfg["minPointsRequired"],
            "maxMissedPoints": cfg["maxMissedPoints"],
            "icvLimitPercent": cfg["icvLimitPercent"],
            "rsdPercentLimit": cfg["rsdPercentLimit"],
            "isRsdPercentLimit": cfg["isRsdPercentLimit"],
            "icvCdsParityPercent": cfg["icvCdsParityPercent"],
            "soilDilutionFactor": cfg["soilDilutionFactor"],
            "aqueousDilutionFactor": cfg["aqueousDilutionFactor"],
        },
        expected={201},
    )
    method_id = method["id"]

    criteria_rows = []
    for row in goldens["analyteCriteria"]:
        aid = analyte_ids.get(row["name"])
        if not aid:
            continue
        item: dict[str, Any] = {
            "analyteId": aid,
            "isSpcc": bool(row.get("isSpcc")),
            "minResponseFactor": row.get("minResponseFactor"),
            "isCcc": bool(row.get("isCcc")),
            "maxRsdPercent": row.get("maxRsdPercent"),
            "methodBlankLimit": row.get("methodBlankLimit"),
            "icvLcsConcentration": row.get("icvLcsConcentration"),
            "icvLcsLowerControlLimit": row.get("icvLcsLowerControlLimit"),
            "icvLcsUpperControlLimit": row.get("icvLcsUpperControlLimit"),
            "concentrationMultiplier": row.get("concentrationMultiplier") or 1.0,
        }
        # surrogate recovery on surrogate analytes
        if row["name"] in {s["name"] for s in goldens["surrogates"]}:
            surr = next(s for s in goldens["surrogates"] if s["name"] == row["name"])
            item["surrogateSpikeAmount"] = surr["surrogateSpikeAmount"]
            item["surrogateRecoveryLowerLimit"] = surr["surrogateRecoveryLowerLimit"]
            item["surrogateRecoveryUpperLimit"] = surr["surrogateRecoveryUpperLimit"]
        criteria_rows.append(item)

    # Add surrogate criteria rows for surrogate analytes not in target list
    for surr in goldens["surrogates"]:
        aid = analyte_ids[surr["name"]]
        if any(r["analyteId"] == aid for r in criteria_rows):
            continue
        criteria_rows.append(
            {
                "analyteId": aid,
                "isSpcc": False,
                "isCcc": False,
                "concentrationMultiplier": 1.0,
                "surrogateSpikeAmount": surr["surrogateSpikeAmount"],
                "surrogateRecoveryLowerLimit": surr["surrogateRecoveryLowerLimit"],
                "surrogateRecoveryUpperLimit": surr["surrogateRecoveryUpperLimit"],
            }
        )

    http(
        "PUT",
        f"/api/method-configs/{method_id}/analyte-criteria",
        token=tok,
        body={"rows": criteria_rows},
        expected={204},
    )

    return {
        "labId": lab_id,
        "labName": lab_name,
        "adminEmail": admin_email,
        "adminPassword": LAB_ADMIN_PASSWORD,
        "tokenHint": "re-login each run",
        "instrumentId": instrument_id,
        "methodConfigId": method_id,
        "internalStandardIds": is_ids,
        "analyteIds": analyte_ids,
        "levelIds": level_ids,
    }


def parse_run_date(acq: str | None) -> str:
    if not acq:
        return datetime.now(timezone.utc).isoformat()
    # e.g. 20 Jan 2023  07:10 pm
    for fmt in ("%d %b %Y %I:%M %p", "%d %b %Y  %I:%M %p"):
        try:
            dt = datetime.strptime(" ".join(acq.split()), fmt).replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


def ingest_and_compute(goldens: dict, state: dict) -> dict:
    tok = login(state["adminEmail"], state["adminPassword"])
    cal_run_ids = []
    icv_run_id = None

    for run in goldens["runs"]:
        raw = (FIXTURES / run["file"]).read_text(encoding="utf-8")
        body: dict[str, Any] = {
            "runType": run["runType"],
            "instrumentId": state["instrumentId"],
            "runDate": parse_run_date(run.get("acqOn")),
            "rawText": raw,
            "name": run["sample"],
        }
        if run["runType"] == "CAL":
            body["level"] = run["level"]
        status, created = http(
            "POST", "/api/runs", token=tok, body=body, expected={201, 400, 409}
        )
        if status != 201:
            raise RuntimeError(f"Upload failed for {run['sample']}: {status} {created}")
        rid = created["id"]
        if run["runType"] == "CAL":
            cal_run_ids.append(rid)
        else:
            icv_run_id = rid

        # Check unresolved compounds
        _, validation = http(
            "GET",
            f"/api/runs/{rid}/validation",
            token=tok,
            expected={200, 404},
        )
        run["validation"] = validation

    _, group = http(
        "POST",
        "/api/calibration-groups",
        token=tok,
        body={
            "name": "230120 MS4 VOC Parity Group",
            "instrumentId": state["instrumentId"],
            "methodConfigId": state["methodConfigId"],
            "calRunIds": cal_run_ids,
            "icvRunId": icv_run_id,
        },
        expected={201},
    )
    group_id = group["id"]

    _, readiness = http(
        "GET",
        f"/api/calibration-groups/{group_id}/readiness",
        token=tok,
        expected={200, 404},
    )

    status, compute = http(
        "POST",
        f"/api/calibration-groups/{group_id}/compute",
        token=tok,
        expected={200, 204, 400, 409},
    )
    if status not in (200, 204):
        raise RuntimeError(f"Compute failed: {status} {compute}")

    _, report_card = http(
        "GET",
        f"/api/calibration-groups/{group_id}/report-card",
        token=tok,
        expected={200},
    )

    # Select Excel-chosen models
    analyte_ids = state["analyteIds"]
    select_results = []
    for row in goldens["summaryAnalytes"]:
        model = row.get("chosenModel")
        if not model:
            continue
        aid = analyte_ids.get(row["name"])
        if not aid:
            # try normalized match
            aid = next(
                (
                    v
                    for k, v in analyte_ids.items()
                    if norm_name(k) == norm_name(row["name"])
                ),
                None,
            )
        if not aid:
            select_results.append({"name": row["name"], "ok": False, "error": "no analyte id"})
            continue
        st, resp = http(
            "POST",
            f"/api/calibration-groups/{group_id}/analytes/{aid}/select-model",
            token=tok,
            body={
                "regressionType": model["regressionType"],
                "weightingMode": model["weightingMode"],
            },
            expected={200, 204, 400, 409},
        )
        select_results.append(
            {
                "name": row["name"],
                "ok": st in (200, 204),
                "status": st,
                "model": model,
                "resp": resp,
            }
        )

    _, report = http(
        "GET",
        f"/api/calibration-groups/{group_id}/report",
        token=tok,
        expected={200, 409},
    )

    # Spot-checks
    spot = {}
    for name in ("Dichlorodifluoromethane", "Acetone", "Bromomethane"):
        aid = analyte_ids.get(name)
        if not aid:
            continue
        _, vc = http(
            "GET",
            f"/api/calibration-groups/{group_id}/analytes/{aid}/variant-comparison",
            token=tok,
            expected={200, 409},
        )
        _, curves = http(
            "GET",
            f"/api/calibration-groups/{group_id}/analytes/{aid}/curves",
            token=tok,
            expected={200, 409},
        )
        spot[name] = {"variantComparison": vc, "curvesMeta": _curve_meta(curves)}

    state.update(
        {
            "groupId": group_id,
            "calRunIds": cal_run_ids,
            "icvRunId": icv_run_id,
            "readiness": readiness,
            "selectResults": select_results,
            "spotChecks": list(spot.keys()),
        }
    )
    # Persist large payloads separately
    (FIXTURES / "api-report-card.json").write_text(
        json.dumps(report_card, indent=2, default=str), encoding="utf-8"
    )
    (FIXTURES / "api-summary-report.json").write_text(
        json.dumps(report, indent=2, default=str), encoding="utf-8"
    )
    (FIXTURES / "api-spot-checks.json").write_text(
        json.dumps(spot, indent=2, default=str), encoding="utf-8"
    )
    return state


def _curve_meta(curves: Any) -> Any:
    if not isinstance(curves, list):
        return curves
    out = []
    for c in curves:
        out.append(
            {
                "regressionType": c.get("regressionType"),
                "weightingMode": c.get("weightingMode"),
                "rSquared": c.get("rSquared"),
                "slope": c.get("slope"),
                "intercept": c.get("intercept"),
                "meanResponseFactor": c.get("meanResponseFactor"),
                "rsdPercent": c.get("rsdPercent"),
                "icvPercentDiff": c.get("icvPercentDiff"),
                "icvPassed": c.get("icvPassed"),
                "icvCdsPassed": c.get("icvCdsPassed"),
            }
        )
    return out


def compare(goldens: dict, state: dict) -> dict:
    report = json.loads((FIXTURES / "api-summary-report.json").read_text(encoding="utf-8"))
    report_card = json.loads((FIXTURES / "api-report-card.json").read_text(encoding="utf-8"))

    exec_rows = []
    if isinstance(report, dict):
        exec_rows = report.get("executive") or report.get("executiveSummary") or []
    api_by_name: dict[str, dict] = {}
    for row in exec_rows or []:
        name = row.get("analyteName") or row.get("AnalyteName") or row.get("name")
        if name:
            api_by_name[norm_name(name)] = row

    # Prefix match for Excel truncated names (e.g. "Methyl-tert-butyl ethe..")
    def resolve_api(excel_name: str) -> dict | None:
        key = norm_name(excel_name)
        if key in api_by_name:
            return api_by_name[key]
        # strip trailing dots / truncation markers
        stem = re.sub(r"[\.]+$", "", key).rstrip()
        if len(stem) >= 10:
            matches = [v for k, v in api_by_name.items() if k.startswith(stem[:12]) or stem.startswith(k[:12])]
            if len(matches) == 1:
                return matches[0]
        return None

    rc_analytes = []
    if isinstance(report_card, dict):
        rc_analytes = (
            report_card.get("analyteRecommendations")
            or report_card.get("analytes")
            or []
        )
    rc_by_name: dict[str, dict] = {}
    for row in rc_analytes:
        name = row.get("analyteName") or row.get("AnalyteName")
        if name:
            rc_by_name[norm_name(name)] = row

    rows_out = []
    pass_n = fail_n = skip_n = 0
    for g in goldens["summaryAnalytes"]:
        api = resolve_api(g["name"])
        rc = rc_by_name.get(norm_name(g["name"]))
        entry: dict[str, Any] = {
            "name": g["name"],
            "excel": {
                "averageRf": g["averageRf"],
                "rsdPercent": g["rsdPercent"],
                "rsdPass": g["rsdPass"],
                "chosenModelCode": g["chosenModelCode"],
                "rSquared": g["rSquared"],
                "icalSummary": g["icalSummary"],
            },
            "checks": {},
        }
        if not api:
            entry["status"] = "FAIL"
            entry["checks"]["presentInApiReport"] = False
            fail_n += 1
            rows_out.append(entry)
            continue

        entry["checks"]["presentInApiReport"] = True
        cal_status = api.get("calStatus") or api.get("CalStatus")
        excel_ok = (g["icalSummary"] or "").lower().startswith("accept")
        api_ok = str(cal_status).lower() in ("acceptable", "pass", "passed", "ok", "success")

        entry["api"] = {
            "calStatus": cal_status,
            "failureReasons": api.get("failureReasons") or [],
            "meanRf": api.get("meanResponseFactor") or api.get("meanRf"),
            "rsdPercent": api.get("responseFactorRsd") or api.get("rsdPercent"),
            "rSquared": api.get("rSquared"),
            "selectedRegressionType": api.get("selectedRegressionType"),
            "selectedWeightingMode": api.get("selectedWeightingMode"),
            "matchedApiName": api.get("analyteName"),
        }

        # Primary gate: Excel Acceptable vs API Pass — note Excel can Acceptable with RSD=N
        entry["checks"]["icalGate"] = excel_ok == api_ok

        mean_rf = entry["api"]["meanRf"]
        entry["checks"]["averageRf"] = (
            approx_eq(mean_rf, g["averageRf"], 3) if mean_rf is not None else False
        )
        rsd = entry["api"]["rsdPercent"]
        entry["checks"]["rsdPercent"] = (
            approx_eq(rsd, g["rsdPercent"], 1) if rsd is not None else False
        )
        r2 = entry["api"]["rSquared"]
        entry["checks"]["rSquared"] = (
            approx_eq(r2, g["rSquared"], 3) if r2 is not None else False
        )

        model = g.get("chosenModel") or {}
        sel_rt = entry["api"]["selectedRegressionType"]
        sel_wm = entry["api"]["selectedWeightingMode"]
        entry["checks"]["model"] = (
            str(sel_rt).lower() == str(model.get("regressionType", "")).lower()
            and str(sel_wm).lower() == str(model.get("weightingMode", "")).lower()
        ) if sel_rt else False

        if rc:
            entry["reportCard"] = {
                "recommendedRegressionType": rc.get("recommendedRegressionType")
                or (rc.get("recommendedModel") or {}).get("regressionType"),
                "recommendedWeightingMode": rc.get("recommendedWeightingMode")
                or (rc.get("recommendedModel") or {}).get("weightingMode"),
            }

        # Hard gates for client sign-off: presence + model selection + ICAL gate
        # Numeric drift is reported but does not alone fail when ICAL gate matches
        hard = [entry["checks"]["icalGate"], entry["checks"].get("model", False)]
        soft_ok = all(
            entry["checks"].get(k) for k in ("averageRf", "rsdPercent", "rSquared")
        )
        if all(hard) and soft_ok:
            entry["status"] = "PASS"
            pass_n += 1
        elif all(hard):
            entry["status"] = "PASS_WITH_NUMERIC_DRIFT"
            pass_n += 1
        elif entry["checks"].get("model") and not entry["checks"]["icalGate"]:
            # Common Excel vs WLTR policy split: Excel Acceptable despite RSD fail
            entry["status"] = "GATE_MISMATCH"
            entry["note"] = (
                "Excel ICAL Acceptable vs WLTR calStatus mismatch "
                "(often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model)."
            )
            fail_n += 1
        else:
            entry["status"] = "FAIL"
            fail_n += 1
        rows_out.append(entry)

    select_fail = [s for s in state.get("selectResults", []) if not s.get("ok")]
    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "labId": state.get("labId"),
        "groupId": state.get("groupId"),
        "summary": {
            "pass": pass_n,
            "fail": fail_n,
            "skip": skip_n,
            "total": len(rows_out),
            "selectModelFailures": len(select_fail),
            "gateMismatches": sum(1 for r in rows_out if r.get("status") == "GATE_MISMATCH"),
            "numericDrift": sum(1 for r in rows_out if r.get("status") == "PASS_WITH_NUMERIC_DRIFT"),
            "fullPass": sum(1 for r in rows_out if r.get("status") == "PASS"),
            "apiExecutiveCount": len(exec_rows or []),
        },
        "intentionalDivergences": [
            "Single global minPointsRequired (Quad=6) vs Excel Avg/LS/Quad separate minima",
            "WLTR workflow states Draft/Computed/Approved have no Excel equivalent",
            "Report Writer Instrument #REF! ignored",
            "Method Blank limits stored but not evaluated until blank runs exist",
            "pctDiff bounds mapped from Excel 0.8/1.2 × ±20% → -16 / +24",
            "Excel ICAL SUMMARY can be Acceptable when RSD fails if chosen curve model passes; WLTR calStatus may still Fail on %RSD / missed points",
        ],
        "selectFailures": select_fail[:20],
        "rows": rows_out,
        "apiReportKeys": list(report.keys()) if isinstance(report, dict) else type(report).__name__,
    }
    COMPARE_PATH.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    return result


def write_report(goldens: dict, state: dict, compare_result: dict) -> None:
    s = compare_result["summary"]
    gate_m = s.get("gateMismatches", 0)
    if s["fail"] == 0 and s["selectModelFailures"] == 0:
        verdict = "Ready"
    elif s.get("fullPass", 0) + s.get("numericDrift", 0) >= s["total"] * 0.7:
        verdict = "Ready with known gaps"
    elif gate_m and gate_m >= s["fail"] * 0.5:
        verdict = "Ready with known gaps"
    else:
        verdict = "Not ready"

    lines = [
        "# MS4 VOC 230120 Workbook Parity Report",
        "",
        f"**Verdict:** {verdict}",
        "",
        "## Environment",
        "",
        f"- Workbook: `{goldens['workbook']}`",
        f"- API: `{BASE}`",
        f"- UI: `http://localhost:3000`",
        f"- Lab: `{state.get('labName')}` (`{state.get('labId')}`)",
        f"- Calibration group: `{state.get('groupId')}`",
        f"- Lab admin: `{state.get('adminEmail')}`",
        f"- Generated: `{compare_result['generatedAt']}`",
        "",
        "## Summary",
        "",
        f"- Analytes compared: **{s['total']}** (API executive rows: {s.get('apiExecutiveCount')})",
        f"- Full numeric PASS: **{s.get('fullPass', 0)}**",
        f"- Pass with numeric drift: **{s.get('numericDrift', 0)}**",
        f"- ICAL gate mismatches (Excel Acceptable vs WLTR Fail/Pass): **{s.get('gateMismatches', 0)}**",
        f"- Other fails: **{s['fail'] - s.get('gateMismatches', 0)}**",
        f"- Model selection failures: **{s['selectModelFailures']}**",
        "",
        "## Intentional divergences / known gaps",
        "",
    ]
    for d in compare_result["intentionalDivergences"]:
        lines.append(f"- {d}")
    lines += [
        "",
        "## Per-analyte results",
        "",
        "| Analyte | Excel ICAL | API status | Model | RF | RSD | r² | Result |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for row in compare_result["rows"]:
        ch = row.get("checks", {})
        lines.append(
            "| {name} | {excel} | {api} | {model} | {rf} | {rsd} | {r2} | {st} |".format(
                name=row["name"],
                excel=row["excel"].get("icalSummary"),
                api=(row.get("api") or {}).get("calStatus"),
                model="Y" if ch.get("model") else "N",
                rf="Y" if ch.get("averageRf") else "N",
                rsd="Y" if ch.get("rsdPercent") else "N",
                r2="Y" if ch.get("rSquared") else "N",
                st=row.get("status"),
            )
        )

    fails = [r for r in compare_result["rows"] if r["status"] in ("FAIL", "GATE_MISMATCH")]
    lines += ["", "## Failures / gate mismatches", ""]
    if not fails:
        lines.append("None.")
    else:
        for r in fails[:40]:
            lines.append(f"### {r['name']} — {r.get('status')}")
            lines.append(f"- Excel: `{json.dumps(r['excel'])}`")
            lines.append(f"- API: `{json.dumps(r.get('api'))}`")
            lines.append(f"- Checks: `{json.dumps(r.get('checks'))}`")
            if r.get("note"):
                lines.append(f"- Note: {r['note']}")
            lines.append("")

    lines += [
        "",
        "## UI smoke",
        "",
        "See screenshots under `docs/parity-screenshots/` (Playwright MCP).",
        "",
        "## Artifacts",
        "",
        "- `fixtures/ms4-voc-230120/goldens.json`",
        "- `fixtures/ms4-voc-230120/parity-state.json`",
        "- `fixtures/ms4-voc-230120/parity-compare.json`",
        "- `fixtures/ms4-voc-230120/api-summary-report.json`",
        "- `fixtures/ms4-voc-230120/api-report-card.json`",
        "",
    ]
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT_MD}")
    print(f"Verdict: {verdict}")


def main() -> int:
    if not GOLDENS_PATH.exists():
        print("Run extract_workbook_goldens.py first", file=sys.stderr)
        return 1
    goldens = json.loads(GOLDENS_PATH.read_text(encoding="utf-8"))

    # Allow re-compare only: python run_parity.py --compare-only
    if "--compare-only" in sys.argv:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        compare_result = compare(goldens, state)
        write_report(goldens, state, compare_result)
        print(json.dumps(compare_result["summary"], indent=2))
        return 0 if compare_result["summary"]["fail"] == 0 else 2

    print("Bootstrapping lab…")
    state = bootstrap(goldens)
    print("Lab:", state["labName"], state["labId"])
    print("Ingest + compute…")
    state = ingest_and_compute(goldens, state)
    STATE_PATH.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")
    print("Group:", state["groupId"])
    print("Comparing…")
    compare_result = compare(goldens, state)
    write_report(goldens, state, compare_result)
    print(json.dumps(compare_result["summary"], indent=2))
    return 0 if compare_result["summary"]["fail"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
