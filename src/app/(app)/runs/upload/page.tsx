"use client";

import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { createRun, listCalibrationLevels, listInstruments } from "@/lib/api/wltr-api";
import { MANUAL_INSTRUMENT_VALUE, pushRecentInstrument, pushRecentRun } from "@/lib/client-recent";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function UploadForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialInstrument = sp.get("instrumentId") ?? "";

  const instrumentsQuery = useQuery({
    queryKey: ["instruments", "upload-picker"],
    queryFn: () => listInstruments({ pageSize: 100, sort: "name:asc" }),
  });

  const instrumentOptions = useMemo(
    () =>
      (instrumentsQuery.data?.items ?? []).map((r) => ({
        id: s(r.id),
        name: s(r.name, s(r.id)),
      })),
    [instrumentsQuery.data],
  );

  const [instrumentChoice, setInstrumentChoice] = useState<string>(() => initialInstrument);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    runType: 0,
    level: "",
    instrumentId: initialInstrument,
    runDate: new Date().toISOString().slice(0, 16),
    name: "",
    rawText: "",
  });

  const levelsQuery = useQuery({
    queryKey: ["calibration-levels", "upload-picker"],
    queryFn: async () => {
      const page = await listCalibrationLevels({ pageSize: 100, sort: "sortOrder:asc" });
      return page.items ?? [];
    },
  });

  const levelRows = useMemo(
    () =>
      (levelsQuery.data ?? []).map((r) => ({
        name: s(r.levelName),
        conc: typeof r.trueConcentration === "number" ? r.trueConcentration : null,
      })),
    [levelsQuery.data],
  );

  function onInstrumentSelect(value: string) {
    setInstrumentChoice(value);
    if (value === MANUAL_INSTRUMENT_VALUE) return;
    setForm((f) => ({ ...f, instrumentId: value }));
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        runType: form.runType,
        instrumentId: form.instrumentId,
        runDate: new Date(form.runDate).toISOString(),
        rawText: form.rawText,
      };
      if (form.runType === 0) payload.level = form.level || undefined;
      const trimmedName = form.name.trim();
      if (trimmedName) payload.name = trimmedName.slice(0, 256);
      const res = await createRun(payload);
      const id = s((res as { id?: unknown }).id);
      pushRecentInstrument(form.instrumentId);
      pushRecentRun({ id, instrumentId: form.instrumentId, runType: form.runType });
      router.replace(`/runs/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const showManualInstrument = instrumentChoice === MANUAL_INSTRUMENT_VALUE;
  const showInstrumentIdHint = instrumentChoice !== "" && instrumentChoice !== MANUAL_INSTRUMENT_VALUE;

  return (
    <Card>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="runType">Run type</Label>
            <Select
              id="runType"
              value={String(form.runType)}
              onChange={(e) => setForm({ ...form, runType: Number(e.target.value) })}
            >
              <option value={0}>Calibration (CAL)</option>
              <option value={1}>ICV</option>
            </Select>
          </div>
          {form.runType === 0 ? (
            <div>
              <Label htmlFor="level">Calibration level</Label>
              {levelsQuery.isLoading ? <div className="mt-2 text-sm text-neutral-500">Loading levels…</div> : null}
              {levelsQuery.isError ? (
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  Could not load levels — type the level name to match your export.
                </div>
              ) : null}
              {levelsQuery.isSuccess ? (
                <Select
                  id="levelPick"
                  className="mt-1"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setForm((f) => ({ ...f, level: v }));
                  }}
                >
                  <option value="">Quick pick from catalog…</option>
                  {levelRows
                    .filter((r) => r.name)
                    .map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                        {r.conc === null ? "" : ` (${r.conc})`}
                      </option>
                    ))}
                </Select>
              ) : null}
              <Input
                id="level"
                className="mt-1"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                placeholder="e.g. Cal_10ppb — normalized match to calibration level name"
              />
            </div>
          ) : (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              ICV uploads do not use a calibration level.
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="instrumentPick">Instrument</Label>
          {instrumentsQuery.isLoading ? (
            <div className="mt-2 text-sm text-neutral-500">Loading instruments…</div>
          ) : null}
          <Select
            id="instrumentPick"
            className="mt-1"
            value={instrumentChoice}
            onChange={(e) => onInstrumentSelect(e.target.value)}
          >
            <option value="">Select instrument…</option>
            {instrumentOptions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
            <option value={MANUAL_INSTRUMENT_VALUE}>Enter UUID manually…</option>
          </Select>
          {showManualInstrument ? (
            <div className="mt-2">
              <Label htmlFor="instrumentId">Instrument UUID</Label>
              <Input
                id="instrumentId"
                className="mt-1 font-mono text-xs"
                value={form.instrumentId}
                onChange={(e) => setForm({ ...form, instrumentId: e.target.value })}
                required
              />
            </div>
          ) : null}
          {showInstrumentIdHint ? (
            <p className="mt-1 font-mono text-xs text-neutral-600 dark:text-neutral-400">{form.instrumentId}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="runDate">Run date</Label>
          <Input
            id="runDate"
            type="datetime-local"
            value={form.runDate}
            onChange={(e) => setForm({ ...form, runDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="runName">Name (optional)</Label>
          <Input
            id="runName"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={256}
            placeholder="Leave blank for server default (run type + date)"
          />
          <p className="mt-1 text-xs text-neutral-500">Max 256 characters; shown in run lists and group builder.</p>
        </div>
        <div>
          <Label htmlFor="rawText">Raw text</Label>
          <Textarea id="rawText" value={form.rawText} onChange={(e) => setForm({ ...form, rawText: e.target.value })} />
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <Button type="submit" disabled={busy || !instrumentChoice || !form.instrumentId.trim()}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </form>
    </Card>
  );
}

export default function RunUploadPage() {
  return (
    <div>
      <PageHeader title="Upload run" description="POST /api/runs" />
      <Suspense fallback={<div className="text-sm">Loading…</div>}>
        <UploadForm />
      </Suspense>
    </div>
  );
}
