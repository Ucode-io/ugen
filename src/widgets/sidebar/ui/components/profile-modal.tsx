"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { api, authApi } from "@/shared/api";
import { useAuthStore } from "@/entities/session";
import {
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  ReusableTabs,
} from "@/shared/ui";
import {
  Camera,
  Trash2,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  Save,
  User,
  Mail,
  Phone,
  AtSign,
  ShieldCheck,
  BriefcaseBusiness,
  Activity,
  CreditCard,
  UserCog,
  LogOut,
  BarChart2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BillingTab } from "./billing-tab";
import { UsageLimitsTab } from "@/widgets/analytics/ui/usage-limits";
import { ProjectStatisticsTab } from "@/widgets/analytics/ui/project-statistics";

interface ProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabId = "profile" | "billing" | "analytics";

export const ProfileModal = ({ isOpen, onOpenChange }: ProfileModalProps) => {
  const tWidgets = useTranslations("widgets.appSettings");
  const tCommon = useTranslations("widgets.common");

  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const project = useAuthStore((s) => s.project);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const projectId = project?.project_id ?? "";
  const companyId = user?.company_id ?? "";
  const userId = user?.id ?? "";
  const environmentId = user?.environment_id ?? "";

  const bearerHeaders = { Authorization: `Bearer ${accessToken}` };

  const queryClient = useQueryClient();
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "";

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState({
    name:
      typeof (user as any)?.name === "string"
        ? (user as any).name
        : typeof user?.login === "string"
          ? user.login
          : "",
    email: typeof user?.email === "string" ? user.email : "",
    phone: typeof (user as any)?.phone === "string" ? (user as any).phone : "",
    login: typeof user?.login === "string" ? user.login : "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFilename, setAvatarFilename] = useState<string | null>(
    typeof (user as any)?.photo === "string" ? (user as any).photo : null,
  );
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name:
          typeof (user as any)?.name === "string"
            ? (user as any).name
            : typeof user?.login === "string"
              ? user.login
              : "",
        email: typeof user?.email === "string" ? user.email : "",
        phone:
          typeof (user as any)?.phone === "string" ? (user as any).phone : "",
        login: typeof user?.login === "string" ? user.login : "",
      });
      setAvatarFilename(
        typeof (user as any)?.photo === "string" ? (user as any).photo : null,
      );
      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarError(false);
    }
  }, [isOpen, user]);

  const uploadPhoto = async (
    file: File,
    projectId: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/v1/upload", formData, {
      params: { "project-id": projectId },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data.filename as string;
  };

  const updateUser = (projectId: string, payload: Record<string, any>) =>
    authApi.put("/v2/user", payload, {
      params: { "project-id": projectId },
      headers: bearerHeaders,
    });

  const fetchSessions = async (userId: string, projectId: string) => {
    const { data } = await authApi.get("/v2/session", {
      params: {
        user_id: userId,
        limit: 50,
        offset: 0,
        "project-id": projectId,
      },
      headers: bearerHeaders,
    });
    return data.data?.sessions ?? [];
  };

  const deleteSession = (sessionId: string, projectId: string) =>
    authApi.delete(`/v2/session/${sessionId}`, {
      params: { "project-id": projectId },
      headers: bearerHeaders,
    });

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["sessions", userId, projectId],
    queryFn: () => fetchSessions(userId, projectId),
    enabled: activeTab === "profile" && !!userId && !!projectId && isOpen,
  });

  const { mutate: saveMutation, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      let filename = avatarFilename;
      if (avatarFile) {
        filename = await uploadPhoto(avatarFile, projectId);
        setAvatarFilename(filename);
        setAvatarFile(null);
      }
      await updateUser(projectId, {
        id: userId,
        login: form.login,
        name: form.name,
        email: form.email,
        phone: form.phone,
        company_id: companyId,
        project_id: projectId,
        environment_id: environmentId,
        ...(filename ? { photo: filename } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(tWidgets("saveChanges"));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.description || "Failed to save profile");
    },
  });

  const userInitial = user?.login?.[0]?.toUpperCase() || "U";
  const userRole = typeof user?.role === "string" ? user.role : "Member";

  const handleLogout = () => {
    logout();
    queryClient.clear();
    onOpenChange(false);
    router.push("/");
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <UserCog size={14} /> },
    { id: "billing", label: "Billing", icon: <CreditCard size={14} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={14} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[82vh] max-h-[82vh] w-[calc(100vw-32px)] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:rounded-3xl">
        {/* Header */}
        <header className="border-border-subtle bg-bg-card flex items-center gap-3 border-b px-5 py-3.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group bg-primary/10 text-primary ring-bg-card relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-bold ring-2"
            title={tCommon("upload")}
          >
            {avatarPreview || avatarFilename ? (
              !avatarError ? (
                <img
                  src={avatarPreview ?? `${cdnBase}/${avatarFilename}`}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                userInitial
              )
            ) : (
              userInitial
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={14} className="text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setAvatarError(false);
              setAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
            }}
          />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-text-main truncate text-[15px] leading-tight font-semibold">
              {user?.login || "User"}
            </DialogTitle>
            <div className="text-text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="flex min-w-0 items-center gap-1">
                <Mail size={11} />
                <span className="truncate">
                  {user?.email || "No email provided"}
                </span>
              </span>
              <span className="bg-border-subtle hidden h-1 w-1 rounded-full sm:block" />
              <span className="text-text-muted capitalize">{userRole}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-text-muted hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive border-border-subtle bg-bg-card group mr-8 flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-semibold transition-colors"
          >
            <LogOut
              size={14}
              className="text-text-muted group-hover:text-destructive"
            />
            <span className="hidden sm:inline">{tCommon("logout")}</span>
          </button>
        </header>

        {/* Tabs */}
        <div className="border-border-subtle bg-bg-card flex border-b px-5 py-3">
          <ReusableTabs
            options={tabs}
            activeId={activeTab}
            onTabChange={(id) => setActiveTab(id as TabId)}
          />
        </div>

        {/* Content */}
        <div className="custom-scrollbar bg-bg-main/40 flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <PersonalInformationCard
                form={form}
                setForm={setForm}
                onSave={() => saveMutation()}
                isSaving={isSaving}
                userRole={userRole}
                t={tWidgets}
              />

              <SessionsCard
                sessions={sessions}
                loading={sessionsLoading}
                deletingId={deletingSessionId}
                onDelete={async (id) => {
                  setDeletingSessionId(id);
                  try {
                    await deleteSession(id, projectId);
                    await refetchSessions();
                  } finally {
                    setDeletingSessionId(null);
                  }
                }}
                t={tWidgets}
              />
            </div>
          )}

          {activeTab === "billing" && <BillingTab />}

          {activeTab === "analytics" && <AnalyticsTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------- Analytics Tab -------------------- */

const AnalyticsTab = () => {
  const apiKey = useAuthStore((state) => state.apiKey);
  const fareId = useAuthStore((state) => state.project?.fare_id);

  const { data: companyStats } = useQuery({
    queryKey: ["pricing-company-stats", apiKey],
    queryFn: async () => {
      const { data } = await api.get("/v1/pricing/company-stats");
      return data;
    },
    staleTime: 0,
  });

  const { data: fareData } = useQuery({
    queryKey: ["fares", "ugen"],
    queryFn: async () => {
      const { data } = await api.get("/v1/fare", {
        params: { product_type: "ugen" },
      });
      return data;
    },
  });

  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      <UsageLimitsTab
        companyStats={companyStats}
        fareData={fareData}
        fareId={fareId}
      />
      <ProjectStatisticsTab />
    </div>
  );
};

/* -------------------- Profile Tab Sections -------------------- */

const PersonalInformationCard = ({
  form,
  setForm,
  onSave,
  isSaving,
  userRole,
  t,
}: {
  form: { name: string; email: string; phone: string; login: string };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
      login: string;
    }>
  >;
  onSave: () => void;
  isSaving: boolean;
  userRole: string;
  t: ReturnType<typeof useTranslations>;
}) => (
  <Section
    icon={UserCog}
    title="Personal information"
    description="Profile details visible across your workspace."
    action={
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="from-primary to-primary/85 hover:to-primary/95 group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl bg-linear-to-br px-4 text-[12px] font-semibold text-white shadow-[0_4px_12px_-3px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all hover:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.18)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        <span className="bg-bg-card/15 flex h-5 w-5 items-center justify-center rounded-md">
          {isSaving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
        </span>
        {t("saveChanges")}
      </button>
    }
  >
    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
      <Field
        icon={User}
        label={t("fullName")}
        input={
          <Input
            placeholder={t("namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="h-9 text-[12px]"
          />
        }
      />
      <Field
        icon={Mail}
        label={t("emailAddress")}
        input={
          <Input
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="h-9 text-[12px]"
          />
        }
      />
      <Field
        icon={Phone}
        label={t("phoneNumber")}
        input={
          <Input
            type="tel"
            placeholder="+1 234 567 89 00"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="h-9 text-[12px]"
          />
        }
      />
      <Field
        icon={AtSign}
        label={t("loginUsername")}
        input={
          <Input
            placeholder="username"
            value={form.login}
            onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
            className="h-9 text-[12px]"
          />
        }
      />
      <Field
        icon={BriefcaseBusiness}
        label={t("accountType")}
        input={<ReadOnlyValue value={userRole} />}
      />
      <Field
        icon={ShieldCheck}
        label={t("assignedRole")}
        input={<ReadOnlyValue value={userRole} />}
      />
    </div>
  </Section>
);

const SessionsCard = ({
  sessions,
  loading,
  deletingId,
  onDelete,
  t,
}: {
  sessions: any[];
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) => (
  <Section
    icon={Activity}
    title={t("loginSessions")}
    description="Devices and browsers currently signed in."
    action={
      sessions.length > 0 ? (
        <span className="border-border-subtle text-text-muted rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          {sessions.length} active
        </span>
      ) : undefined
    }
  >
    {loading ? (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <Loader2 size={20} className="text-primary/60 animate-spin" />
        <p className="text-text-muted text-xs font-medium">
          {t("verifyingSessions")}
        </p>
      </div>
    ) : sessions.length === 0 ? (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <div className="border-border-subtle bg-bg-sidebar/60 mb-3 flex h-10 w-10 items-center justify-center rounded-xl border">
          <Shield size={16} className="text-text-muted/70" />
        </div>
        <p className="text-text-main text-[13px] font-semibold">
          {t("noSessions")}
        </p>
        <p className="text-text-muted mt-1 text-[11px]">
          New sign-ins will appear here after verification.
        </p>
      </div>
    ) : (
      <ul className="divide-border-subtle divide-y">
        {sessions.map((session: any) => {
          const isMobile = session.data?.toLowerCase().includes("mobile");
          return (
            <li
              key={session.id}
              className="hover:bg-hover-bg/40 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="border-border-subtle bg-bg-sidebar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                {isMobile ? (
                  <Smartphone size={14} className="text-text-muted" />
                ) : (
                  <Monitor size={14} className="text-text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-main truncate text-[12px] font-semibold">
                  {session.data || t("unknownDevice")}
                </p>
                <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Globe size={10} /> {session.ip}
                  </span>
                  <span className="bg-border-subtle h-1 w-1 rounded-full" />
                  <span>
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                disabled={deletingId === session.id}
                onClick={() => onDelete(session.id)}
                className="text-text-muted hover:text-destructive hover:bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                title="Remove session"
              >
                {deletingId === session.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </Section>
);

/* -------------------- Building blocks -------------------- */

const Section = ({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="border-border-subtle bg-bg-card overflow-hidden rounded-xl border shadow-sm">
    <div className="border-border-subtle flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <Icon size={13} />
        </div>
        <div className="min-w-0">
          <h3 className="text-text-main text-[13px] leading-tight font-semibold">
            {title}
          </h3>
          {description && (
            <p className="text-text-muted mt-0.5 truncate text-[11px]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Field = ({
  icon: Icon,
  label,
  input,
}: {
  icon: React.ElementType;
  label: string;
  input: React.ReactNode;
}) => (
  <label className="block">
    <span className="text-text-muted mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
      <Icon size={11} />
      {label}
    </span>
    {input}
  </label>
);

const ReadOnlyValue = ({ value }: { value: string }) => (
  <div className="border-border-subtle bg-bg-sidebar text-text-muted flex h-9 cursor-not-allowed items-center rounded-lg border px-3 text-[12px] capitalize">
    {value}
  </div>
);
