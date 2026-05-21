"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  ChevronRight,
  Home,
} from "lucide-react";

import { buildBreadcrumbs } from "@/lib/navigation/breadcrumbs";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AnalyticsPageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
};

export function AnalyticsPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: AnalyticsPageHeaderProps) {
  const router = useRouter();

  const pathname = usePathname() ?? "";

  const searchParams = useSearchParams();

  const queryString = searchParams?.toString() ?? "";

  const resolvedBreadcrumbs =
    breadcrumbs ?? buildBreadcrumbs(pathname);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  function withSearchParams(href: string) {
    if (!queryString) return href;

    return `${href}?${queryString}`;
  }

  return (
    <div className="sticky top-0 z-30 -mx-6 mb-6 border-b border-slate-200 bg-slate-50/95 px-6 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Link>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {resolvedBreadcrumbs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {resolvedBreadcrumbs.map((item, index) => {
              const isLast =
                index === resolvedBreadcrumbs.length - 1;

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center gap-2"
                >
                  {item.href && !isLast ? (
                    <Link
                      href={withSearchParams(item.href)}
                      className="transition hover:text-slate-900"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                  )}

                  {!isLast && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-sm text-slate-600">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}