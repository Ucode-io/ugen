"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/shared/ui";
import { SUPER_ADMIN_USER_ID } from "@/shared/config";
import { cn } from "@/shared/lib/utils/cn";
import { useAuthStore } from "@/entities/session";
import {
  fetchTemplates,
  getTemplateCurrencyId,
  getTemplateImage,
  getTemplatePrice,
  getTemplateTitle,
  updateTemplatePrice,
  type Template,
} from "@/widgets/templates-board/model/templates";

const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "";

const CURRENCIES = [
  { value: "0803582e-29d6-42fe-86ac-b4287b8fa929", label: "UZS" },
  { value: "88c816a3-24e8-4994-ab70-9bc826bb9dc3", label: "USD" },
] as const;

// Server defaults an empty currency to UZS, so mirror that in the form.
const DEFAULT_CURRENCY_ID = "0803582e-29d6-42fe-86ac-b4287b8fa929";

const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat("en-US").format(Number(value ?? 0));

const stripNumberSeparators = (value: string) => value.replace(/[,\s]/g, "");

const sanitizeDecimalInput = (value: string) => {
  const cleaned = stripNumberSeparators(value).replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return integerPart;
  return `${integerPart}.${decimalParts.join("").slice(0, 2)}`;
};

const formatDecimalInput = (value: string) => {
  const raw = sanitizeDecimalInput(value);
  if (!raw) return "";
  const [integerPart, decimalPart] = raw.split(".");
  const integer = integerPart ? Number(integerPart) : 0;
  const formattedInteger = Number.isFinite(integer)
    ? new Intl.NumberFormat("en-US").format(integer)
    : integerPart;
  if (raw.endsWith(".")) return `${formattedInteger}.`;
  if (decimalPart != null) return `${formattedInteger}.${decimalPart}`;
  return formattedInteger;
};

const parseNumberInput = (value: string) => Number(stripNumberSeparators(value));

const getCurrencyLabel = (currencyId: string) =>
  CURRENCIES.find((currency) => currency.value === currencyId)?.label ?? "";

const buildImageUrl = (raw: string) => {
  if (!raw) return "";
  const full = raw.includes("https") ? raw : `${cdnBase}/${raw}`;
  try {
    return encodeURI(decodeURI(full));
  } catch {
    return full;
  }
};

const getErrorMessage = (err: any, fallback: string) => {
  const payload = err?.response?.data;
  const data = payload?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof payload?.description === "string" && payload.description.trim()) {
    return payload.description;
  }
  if (typeof payload?.custom_message === "string" && payload.custom_message.trim()) {
    return payload.custom_message;
  }
  return fallback;
};

type PriceForm = {
  price: string;
  currency_id: string;
};

export const TemplatePricingAdminPage = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.id === SUPER_ADMIN_USER_ID;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<PriceForm>({
    price: "",
    currency_id: DEFAULT_CURRENCY_ID,
  });
  const [error, setError] = useState<string | null>(null);

  const {
    data: templates = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["ugen-templates", "pricing-admin"],
    queryFn: fetchTemplates,
    enabled: isSuperAdmin,
    refetchOnWindowFocus: false,
  });

  const updatePrice = useMutation({
    mutationFn: (payload: {
      id: string;
      price: number;
      currency_id?: string;
    }) =>
      updateTemplatePrice(payload.id, {
        price: payload.price,
        currency_id: payload.currency_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ugen-templates"] });
    },
  });

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      [getTemplateTitle(template), template.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [templates, search]);

  const paidCount = templates.filter((t) => getTemplatePrice(t) > 0).length;
  const freeCount = templates.length - paidCount;

  const openEdit = (template: Template) => {
    setEditing(template);
    const price = getTemplatePrice(template);
    setForm({
      price: price ? String(price) : "",
      currency_id: getTemplateCurrencyId(template) || DEFAULT_CURRENCY_ID,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const price = parseNumberInput(form.price || "0");
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be zero or greater");
      return;
    }
    try {
      await updatePrice.mutateAsync({
        id: editing.id,
        price,
        currency_id: form.currency_id || undefined,
      });
      toast.success(price > 0 ? "Template price updated" : "Template is now free");
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update template price"));
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-bg-card flex h-full w-full items-center justify-center rounded-2xl p-6 shadow-sm">
        <div className="max-w-sm text-center">
          <div className="bg-red-500/10 text-red-600 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-text-main text-lg font-semibold">
            Super admin access required
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Template pricing is only available for super admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card flex h-full w-full flex-col rounded-2xl p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Tag size={17} />
          </div>
          <div>
            <h1 className="text-text-main text-2xl font-semibold">
              Template pricing
            </h1>
            <p className="text-text-muted mt-0.5 text-sm">
              Set what users pay to create a project from a template. 0 = free.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="border-border-subtle text-text-main hover:bg-hover-bg inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors"
        >
          <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryTile label="Total templates" value={templates.length} />
        <SummaryTile label="Paid" value={paidCount} tone="paid" />
        <SummaryTile label="Free" value={freeCount} tone="free" />
      </div>

      <div className="mb-4">
        <div className="border-border-subtle bg-bg-main focus-within:border-primary/50 focus-within:ring-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all focus-within:ring-4">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates..."
            className="text-text-main placeholder:text-text-muted/60 w-full bg-transparent outline-none"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading ? (
          <div className="border-border-subtle rounded-xl border p-4">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-11 w-full" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="border-border-subtle flex h-64 flex-col items-center justify-center rounded-xl border text-center">
            <AlertTriangle size={28} className="text-text-muted/50" />
            <p className="text-text-main mt-3 text-sm font-semibold">
              Failed to load templates
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-primary mt-1 text-sm font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="border-border-subtle flex h-64 flex-col items-center justify-center rounded-xl border text-center">
            <Tag size={30} className="text-text-muted/40" />
            <p className="text-text-muted mt-2 text-sm">No templates found</p>
          </div>
        ) : (
          <div className="border-border-subtle flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[720px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-border-subtle bg-bg-sidebar border-b">
                    <TableHead>Template</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <th className="w-px px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => {
                    const title = getTemplateTitle(template);
                    const price = getTemplatePrice(template);
                    const currencyLabel = getCurrencyLabel(
                      getTemplateCurrencyId(template),
                    );
                    const image = buildImageUrl(getTemplateImage(template));
                    const isPaid = price > 0;
                    return (
                      <tr
                        key={template.id}
                        className="border-border-subtle hover:bg-bg-sidebar border-b transition-colors last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-bg-sidebar border-border-subtle h-10 w-16 shrink-0 overflow-hidden rounded-md border">
                              {image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-text-main max-w-[280px] truncate text-[13px] font-semibold">
                                {title}
                              </p>
                              <p className="text-text-muted max-w-[280px] truncate text-[11px]">
                                {template.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-text-main text-[13px] font-medium tabular-nums">
                            {isPaid ? formatNumber(price) : "—"}
                          </div>
                          {isPaid && (
                            <div className="text-text-muted text-[11px]">
                              {currencyLabel || "UZS"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              isPaid
                                ? "bg-green-500/10 text-green-600"
                                : "bg-text-muted/10 text-text-muted",
                            )}
                          >
                            {isPaid ? "Paid" : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openEdit(template)}
                              className="border-border-subtle text-text-main hover:bg-hover-bg inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium whitespace-nowrap transition-colors"
                            >
                              <Tag size={13} />
                              Set price
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set template price</DialogTitle>
            <DialogDescription>
              {editing ? getTemplateTitle(editing) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="block">
              <span className="text-text-muted mb-1.5 block text-[12px] font-semibold">
                Price
              </span>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={formatDecimalInput(form.price)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      price: sanitizeDecimalInput(event.target.value),
                    }))
                  }
                  placeholder="50,000"
                  className="pr-24 font-mono tabular-nums"
                />
                <Select
                  value={form.currency_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, currency_id: value }))
                  }
                >
                  <SelectTrigger className="bg-bg-sidebar/70 hover:bg-bg-sidebar border-border-subtle focus:ring-primary absolute top-1/2 right-1 h-7 w-[82px] -translate-y-1/2 rounded-md px-2 py-0 text-[11px] font-bold tracking-wider uppercase shadow-none ring-offset-0 transition-colors focus:ring-1 [&>div]:gap-1 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    <SelectValue placeholder="CUR" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-text-muted mt-1.5 text-[11px]">
                Set 0 to make this template free again.
              </p>
              {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={updatePrice.isPending}
            >
              Cancel
            </Button>
            <Button loading={updatePrice.isPending} onClick={handleSave}>
              Save price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryTile = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "paid" | "free";
}) => (
  <div className="border-border-subtle bg-bg-sidebar/40 rounded-xl border p-4">
    <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
      {label}
    </p>
    <p
      className={cn(
        "mt-2 text-2xl font-semibold tabular-nums",
        tone === "paid" && "text-green-600",
        tone === "free" && "text-text-muted",
        tone === "default" && "text-text-main",
      )}
    >
      {value}
    </p>
  </div>
);

const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th className="text-text-muted px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
    {children}
  </th>
);
