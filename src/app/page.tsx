"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (me) router.replace("/dashboard");
    else router.replace("/login");
  }, [me, loading, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-600 dark:text-neutral-400">
      Redirecting…
    </div>
  );
}
