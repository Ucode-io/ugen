"use client";

import { useState } from "react";
import {
  Smartphone,
  Download,
  Eye,
  Apple,
  Hammer,
  Loader2,
  Check,
  X,
  BadgeCheck,
  Bell,
  BellRing,
  Camera,
  Fingerprint,
  Play,
  Terminal,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import type { MobileProjectData } from "@/entities/project/model/mobile-project-store";
import {
  getMobileCapabilityDefinitions,
  isMobileSimulationCapability,
  type MobileCapability,
  type MobileSimulationCapability,
} from "@/entities/project/model/mobile-capabilities";
import { StyledQr } from "./styled-qr";
import {
  createAndroidBuildKit,
  normalizeGeneratedMobileSource,
} from "../lib/mobile-android-build-kit";
import { useTranslations } from 'next-intl'

const QR_SIZE = 168;

/**
 * Native build pipeline states. The build worker / build-job API doesn't exist
 * yet, so the UI only ever sees "idle" today — but the full sequence is modeled
 * here so the stepper is ready to wire to real status updates later.
 */
export type MobileBuildStatus =
  | "idle"
  | "queued"
  | "installing"
  | "syncing"
  | "building"
  | "signing"
  | "completed"
  | "failed";

const BUILD_STEPS: {
  key: Exclude<MobileBuildStatus, "idle" | "failed">;
  label: string;
}[] = [
  { key: "queued", label: "Queued" },
  { key: "installing", label: "Installing" },
  { key: "syncing", label: "Syncing" },
  { key: "building", label: "Building" },
  { key: "signing", label: "Signing" },
  { key: "completed", label: "Completed" },
];

const STEP_ORDER: MobileBuildStatus[] = [
  "queued",
  "installing",
  "syncing",
  "building",
  "signing",
  "completed",
];

/**
 * Renders the native-build pipeline as a vertical stepper. Exported so a future
 * build-status worker can drive it; today it only mounts when `status !== idle`.
 */
export function MobileBuildStatusStepper({
  status,
}: {
  status: MobileBuildStatus;
}) {
  const t = useTranslations('widgets.projectWorkspace')
  if (status === "idle") return null;
  const currentIdx = STEP_ORDER.indexOf(status);
  const failed = status === "failed";

  return (
    <div className="border-border-subtle bg-bg-sidebar/40 mt-4 space-y-2 rounded-xl border p-3">
      {BUILD_STEPS.map((step) => {
        const stepIdx = STEP_ORDER.indexOf(step.key);
        const done = !failed && stepIdx < currentIdx;
        const active = !failed && stepIdx === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                done
                  ? "border-green-500/50 bg-green-500/10 text-green-500"
                  : active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border-subtle text-text-muted/40",
              )}
            >
              {done ? (
                <Check size={9} />
              ) : active ? (
                <Loader2 size={9} className="animate-spin" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-current" />
              )}
            </span>
            <span
              className={cn(
                done
                  ? "text-text-main"
                  : active
                    ? "text-primary"
                    : "text-text-muted/50",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
      {failed && (
        <div className="flex items-center gap-2.5 text-xs text-red-500">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-red-500/50 bg-red-500/10">
            <X size={9} />
          </span>
          {t('buildFailed')}
        </div>
      )}
    </div>
  );
}

interface MobileActionsPanelProps {
  /** Runtime metadata from the `mobile_project` SSE event (Capacitor version, web_dir). */
  mobileProject?: MobileProjectData | null;
  /** Project files to archive for "Download source". */
  files?: { path: string; content: string }[];
  /** Published web preview URL (https-normalized) for the "test on phone" QR. */
  webPreviewUrl?: string;
  /** Opens / maximizes the live web preview. */
  onPreview?: () => void;
  /** Opens an interactive preview-only simulation inside the phone frame. */
  onSimulateCapability?: (capability: MobileSimulationCapability) => void;
  /** Current native build status — "idle" until the build worker exists. */
  buildStatus?: MobileBuildStatus;
  className?: string;
}

/**
 * Side panel for a Capacitor mobile app, shown next to the phone-frame web
 * preview. Capacitor wraps the web build in a native shell, so there's no Expo
 * Go / QR here — the preview is the same web build. Actions: open the preview,
 * download the Capacitor source, and (disabled until the native build worker
 * lands) build Android / iOS.
 */
export const MobileActionsPanel = ({
  mobileProject,
  files,
  webPreviewUrl,
  onPreview,
  onSimulateCapability,
  buildStatus = "idle",
  className,
}: MobileActionsPanelProps) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [downloading, setDownloading] = useState(false);
  const [androidKitReady, setAndroidKitReady] = useState(false);

  const runtimeLabel = mobileProject?.runtime
    ? `${mobileProject.runtime}${mobileProject.runtime_version ? ` ${mobileProject.runtime_version}` : ""}`
    : "Capacitor";

  // Prefer the full source bundle from the `mobile_project` event (includes the
  // injected Capacitor scaffold: capacitor.config.ts, index.html, src/lib/capacitor.ts,
  // the augmented package.json). Fall back to the editor's loaded files.
  const sourceFiles = mobileProject?.files?.length
    ? mobileProject.files
    : files;
  const canDownload = !!sourceFiles?.length;
  const capabilityDefinitions = getMobileCapabilityDefinitions(
    mobileProject?.project_type,
    mobileProject?.capabilities,
  );

  const downloadFiles = async (
    downloadFiles: {
      path: string;
      content: string;
      unixPermissions?: number;
    }[],
    suffix: string,
  ) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of downloadFiles) {
      const path = file.path.startsWith("/") ? file.path.slice(1) : file.path;
      zip.file(path, file.content ?? "", {
        unixPermissions: file.unixPermissions,
      });
    }
    const blob = await zip.generateAsync({
      type: "blob",
      platform: "UNIX",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mobileProject?.project_name || "mobile-app"}-${suffix}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSource = async () => {
    if (!sourceFiles?.length || downloading) return;
    setDownloading(true);
    try {
      await downloadFiles(
        normalizeGeneratedMobileSource(sourceFiles),
        "source",
      );
    } catch (err) {
      console.error("[mobile] download source failed", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAndroidKit = async () => {
    if (!sourceFiles?.length || downloading) return;
    setDownloading(true);
    try {
      await downloadFiles(
        createAndroidBuildKit(sourceFiles, {
          projectName: mobileProject?.project_name,
          runtimeVersion: mobileProject?.runtime_version,
          webDir: mobileProject?.web_dir,
          capabilities: mobileProject?.capabilities,
        }),
        "android-local-build",
      );
      setAndroidKitReady(true);
    } catch (err) {
      console.error("[mobile] Android local build kit download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-bg-card border-border-subtle relative flex w-85 shrink-0 flex-col overflow-y-auto rounded-2xl border p-6 shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Smartphone className="text-primary h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-text-main text-lg leading-tight font-semibold">
            {t('mobileApp')}
          </h2>
          <p className="text-text-muted truncate text-xs">{runtimeLabel}</p>
        </div>
      </div>
      <p className="text-text-muted mb-6 text-sm leading-relaxed">
        A native mobile app powered by {runtimeLabel}. The phone frame shows the
        live web build; download the source or build native binaries below.
      </p>

      {/* Primary actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onPreview}
          className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <Eye size={15} />
          {t('preview')}
        </button>
        <button
          type="button"
          onClick={handleDownloadSource}
          disabled={!canDownload || downloading}
          className="border-border-subtle text-text-main hover:bg-hover-bg flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          Download source
        </button>
      </div>

      {capabilityDefinitions.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
              {t('mobileCapabilities')}
            </p>
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
              {t('requested')}
            </span>
          </div>
          <div className="space-y-2">
            {capabilityDefinitions.map((definition) => (
              <div
                key={definition.capability}
                className="border-border-subtle bg-bg-sidebar/35 rounded-xl border p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <CapabilityIcon capability={definition.capability} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-main text-xs font-semibold">
                      {definition.label}
                    </p>
                    <p className="text-text-muted mt-0.5 text-[10px] leading-relaxed">
                      {definition.status}
                    </p>
                    {definition.simulated && (
                      <span className="mt-1.5 inline-flex rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-violet-500 uppercase">
                        {t('previewSimulation')}
                      </span>
                    )}
                  </div>
                </div>
                {isMobileSimulationCapability(definition.capability) && (
                  <button
                    type="button"
                    onClick={() =>
                      onSimulateCapability?.(
                        definition.capability as MobileSimulationCapability,
                      )
                    }
                    className="border-border-subtle text-text-main hover:bg-hover-bg mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors"
                  >
                    <Play size={11} />
                    {definition.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test on phone — QR to the published web preview. Capacitor wraps this
          exact web build, so it's a faithful preview; native plugins only fire
          in the real binary (they hit no-op web fallbacks in the browser). */}
      {webPreviewUrl && (
        <div className="mt-6">
          <p className="text-text-muted mb-2 text-xs font-medium tracking-wide uppercase">
            {t('testOnPhone')}
          </p>
          <div className="border-border-subtle flex flex-col items-center gap-2 rounded-xl border p-4">
            <div className="rounded-lg bg-white p-1.5">
              <StyledQr value={webPreviewUrl} size={QR_SIZE} />
            </div>
            <a
              href={webPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-primary max-w-full truncate text-center text-[11px] transition-colors"
              title={webPreviewUrl}
            >
              Scan to open in your phone&apos;s browser
            </a>
          </div>
        </div>
      )}

      {/* Android downloads a safe local-build kit. Running generated project
          code stays on the developer's machine; iOS remains unavailable until
          a native build service exists. */}
      <div className="mt-6">
        <p className="text-text-muted mb-2 text-xs font-medium tracking-wide uppercase">
          {t('nativeBuilds')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadAndroidKit}
            disabled={!canDownload || downloading}
            title={t('downloadSourceKit')}
            className="border-border-subtle text-text-main hover:bg-hover-bg flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Hammer size={13} />
            )}
            Android
          </button>
          <button
            type="button"
            disabled
            title={t('nativeBuildSoon')}
            className="border-border-subtle text-text-muted flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium opacity-60"
          >
            <Apple size={13} />
            iOS
          </button>
        </div>
        <p className="text-text-muted/70 mt-2 text-[11px] leading-relaxed">
          Android downloads a local-build kit. IPA builds and store publishing
          require a native build service.
        </p>
        {androidKitReady && (
          <div className="mt-3 rounded-xl border border-green-500/25 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-green-600">
              <Check size={13} />
              {t('androidKitDownloaded')}
            </div>
            <p className="text-text-muted mt-1.5 text-[11px] leading-relaxed">
              {t('extractThenRun')}
            </p>
            <code className="text-text-main mt-2 flex items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1.5 text-[10px] dark:bg-white/5">
              <Terminal size={11} />
              ./scripts/build-android-debug.sh
            </code>
            <p className="text-text-muted mt-2 text-[10px]">
              The finished APK lands on your Desktop (also in
              artifacts/app-debug.apk).
            </p>
          </div>
        )}
        <MobileBuildStatusStepper status={buildStatus} />
      </div>
    </div>
  );
};

function CapabilityIcon({ capability }: { capability: MobileCapability }) {
  switch (capability) {
    case "camera":
      return <Camera size={15} />;
    case "local_notifications":
      return <Bell size={15} />;
    case "push_notifications":
      return <BellRing size={15} />;
    case "biometric_auth":
      return <Fingerprint size={15} />;
    case "identity_verification":
      return <BadgeCheck size={15} />;
  }
}
