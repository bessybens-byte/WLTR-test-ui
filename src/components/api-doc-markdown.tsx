"use client";

import type { ReactNode } from "react";

/** Lightweight markdown for OpenAPI `info.description` (headings, lists, tables, code). */
export function ApiDocMarkdown({ source }: { readonly source: string }) {
  const blocks = source.split(/\n(?=## )/);

  return (
    <article className="prose-api space-y-8 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
      {blocks.map((block, i) => (
        <section key={i}>{renderBlock(block.trim())}</section>
      ))}
    </article>
  );
}

function renderBlock(block: string) {
  const lines = block.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {inlineFormat(line.slice(3))}
        </h2>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {inlineFormat(line.slice(4))}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      nodes.push(renderTable(tableLines));
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      nodes.push(
        <pre
          key={`code-${i}`}
          className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950"
        >
          <code className={lang ? `language-${lang}` : undefined}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items.map((item, j) => (
            <li key={j}>{inlineFormat(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("## ") && !lines[i].startsWith("### ")) {
      if (lines[i].startsWith("|") || lines[i].startsWith("```") || lines[i].match(/^[-*] /)) break;
      para.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={`p-${i}`} className="text-neutral-700 dark:text-neutral-300">
        {inlineFormat(para.join(" "))}
      </p>,
    );
  }

  return <>{nodes}</>;
}

function renderTable(tableLines: string[]) {
  const rows = tableLines
    .filter((l) => !l.includes("---"))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  if (!rows.length) return null;
  const [head, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium">
                {inlineFormat(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-900">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 align-top">
                  {inlineFormat(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function inlineFormat(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
