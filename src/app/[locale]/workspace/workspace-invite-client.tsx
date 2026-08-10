"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, User as UserIcon, Loader2 } from "lucide-react";
import axios from "axios";
import { api } from "@/shared/api";
import { useAuthStore } from "@/entities/session";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { logIsUgen } from "@/shared/lib/is-ugen-log";
import { useTranslations } from 'next-intl'

const ugenAuthApi = axios.create({
  baseURL: "https://auth-api.ucode.run",
  headers: { "Content-Type": "application/json" },
});

export const WorkspaceInviteClient = () => {
  const t = useTranslations('shared.common')
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, setAuth, setLanguages } = useAuthStore();

  const projectId = searchParams.get("project-id") || "";
  const envId = searchParams.get("env_id") || "";
  const roleId = searchParams.get("role_id") || "";
  const clientTypeId = searchParams.get("client_type_id") || "";
  const projectName = searchParams.get("name") || "";
  const companyName = searchParams.get("companyName") || "";

  const [isMounted, setIsMounted] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (isAuthenticated) {
      // Already logged in when arriving at the invite link — store invite so the modal picks it up
      if (projectId) {
        sessionStorage.setItem(
          "pendingInvite",
          JSON.stringify({ projectId, envId, roleId, clientTypeId, name: projectName, companyName }),
        );
        window.dispatchEvent(new Event("pendingInviteSet"));
      }
      router.push("/");
    }
  }, [isMounted, isAuthenticated]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await ugenAuthApi.post("/v3/ugen/login", { login, password });
      const responseData = res.data?.data;
      if (!responseData) throw new Error("Invalid response");

      const { project_data } = responseData;
      const response = responseData?.response || responseData;
      const { user: u, permissions, role, app_permissions, global_permission, environment_id, token } = response;

      logIsUgen("invite:raw", {
        project_data_is_ugen: project_data?.is_ugen,
        project_data_project_id: project_data?.project_id,
        project_data_environment_id: project_data?.environment_id,
        note: "invite path has no reconcile — is_ugen = raw project_data only",
      });

      setAuth(
        { id: u?.id, login: u?.login, email: u?.email, company_id: u?.company_id, environment_id, role },
        project_data,
        permissions || [],
        app_permissions || [],
        global_permission,
        token?.access_token,
        token?.refresh_token,
      );

      try {
        const langRes = await api.get("/v1/language?search=Admin");
        if (langRes.data?.data?.languages) setLanguages(langRes.data.data.languages);
      } catch { /* non-critical */ }

      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.description || err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterClick = () => {
    if (projectId) {
      sessionStorage.setItem(
        "pendingInvite",
        JSON.stringify({ projectId, envId, roleId, clientTypeId, name: projectName, companyName }),
      );
    }
    window.dispatchEvent(new CustomEvent("open-auth", { detail: "register" }));
  };

  if (!isMounted || isAuthenticated) {
    return (
      <div className="bg-bg-main flex h-screen items-center justify-center">
        <Loader2 className="text-primary animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-bg-main flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="border-border-subtle bg-bg-card w-full max-w-md rounded-2xl border p-8 shadow-xl">
        <div className="mb-6 space-y-1.5">
          <h2 className="text-text-main text-xl font-semibold">Join {projectName}</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            You've been invited to{" "}
            <span className="text-text-main font-medium">{companyName}</span>
            {companyName && projectName ? " / " : ""}
            <span className="text-text-main font-medium">{projectName}</span>.
            {" "}Sign in or create an account to accept.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-main">{t('login')}</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                type="text"
                placeholder={t('enterLogin')}
                className="focus:border-primary focus:ring-primary border-border-subtle bg-bg-sidebar text-text-main w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-all focus:ring-1"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-main">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={t('enterPassword')}
                className="focus:border-primary focus:ring-primary border-border-subtle bg-bg-sidebar text-text-main w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-all focus:ring-1"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-hover mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-text-muted text-sm">
            Don&apos;t have an account?{" "}
            <button
              onClick={handleRegisterClick}
              className="text-primary font-medium hover:underline"
            >
              {t('register')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
