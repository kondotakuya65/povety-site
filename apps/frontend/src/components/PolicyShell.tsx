import Link from "next/link";
import type { ReactNode } from "react";

export default function PolicyShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        {eyebrow ?? "Prosperax"}
      </p>
      <h1 className="font-display mt-2 text-4xl font-semibold text-ink">{title}</h1>
      <div className="prose-policy mt-8 space-y-4 text-ink-muted">{children}</div>
      <p className="mt-12 text-sm">
        <Link href="/" className="text-brand hover:underline">
          ← Back home
        </Link>
      </p>
    </article>
  );
}
