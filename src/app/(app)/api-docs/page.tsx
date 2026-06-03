"use client";

import { Card, PageHeader } from "@/components/ui";
import { ApiDocMarkdown } from "@/components/api-doc-markdown";
import { API_PERMISSION_ROWS, getOpenApiInfo, getOpenApiTags } from "@/lib/openapi/catalog";

export default function ApiDocsPage() {
  const info = getOpenApiInfo();

  return (
    <div className="space-y-6">
      <PageHeader
        title="API guide"
        description={`${info.title} ${info.version} — same contract as the backend Swagger export, rendered for your team.`}
      />

      <Card>
        <div className="text-sm font-medium">Permissions</div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Role administration in WLTR uses these permission claim values. They match the OpenAPI permissions reference.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-3">Permission</th>
                <th className="py-2 pr-3">Label</th>
                <th className="py-2 pr-3">Typical roles</th>
              </tr>
            </thead>
            <tbody>
              {API_PERMISSION_ROWS.map((row) => (
                <tr key={row.permission} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-3 font-mono">{row.permission}</td>
                  <td className="py-2 pr-3">{row.label}</td>
                  <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">{row.heldBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Endpoint groups</div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {getOpenApiTags().map((tag) => (
            <li
              key={tag.name}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800"
            >
              <div className="font-medium">{tag.name}</div>
              {tag.description ? (
                <p className="mt-1 text-neutral-600 dark:text-neutral-400">{tag.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="max-w-none">
        <ApiDocMarkdown source={info.description} />
      </Card>
    </div>
  );
}
