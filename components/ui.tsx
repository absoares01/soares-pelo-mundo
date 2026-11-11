import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { Tone } from "@/lib/labels";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export const inputCls =
  "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-950 shadow-sm outline-none transition placeholder:text-navy-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-400/30 disabled:bg-navy-50 disabled:opacity-70";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 sm:p-5", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-navy-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-navy-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-navy-500">{hint}</span>}
    </label>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

const variants: Record<Variant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 disabled:bg-navy-900/50",
  accent: "bg-sky-500 text-white hover:bg-sky-600 disabled:bg-sky-500/50",
  secondary: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
};
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={cx(base, variants[variant], className)} />;
}

export function LinkButton({
  variant = "primary",
  className,
  href,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { variant?: Variant; href: string }) {
  return (
    <Link href={href} {...props} className={cx(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-100 text-sky-800",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  navy: "bg-navy-100 text-navy-800",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={cx("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Notice({
  tone = "sky",
  children,
  className,
}: {
  tone?: "sky" | "amber" | "red" | "green";
  children: ReactNode;
  className?: string;
}) {
  const t = {
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    red: "border-red-300 bg-red-50 text-red-900",
    green: "border-emerald-300 bg-emerald-50 text-emerald-900",
  };
  return <div className={cx("rounded-lg border px-3 py-2 text-sm", t[tone], className)}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white/70 px-6 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold text-navy-900">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-navy-600">{text}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-navy-600" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      {label ?? "Carregando…"}
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={light ? "#ffffff" : "#0f1f3d"} />
        <path d="M7 21c4-1 6-6 9-9s6-3 9-3c0 3 0 6-3 9s-8 5-9 9c-2-3-4-5-6-6z" fill="#38bdf8" />
        <path d="M9 23l14-14" stroke={light ? "#0f1f3d" : "#ffffff"} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={cx("font-display text-xl font-semibold tracking-tight", light ? "text-white" : "text-navy-900")}>
        Trip<span className="text-sky-500">Flow</span>
      </span>
    </span>
  );
}
