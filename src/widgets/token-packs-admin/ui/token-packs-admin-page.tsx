"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Edit2,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
  Switch,
} from "@/shared/ui";
import { SUPER_ADMIN_USER_ID } from "@/shared/config";
import { cn } from "@/shared/lib/utils/cn";
import { useAuthStore } from "@/entities/session";
import {
  useAdminTokenPacks,
  useCreateTokenPack,
  useDeleteTokenPack,
  useUpdateTokenPack,
  type TokenPack,
  type TokenPackWritePayload,
} from "@/entities/billing";

type ProductType = "ugen" | "ucode";

type TokenPackForm = {
  id?: string;
  name: string;
  token_amount: string;
  price: string;
  currency_id: string;
  product_type: ProductType;
  is_active: boolean;
};

type FormErrors = Partial<Record<keyof TokenPackForm, string>>;

const CURRENCIES = [
  {
    value: "88c816a3-24e8-4994-ab70-9bc826bb9dc3",
    label: "USD",
  },
  {
    value: "0803582e-29d6-42fe-86ac-b4287b8fa929",
    label: "UZS",
  },
] as const;

const DEFAULT_CURRENCY_ID = "0803582e-29d6-42fe-86ac-b4287b8fa929";

const emptyForm = (productType: ProductType): TokenPackForm => ({
  name: "",
  token_amount: "",
  price: "",
  currency_id: DEFAULT_CURRENCY_ID,
  product_type: productType,
  is_active: false,
});

const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat("en-US").format(Number(value ?? 0));

const stripNumberSeparators = (value: string) => value.replace(/[,\s]/g, "");

const sanitizeIntegerInput = (value: string) =>
  stripNumberSeparators(value).replace(/\D/g, "");

const sanitizeDecimalInput = (value: string) => {
  const cleaned = stripNumberSeparators(value).replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return integerPart;
  return `${integerPart}.${decimalParts.join("").slice(0, 2)}`;
};

const parseNumberInput = (value: string) => Number(stripNumberSeparators(value));

const formatIntegerInput = (value: string) => {
  const raw = sanitizeIntegerInput(value);
  if (!raw) return "";
  const number = Number(raw);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : raw;
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

const getCurrencyLabel = (currencyId: string) =>
  CURRENCIES.find((currency) => currency.value === currencyId)?.label ?? "";

const formatPrice = (pack: TokenPack) => {
  const currency =
    pack.currency?.symbol ||
    pack.currency?.code ||
    getCurrencyLabel(pack.currency_id ?? "");
  return `${formatNumber(pack.price)}${currency ? ` ${currency}` : ""}`;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

const normalizeProductType = (value?: string): ProductType =>
  value === "ucode" ? "ucode" : "ugen";

const formFromPack = (pack: TokenPack): TokenPackForm => ({
  id: pack.id,
  name: pack.name ?? "",
  token_amount: String(pack.token_amount ?? ""),
  price: String(pack.price ?? ""),
  currency_id: pack.currency_id ?? pack.currency?.id ?? "",
  product_type: normalizeProductType(pack.product_type),
  is_active: Boolean(pack.is_active),
});

const packToPayload = (
  pack: TokenPack,
  override: Partial<TokenPackWritePayload> = {},
): TokenPackWritePayload & { id: string } => ({
  id: pack.id,
  name: pack.name ?? "",
  token_amount: Number(pack.token_amount ?? 0),
  price: Number(pack.price ?? 0),
  currency_id: pack.currency_id ?? pack.currency?.id ?? "",
  product_type: normalizeProductType(pack.product_type),
  is_active: Boolean(pack.is_active),
  ...override,
});

const validateForm = (form: TokenPackForm): FormErrors => {
  const errors: FormErrors = {};
  const tokenAmount = parseNumberInput(form.token_amount);
  const price = parseNumberInput(form.price);

  if (!form.name.trim()) errors.name = "Name is required";
  if (!Number.isInteger(tokenAmount) || tokenAmount <= 0) {
    errors.token_amount = "Token amount must be a positive integer";
  }
  if (!Number.isFinite(price) || price < 0) {
    errors.price = "Price must be zero or greater";
  }
  if (!form.currency_id.trim()) {
    errors.currency_id = "Currency ID is required";
  }

  return errors;
};

const toWritePayload = (form: TokenPackForm): TokenPackWritePayload => ({
  ...(form.id ? { id: form.id } : {}),
  name: form.name.trim(),
  token_amount: parseNumberInput(form.token_amount),
  price: parseNumberInput(form.price),
  currency_id: form.currency_id.trim(),
  product_type: form.product_type,
  is_active: form.is_active,
});

export const TokenPacksAdminPage = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.id === SUPER_ADMIN_USER_ID;

  const [productType, setProductType] = useState<ProductType>("ugen");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<TokenPack | null>(null);
  const [form, setForm] = useState<TokenPackForm>(() => emptyForm("ugen"));
  const [errors, setErrors] = useState<FormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<TokenPack | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useAdminTokenPacks(productType, isSuperAdmin);
  const packs = useMemo(() => data?.packs ?? [], [data?.packs]);

  const createPack = useCreateTokenPack();
  const updatePack = useUpdateTokenPack();
  const deletePack = useDeleteTokenPack();

  const filteredPacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter((pack) =>
      [
        pack.name,
        pack.product_type,
        pack.currency?.code,
        pack.currency?.symbol,
        pack.currency_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [packs, search]);

  const activeCount = packs.filter((pack) => pack.is_active).length;
  const hiddenCount = packs.length - activeCount;

  const openCreate = () => {
    setEditingPack(null);
    setForm(emptyForm(productType));
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (pack: TokenPack) => {
    setEditingPack(pack);
    setForm(formFromPack(pack));
    setErrors({});
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen || editingPack) return;
    setForm((prev) => ({ ...prev, product_type: productType }));
  }, [dialogOpen, editingPack, productType]);

  const handleSave = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = toWritePayload(form);
    try {
      if (editingPack) {
        await updatePack.mutateAsync({
          ...payload,
          id: editingPack.id,
        });
        toast.success("Token pack updated");
      } else {
        await createPack.mutateAsync(payload);
        toast.success("Token pack created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save token pack"));
    }
  };

  const handleToggleActive = async (pack: TokenPack, checked: boolean) => {
    setTogglingId(pack.id);
    try {
      await updatePack.mutateAsync(packToPayload(pack, { is_active: checked }));
      toast.success(checked ? "Token pack activated" : "Token pack hidden");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update token pack"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePack.mutateAsync(deleteTarget.id);
      toast.success("Token pack deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete token pack"));
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
            Token pack catalog management is only available for super admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card flex h-full w-full flex-col rounded-2xl p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Package size={17} />
            </div>
            <div>
              <h1 className="text-text-main text-2xl font-semibold">
                Token packs
              </h1>
              <p className="text-text-muted mt-0.5 text-sm">
                Manage extra AI-token packages shown in the user billing store.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={productType}
            onValueChange={(value) => setProductType(value as ProductType)}
          >
            <SelectTrigger className="h-9 w-[132px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ugen">ugen</SelectItem>
              <SelectItem value="ucode">ucode</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => refetch()}
            className="border-border-subtle text-text-main hover:bg-hover-bg inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors"
          >
            <RefreshCw
              size={14}
              className={cn(isFetching && "animate-spin")}
            />
            Refresh
          </button>
          <Button
            onClick={openCreate}
            className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white"
          >
            <Plus size={15} />
            Create pack
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryTile label="Total packs" value={packs.length} />
        <SummaryTile label="Active" value={activeCount} tone="active" />
        <SummaryTile label="Hidden" value={hiddenCount} tone="hidden" />
      </div>

      <div className="mb-4">
        <div className="border-border-subtle bg-bg-main focus-within:border-primary/50 focus-within:ring-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all focus-within:ring-4">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search packs..."
            className="text-text-main w-full bg-transparent outline-none placeholder:text-text-muted/60"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading ? (
          <TokenPackTableSkeleton />
        ) : isError ? (
          <div className="border-border-subtle flex h-64 flex-col items-center justify-center rounded-xl border text-center">
            <AlertTriangle size={28} className="text-text-muted/50" />
            <p className="text-text-main mt-3 text-sm font-semibold">
              Failed to load token packs
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-primary mt-1 text-sm font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredPacks.length === 0 ? (
          <div className="border-border-subtle flex h-64 flex-col items-center justify-center rounded-xl border text-center">
            <Package size={30} className="text-text-muted/40" />
            <p className="text-text-muted mt-2 text-sm">No token packs found</p>
          </div>
        ) : (
          <div className="border-border-subtle flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[880px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-border-subtle bg-bg-sidebar border-b">
                    <TableHead>Name</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <th className="w-px px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPacks.map((pack) => {
                    const isToggling = togglingId === pack.id;
                    return (
                      <tr
                        key={pack.id}
                        className={cn(
                          "border-border-subtle hover:bg-bg-sidebar group border-b transition-colors last:border-b-0",
                          !pack.is_active && "opacity-70",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-text-main max-w-[260px] truncate text-[13px] font-semibold">
                              {pack.name || "Untitled pack"}
                            </p>
                            <p className="text-text-muted max-w-[260px] truncate text-[11px]">
                              {pack.id}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-main text-[13px] font-medium tabular-nums">
                            {formatNumber(pack.token_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-text-main text-[13px] font-medium">
                            {formatPrice(pack)}
                          </div>
                          <div className="text-text-muted text-[11px]">
                            {pack.currency?.code || pack.currency_id || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="border-border-subtle text-text-muted rounded-md border px-2 py-0.5 text-[11px] font-semibold">
                            {pack.product_type || "ugen"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              size="sm"
                              checked={Boolean(pack.is_active)}
                              disabled={isToggling || updatePack.isPending}
                              onCheckedChange={(checked) =>
                                void handleToggleActive(pack, checked)
                              }
                            />
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                pack.is_active
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-text-muted/10 text-text-muted",
                              )}
                            >
                              {pack.is_active ? "Active" : "Hidden"}
                            </span>
                            {isToggling && (
                              <Loader2
                                size={12}
                                className="text-text-muted animate-spin"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-muted text-[12px]">
                            {formatDate(pack.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(pack)}
                              className="border-border-subtle text-text-main hover:bg-hover-bg inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                              title="Edit token pack"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(pack)}
                              className="border-border-subtle text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                              title="Delete token pack"
                            >
                              <Trash2 size={13} />
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

      <TokenPackFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        errors={errors}
        isEdit={Boolean(editingPack)}
        isSaving={createPack.isPending || updatePack.isPending}
        onSave={handleSave}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete token pack</DialogTitle>
            <DialogDescription>
              Delete this package from the catalog? Purchased company token
              balances will stay untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="border-border-subtle bg-bg-sidebar/50 rounded-lg border p-3">
            <p className="text-text-main text-sm font-semibold">
              {deleteTarget?.name || "Untitled pack"}
            </p>
            <p className="text-text-muted mt-1 text-xs">
              {formatNumber(deleteTarget?.token_amount)} tokens
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deletePack.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deletePack.isPending}
              onClick={handleDelete}
            >
              Delete
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
  tone?: "default" | "active" | "hidden";
}) => (
  <div className="border-border-subtle bg-bg-sidebar/40 rounded-xl border p-4">
    <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
      {label}
    </p>
    <p
      className={cn(
        "mt-2 text-2xl font-semibold tabular-nums",
        tone === "active" && "text-green-600",
        tone === "hidden" && "text-text-muted",
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

const TokenPackTableSkeleton = () => (
  <div className="border-border-subtle rounded-xl border p-4">
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-11 w-full" />
      ))}
    </div>
  </div>
);

const TokenPackFormDialog = ({
  open,
  onOpenChange,
  form,
  setForm,
  errors,
  isEdit,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TokenPackForm;
  setForm: React.Dispatch<React.SetStateAction<TokenPackForm>>;
  errors: FormErrors;
  isEdit: boolean;
  isSaving: boolean;
  onSave: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit token pack" : "Create token pack"}</DialogTitle>
        <DialogDescription>
          Updates are sent as full replacements. Keep every field populated.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-1">
        <FormField label="Name" error={errors.name}>
          <Input
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="1M tokens"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Token amount" error={errors.token_amount}>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formatIntegerInput(form.token_amount)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    token_amount: sanitizeIntegerInput(event.target.value),
                  }))
                }
                placeholder="1,000,000"
                className="pr-16 font-mono tabular-nums"
              />
              <span className="text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold tracking-wider uppercase">
                tokens
              </span>
            </div>
          </FormField>
          <FormField label="Price" error={errors.price || errors.currency_id}>
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
                  setForm((prev) => ({
                    ...prev,
                    currency_id: value,
                  }))
                }
              >
                <SelectTrigger className="bg-bg-sidebar/70 hover:bg-bg-sidebar border-border-subtle absolute top-1/2 right-1 h-7 w-[82px] -translate-y-1/2 rounded-md px-2 py-0 text-[11px] font-bold tracking-wider uppercase shadow-none ring-offset-0 transition-colors focus:ring-1 focus:ring-primary [&>div]:gap-1 [&>svg]:h-3.5 [&>svg]:w-3.5">
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
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product type">
            <Select
              value={form.product_type}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  product_type: value as ProductType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ugen">ugen</SelectItem>
                <SelectItem value="ucode">ucode</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Visibility">
            <div className="grid grid-cols-2 gap-2">
              <VisibilityOption
                active={form.is_active}
                title="Active"
                onClick={() =>
                  setForm((prev) => ({ ...prev, is_active: true }))
                }
              />
              <VisibilityOption
                active={!form.is_active}
                title="Hidden"
                onClick={() =>
                  setForm((prev) => ({ ...prev, is_active: false }))
                }
              />
            </div>
          </FormField>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
          Cancel
        </Button>
        <Button loading={isSaving} onClick={onSave}>
          {isEdit ? "Save changes" : "Create pack"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const VisibilityOption = ({
  active,
  title,
  onClick,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "border-border-subtle bg-bg-sidebar/40 flex h-10 items-center justify-between rounded-lg border px-3 text-left transition-colors",
      active && "border-primary/40 bg-primary/10 ring-primary/20 ring-1",
    )}
    aria-pressed={active}
  >
    <span
      className={cn(
        "text-[13px] font-semibold",
        active ? "text-primary" : "text-text-main",
      )}
    >
      {title}
    </span>
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full border",
        active
          ? "border-primary bg-primary"
          : "border-border-subtle bg-bg-card",
      )}
    />
  </button>
);

const FormField = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="block">
    <span className="text-text-muted mb-1.5 block text-[12px] font-semibold">
      {label}
    </span>
    {children}
    {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
  </div>
);
