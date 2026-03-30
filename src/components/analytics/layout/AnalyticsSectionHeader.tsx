import Link from "next/link";

type AnalyticsSectionHeaderProps = {
  title: string;
  href?: string;
};

export function AnalyticsSectionHeader({
  title,
  href,
}: AnalyticsSectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-lg font-medium">{title}</h2>

      {href ? (
        <Link
          href={href}
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Ver detalle
        </Link>
      ) : null}
    </div>
  );
}