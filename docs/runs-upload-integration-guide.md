# POST /api/runs/upload — Integration Guide

> File-based calibration run upload. Submit an instrument export file directly instead of pasting its
> contents into a JSON text field. After the server decodes the file, the downstream pipeline —
> parsing, measurement creation, validation, and auditing — is identical to `POST /api/runs`.

---

## Overview

`POST /api/runs/upload` is a **file-upload variant** of `POST /api/runs`. Instead of embedding the
raw instrument text inside a JSON body (`rawText`), the caller sends a `multipart/form-data`
request with the instrument export as a binary file attachment alongside the same run metadata
(`runType`, `instrumentId`, `runDate`, optional `level` and `name`).

Once the server reads and decodes the file, both endpoints share the exact same pipeline, so the
outcomes — stored run, parsed measurements, validation warnings, and audit trail — are identical.

| Characteristic | `POST /api/runs` | `POST /api/runs/upload` |
|---|---|---|
| Content-Type | `application/json` | `multipart/form-data` |
| Instrument data | `rawText` string field | File part (`*.csv`, `*.txt`, `*.xlsx`) |
| Metadata fields | Top-level JSON keys | Form-data parts |
| Response shape | `CreateRunResponse` | `CreateRunResponse` |
| `Location` header | `GET /api/runs/{id}` | `GET /api/runs/{id}` |

---

## Auth & Scope

| Requirement | Detail |
|---|---|
| **Header** | `Authorization: Bearer <jwt>` on every request |
| **Permission** | `perm.runs.upload` (held by Analyst, LabAdmin, SuperAdmin) |
| **Lab technician profile** | Caller must have an active lab technician profile linked to their Identity user |
| **Instrument scope** | `instrumentId` must belong to the caller's laboratory; cross-lab IDs return **400** |
| **Platform / operator users** | Must append `?laboratoryId=<uuid>` (no lab claim in token) |

---

## Request

```http
POST /api/runs/upload?laboratoryId=<uuid>   ← optional, platform operators only
Content-Type: multipart/form-data
Authorization: Bearer <jwt>
```

### Form-data parts

| Part | Type | Required | Description |
|---|---|---|---|
| `file` | File | **Yes** | Instrument export file (`.csv`, `.txt`, `.xlsx`, or other text-based formats). The server decodes the file content into the same `rawText` payload used by `POST /api/runs`. |
| `runType` | `string` | **Yes** | `CAL` (0) or `ICV` (1). |
| `instrumentId` | `string` (UUID) | **Yes** | Target instrument; must belong to the caller's laboratory. |
| `runDate` | `string` (ISO 8601) | **Yes** | Acquisition or upload timestamp (UTC recommended). |
| `level` | `string` | CAL only | Calibration level label (e.g. `Cal_10ppb`). Resolved by normalized name to a calibration level in the caller's laboratory. Case-insensitive; ignores underscores, hyphens, and extra whitespace. Ignored for ICV uploads. |
| `name` | `string` | No | Optional human-readable label. Defaults to `"{RunType} {RunDate:yyyy-MM-dd}"` when omitted. Maximum 256 characters. |

### Example — cURL

```bash
curl -X POST "https://api.example.com/api/runs/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@MS4-VOC-230120.csv" \
  -F "runType=CAL" \
  -F "instrumentId=550e8400-e29b-41d4-a716-446655440000" \
  -F "runDate=2023-01-20T09:30:00Z" \
  -F "level=Cal_10ppb" \
  -F "name=MS4 VOC CAL 10 ppb"
```

### Example — JavaScript (fetch)

```js
const form = new FormData();
form.append("file", fileInput.files[0]);
form.append("runType", "CAL");
form.append("instrumentId", "550e8400-e29b-41d4-a716-446655440000");
form.append("runDate", new Date("2023-01-20T09:30:00Z").toISOString());
form.append("level", "Cal_10ppb");
form.append("name", "MS4 VOC CAL 10 ppb");

const res = await fetch("/api/runs/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});

const data = await res.json();
// data: { id, warnings, measurementCount, measurementWarnings }
console.log(`Created run ${data.id} with ${data.measurementCount} measurements`);
```

---

## Response

### `201 Created` — Success

```jsonc
{
  "id": "uuid",                         // pass to GET /api/runs/{id}
  "warnings": [                         // header parse warnings (non-fatal)
    "Could not parse acquisition time from header line 1"
  ],
  "measurementCount": 42,               // number of successfully parsed compound rows
  "measurementWarnings": [              // flattened per-row parse + validation messages
    "Row 5 (Toluene): no matching analyte mapping",
    "Row 12 (Xylene): missing response ratio — IS row present but no signal"
  ]
}
```

| Header | Value |
|---|---|
| `Location` | `/api/runs/{id}` — follow this to GET the full run detail |

The upload **succeeds** even when `warnings` or `measurementWarnings` are present. Check
`status` on the subsequent `GET /api/runs/{id}` detail to determine usability. For machine-readable
validation with `code`, `isError`, and `measurementId` fields, call
`GET /api/runs/{id}/validation` after upload.

### Error responses

| Status | Meaning |
|---|---|
| `400` | Invalid request — missing file, cross-lab instrument, or malformed metadata. Response body is `ProblemDetails`. |
| `401` | Missing or expired JWT. Refresh and retry. |
| `403` | Caller lacks `perm.runs.upload`, or no active lab technician profile. |

---

## Downstream flow

After a successful upload, the run follows the same lifecycle as one created via `POST /api/runs`:

```
POST /api/runs/upload
       │
       ▼
  GET /api/runs/{id}                    — run detail, status, linked calibration group
  GET /api/runs/{id}/measurements       — per-row compound measurements with response ratios
  GET /api/runs/{id}/validation         — structured validation errors and warnings
  GET /api/runs/{id}/internal-standard-summaries — IS response statistics
  POST /api/runs/{id}/analyte-mapping/resolve    — resolve raw compound names to analytes
```

---

## File format

The server auto-detects the file format and decodes the instrument export text from the file
content. The decoded text follows the same pipeline as the `rawText` field on `POST /api/runs`. If
the file cannot be decoded, the server returns **400** with a `ProblemDetails` body whose `detail`
field explains the specific failure.

---

## Differences from `POST /api/runs`

| Aspect | `POST /api/runs` | `POST /api/runs/upload` |
|---|---|---|
| **How data arrives** | JSON body with `rawText` string | Multipart file attachment |
| **Max payload size** | Governed by JSON body limit | Governed by multipart file-upload limit (typically larger) |
| **Client workflow** | Read file → paste into textarea → submit JSON | Select file → submit form |
| **Manual pre-processing** | Supported (edit raw text before upload) | Not supported (file sent as-is) |
| **Everything else** | Identical — same response, same downstream pipeline, same audit trail | |

---

## Reference (existing codebase)

| Concern | Location |
|---|---|
| JSON upload API wrapper | `createRun()` — `src/lib/api/wltr-api.ts:372` |
| JSON upload UI page | `src/app/(app)/runs/upload/page.tsx` |
| File upload client pattern | `importLabConfig()` — `src/lib/api/wltr-api.ts` |
| API fetch client | `apiFetch()` / `apiJson()` — `src/lib/api/client.ts` |
| Permissions table | `API_PERMISSION_ROWS` — `src/lib/openapi/catalog.ts:75` |
| Run detail page | `src/app/(app)/runs/[id]/page.tsx` |
