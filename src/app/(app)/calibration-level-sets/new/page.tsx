"use client";

import { DepartmentPicker, useActiveDepartmentCount } from "@/components/department-picker";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createCalibrationLevelSet } from "@/lib/api/wltr-api";
import { PERMS, hasPermission, isPlatformOperator } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewCalibrationLevelSetPage() {
  const { me } = useAuth();
  const platform = isPlatformOperator(me);
  const router = useRouter();
  const { count: departmentCount, items: departmentItems } = useActiveDepartmentCount();
  const departmentRequired = departmentCount > 1;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    if (!hasPermission(me, PERMS.configEdit)) router.replace("/calibration-level-sets");
  }, [me, router]);

  useEffect(() => {
    if (departmentCount === 1 && !departmentId) {
      const only = departmentItems[0] as Record<string, unknown> | undefined;
      const id = typeof only?.id === "string" ? only.id : "";
      if (id) setDepartmentId(id);
    }
  }, [departmentCount, departmentItems, departmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (departmentRequired && !departmentId) {
      setError("Select a department — this laboratory has more than one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createCalibrationLevelSet({
        name: name.trim(),
        departmentId: departmentId || null,
      });
      const id = String((res as { id?: string }).id ?? "");
      router.replace(`/calibration-level-sets/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPermission(me, PERMS.configEdit)) return null;

  return (
    <div>
      <PageHeader
        title="New calibration level set"
        description="Created active in your laboratory. Add its levels from the set page, then reference it from a method config."
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={256}
              placeholder="e.g. VOC 8260"
            />
            <p className="mt-1 text-xs text-neutral-500">Unique per department (after normalization).</p>
          </div>
          {!platform ? (
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <DepartmentPicker
                id="departmentId"
                value={departmentId}
                onChange={setDepartmentId}
                required={departmentRequired}
              />
              <p className="mt-1 text-xs text-neutral-500">
                {departmentRequired
                  ? "Required when the laboratory has more than one department."
                  : "Optional when the laboratory has a single department (inferred if omitted)."}
              </p>
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <Button type="submit" disabled={busy || !name.trim() || (departmentRequired && !departmentId)}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
