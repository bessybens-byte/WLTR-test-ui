import type { ReactNode } from "react";

/** Shown on detail pages when the user can view but not edit. */
export function ViewOnlyNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-400">
      {children ??
        "View only. Ask a lab administrator to grant lab configuration access if you need to make changes."}
    </p>
  );
}
