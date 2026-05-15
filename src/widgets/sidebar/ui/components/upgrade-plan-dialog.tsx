"use client";

import { Fragment, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";

type TableRow = {
  label: string;
  free: string;
  starter: string;
  pro: string;
  ent: string;
  cls?: string;
};
const TABLE_SECTIONS: { heading: string; rows: TableRow[] }[] = [
  {
    heading: "Pricing (per user / month)",
    rows: [
      {
        label: "Annual",
        free: "$0",
        starter: "$48",
        pro: "$74",
        ent: "Custom",
        cls: "custom",
      },
      {
        label: "6 months",
        free: "$0",
        starter: "$55",
        pro: "$85",
        ent: "Custom",
        cls: "custom",
      },
      {
        label: "Monthly",
        free: "$0",
        starter: "$63",
        pro: "$98",
        ent: "Custom",
        cls: "custom",
      },
    ],
  },
  {
    heading: "Workspace",
    rows: [
      { label: "Builders", free: "1", starter: "2", pro: "5", ent: "Custom" },
      { label: "Projects", free: "1", starter: "5", pro: "10", ent: "Custom" },
      {
        label: "Users",
        free: "—",
        starter: "1,000",
        pro: "10,000",
        ent: "Custom",
      },
      {
        label: "Credit limit / month",
        free: "50K",
        starter: "500K",
        pro: "1M",
        ent: "Custom",
      },
    ],
  },
  {
    heading: "API",
    rows: [
      {
        label: "Requests / month",
        free: "100K",
        starter: "250K",
        pro: "500K",
        ent: "Custom",
      },
      {
        label: "Requests / second",
        free: "100",
        starter: "200",
        pro: "500",
        ent: "Custom",
      },
    ],
  },
  {
    heading: "Infrastructure",
    rows: [
      {
        label: "Server Functions",
        free: "1",
        starter: "10",
        pro: "20",
        ent: "Custom",
      },
      {
        label: "Microfrontends",
        free: "1",
        starter: "5",
        pro: "10",
        ent: "Custom",
      },
      {
        label: "Database size",
        free: "10 GB",
        starter: "50 GB",
        pro: "100 GB",
        ent: "Custom",
      },
      {
        label: "File storage",
        free: "10 GB",
        starter: "50 GB",
        pro: "100 GB",
        ent: "Custom",
      },
    ],
  },
];

const PERIODS = [
  { key: "year", label: "Annual", save: "Save 24%" },
  { key: "6month", label: "6 months", save: "Save 13%" },
  { key: "month", label: "Monthly", save: null },
] as const;
type Period = (typeof PERIODS)[number]["key"];

const PRICES: Record<Period, { starter: string; pro: string; per: string }> = {
  year: { starter: "$48", pro: "$74", per: "per user · billed annually" },
  "6month": {
    starter: "$55",
    pro: "$85",
    per: "per user · billed every 6 months",
  },
  month: { starter: "$63", pro: "$98", per: "per user · billed monthly" },
};

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: () => "$0",
    per: "per user · forever free",
    desc: "Perfect for individuals exploring the platform.",
    features: ["1 Builder", "50K credit limit / month", "1 Project"],
    cta: "Current plan",
    featured: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: (p: Period) => PRICES[p].starter,
    per: (p: Period) => PRICES[p].per,
    desc: "For small teams building and shipping real products.",
    features: ["2 Builders", "500K credit limit / month", "5 Projects"],
    cta: "Upgrade to Starter",
    featured: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: (p: Period) => PRICES[p].pro,
    per: (p: Period) => PRICES[p].per,
    desc: "For growing teams with advanced scale and custom requirements.",
    features: ["5 Builders", "1M credit limit / month", "10 Projects"],
    cta: "Upgrade to Pro",
    featured: true,
    badge: "Most popular",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: () => "Custom",
    per: "tailored to your needs",
    desc: "Custom scale, security, and compliance.",
    features: ["Custom Builders", "Custom credit limit", "Custom Projects"],
    cta: "Contact sales →",
    href: "mailto:enterprise@u-code.io",
    featured: false,
  },
];

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradePlanDialog = ({
  open,
  onOpenChange,
}: UpgradePlanDialogProps) => {
  const [period, setPeriod] = useState<Period>("year");
  const [compareOpen, setCompareOpen] = useState(false);

  const getPrice = (plan: (typeof PLANS)[number]) =>
    (plan.price as (p?: Period) => string)(period);
  const getPer = (plan: (typeof PLANS)[number]) =>
    typeof plan.per === "string"
      ? plan.per
      : (plan.per as (p: Period) => string)(period);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(96vw,1100px)] max-w-none gap-0 overflow-y-auto rounded-2xl p-0">
        <div className="border-border-subtle border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-text-main flex items-center gap-2 text-[1.05rem]">
              <Sparkles size={18} className="text-primary" />
              Upgrade your plan
            </DialogTitle>
            <DialogDescription className="text-text-muted text-[12px]">
              Choose the plan that fits your team. Per-user pricing — pay only
              for what you use.
            </DialogDescription>
          </DialogHeader>

          {/* Billing toggle */}
          <div className="mt-4 flex justify-center">
            <div className="bg-hover-bg border-border-subtle inline-flex gap-0.5 rounded-[10px] border p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-4 py-1.5 text-[0.8rem] font-medium whitespace-nowrap transition-all",
                    period === p.key
                      ? "bg-bg-card text-text-main font-semibold shadow-sm"
                      : "text-text-muted hover:text-text-main bg-transparent",
                  )}
                >
                  {p.label}
                  {p.save && (
                    <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.02em] text-white">
                      {p.save}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                "bg-bg-main relative rounded-[10px] border p-6 transition-all hover:shadow-md",
                plan.featured
                  ? "border-primary shadow-md"
                  : "border-border-subtle hover:border-border-subtle/60",
              )}
            >
              {plan.featured && plan.badge && (
                <div className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[0.62rem] font-bold tracking-[0.07em] text-white uppercase whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <div className="text-text-muted mb-[7px] text-[0.74rem] font-semibold tracking-[0.06em] uppercase">
                {plan.name}
              </div>
              <div
                className="text-text-main mb-1 font-black tracking-[-0.05em]"
                style={{
                  fontSize: plan.key === "enterprise" ? "1.6rem" : "2.2rem",
                  lineHeight: 1,
                }}
              >
                {getPrice(plan)}
                {plan.key !== "enterprise" && (
                  <span className="text-text-muted text-[0.85rem] font-normal">
                    /mo
                  </span>
                )}
              </div>
              <p className="text-text-muted mb-1 text-[0.68rem]">
                {getPer(plan)}
              </p>
              <p className="text-text-muted mt-3 mb-4 text-[0.78rem] leading-[1.55]">
                {plan.desc}
              </p>
              <hr className="border-border-subtle mb-4 border-t" />
              <ul className="mb-5 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-text-muted flex items-start gap-2 text-[0.8rem]"
                  >
                    <Check
                      size={13}
                      className="mt-0.5 flex-shrink-0 text-green-500"
                      strokeWidth={3}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.href ? (
                <a
                  href={plan.href}
                  className={cn(
                    "block w-full rounded-lg border py-2 text-center text-[0.82rem] font-semibold no-underline transition-all",
                    plan.featured
                      ? "bg-primary border-primary text-white hover:opacity-85"
                      : "bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main",
                  )}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={plan.key === "free"}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border py-2 text-[0.82rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                    plan.featured
                      ? "bg-primary border-primary text-white hover:opacity-85"
                      : "bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main",
                  )}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Compare plans (collapsible) */}
        <div className="border-border-subtle border-t px-6 pb-6">
          <button
            type="button"
            onClick={() => setCompareOpen((v) => !v)}
            className="text-text-muted hover:text-text-main flex w-full items-center justify-between py-4 text-left text-[0.9rem] font-semibold transition-colors"
            aria-expanded={compareOpen}
          >
            <span>
              Compare{" "}
              <em className="from-primary to-accent not-italic bg-linear-to-r bg-clip-text text-transparent">
                plans
              </em>
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "transition-transform duration-200",
                compareOpen && "rotate-180",
              )}
            />
          </button>

          {compareOpen && (
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-[0.82rem]"
                style={{ minWidth: "600px" }}
              >
                <thead>
                  <tr className="border-border-subtle border-b-2">
                    <th className="text-text-muted px-3 py-2.5 text-left text-[0.8rem] font-semibold">
                      Feature
                    </th>
                    {["Free", "Starter", "Pro", "Enterprise", "Overlimit"].map(
                      (h) => (
                        <th
                          key={h}
                          className={cn(
                            "text-text-main px-3 py-2.5 font-bold",
                            h === "Pro" && "text-primary",
                          )}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_SECTIONS.map((sec) => (
                    <Fragment key={sec.heading}>
                      <tr className="bg-hover-bg">
                        <td
                          colSpan={6}
                          className="text-text-muted/70 px-3 py-1.5 text-[0.68rem] font-bold tracking-[0.07em] uppercase"
                        >
                          {sec.heading}
                        </td>
                      </tr>
                      {sec.rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-border-subtle/50 border-b"
                        >
                          <td className="text-text-muted px-3 py-2.5">
                            {row.label}
                          </td>
                          <td className="text-text-muted px-3 py-2.5 text-center">
                            {row.free}
                          </td>
                          <td className="text-text-muted px-3 py-2.5 text-center">
                            {row.starter}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-center font-bold",
                              row.cls === "custom"
                                ? "text-primary"
                                : "text-text-main",
                            )}
                          >
                            {row.pro}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-center",
                              row.cls === "custom"
                                ? "text-primary font-semibold"
                                : "text-text-muted",
                            )}
                          >
                            {row.ent}
                          </td>
                          <td className="text-text-muted/60 px-3 py-2.5 text-center text-[0.74rem] italic">
                            —
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
