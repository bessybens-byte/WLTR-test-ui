"use client";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api/client";
import { parseErrorResponse } from "@/lib/api/errors";
import { putMe } from "@/lib/api/wltr-api";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { me, refreshMe } = useAuth();
  const qc = useQueryClient();
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    qualifications: "",
    hireDate: "",
    rowVersion: "",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (!me) return;
    setProfile({
      firstName: me.firstName ?? "",
      lastName: me.lastName ?? "",
      qualifications: me.qualifications ?? "",
      hireDate: me.hireDate ? String(me.hireDate).slice(0, 16) : "",
      rowVersion: me.rowVersion ?? "",
    });
  }, [me]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await putMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
        qualifications: profile.qualifications || undefined,
        hireDate: profile.hireDate ? new Date(profile.hireDate).toISOString() : undefined,
        rowVersion: profile.rowVersion || undefined,
      });
    },
    onSuccess: async () => {
      await refreshMe();
      await qc.invalidateQueries();
    },
  });

  const changePw = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("Auth/change-password", {
        method: "POST",
        body: JSON.stringify(pw),
      });
      if (!res.ok) throw await parseErrorResponse(res);
    },
    onSuccess: async () => {
      setPw({ currentPassword: "", newPassword: "" });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Profile and password." />

      <Card>
        <div className="text-sm font-medium">Profile (PUT /api/Auth/me)</div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="qualifications">Qualifications</Label>
            <Input
              id="qualifications"
              value={profile.qualifications}
              onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hireDate">Hire date</Label>
            <Input
              id="hireDate"
              type="datetime-local"
              value={profile.hireDate}
              onChange={(e) => setProfile({ ...profile, hireDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="rowVersion">rowVersion (from GET /me)</Label>
            <Input id="rowVersion" value={profile.rowVersion} onChange={(e) => setProfile({ ...profile, rowVersion: e.target.value })} />
          </div>
          {saveProfile.isError ? <div className="text-sm text-red-600">{(saveProfile.error as Error).message}</div> : null}
          <Button type="submit" disabled={saveProfile.isPending}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card>
        <div className="text-sm font-medium">Change password</div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            changePw.mutate();
          }}
        >
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              required
            />
          </div>
          {changePw.isError ? <div className="text-sm text-red-600">{(changePw.error as Error).message}</div> : null}
          {changePw.isSuccess ? <div className="text-sm text-emerald-700">Password updated.</div> : null}
          <Button type="submit" disabled={changePw.isPending}>
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
