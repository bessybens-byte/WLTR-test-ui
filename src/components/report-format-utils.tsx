import { Badge } from "@/components/ui";
import {
  analyteCalStatusLabel,
  analyteCalStatusTone,
  modelVariantLabel,
} from "@/lib/regression-wire";

export function fmtNum(v: unknown, digits = 4): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(digits) : "—";
  return String(v);
}

export function fmtBool(v: unknown): string {
  if (v == null) return "—";
  return v ? "Yes" : "No";
}

export function cell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
}

export function calStatusBadge(v: unknown) {
  const tone = analyteCalStatusTone(v);
  const label = analyteCalStatusLabel(v);
  return <Badge tone={tone}>{label}</Badge>;
}

export function passFailBadge(v: unknown) {
  if (v == null) return <span className="text-neutral-500">—</span>;
  return v ? <Badge tone="ok">Pass</Badge> : <Badge tone="bad">Fail</Badge>;
}

export function modelLabel(regressionType: unknown, weightingMode: unknown): string {
  return modelVariantLabel(regressionType, weightingMode);
}
