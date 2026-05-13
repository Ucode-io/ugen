"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, X } from "lucide-react";

import { useRouter } from "@/shared/lib/i18n/navigation";

import {
  fetchTemplateDetail,
  getTemplateDemoUrl,
  getTemplateDescription,
  getTemplateImage,
  getTemplateTitle,
} from "../model/templates";
import { useTemplateLaunch } from "../model/use-template-launch";

const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "";

function buildImageUrl(raw: string) {
  const full = raw.includes("https") ? raw : `${cdnBase}/${raw}`;
  try {
    return encodeURI(decodeURI(full));
  } catch {
    return full;
  }
}

interface Props {
  id: string;
}

export const TemplateDashboardDetail = ({ id }: Props) => {
  const router = useRouter();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { launchTemplate, launchingTemplateId } = useTemplateLaunch();

  const { data: template, isLoading } = useQuery({
    queryKey: ["ugen-template", id],
    queryFn: () => fetchTemplateDetail(id),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="bg-bg-main flex h-full items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-bg-main flex h-full flex-col items-center justify-center gap-4">
        <p className="text-text-muted">Template not found.</p>
        <button
          onClick={() => router.push("/dashboard/templates")}
          className="text-primary text-sm hover:underline"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  const title = getTemplateTitle(template);
  const description = getTemplateDescription(template);
  const demoUrl = getTemplateDemoUrl(template);
  const images: string[] = Array.isArray(template.images)
    ? template.images.map((img: string) => buildImageUrl(img))
    : [];

  return (
    <div className="bg-bg-main h-full overflow-y-auto">
      <div className="mx-auto max-w-[1120px] px-6 pt-6 pb-20">
        {/* Top bar: back + title + actions */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/templates")}
            className="text-text-muted hover:text-text-main flex shrink-0 items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-text-main flex-1 truncate text-xl font-bold">
            {title}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => launchTemplate(template, { title })}
              disabled={launchingTemplateId === template.id}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {launchingTemplateId === template.id && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Use Template
            </button>
          </div>
        </div>

        {/* Full-width preview */}
        <div className="border-border-subtle bg-bg-card mb-3 overflow-hidden rounded-xl border">
          {/* Browser chrome */}
          <div className="border-border-subtle bg-bg-sidebar flex items-center gap-2.5 border-b px-3.5 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
            </div>
            {demoUrl && (
              <div
                className="text-text-muted flex flex-1 items-center gap-1.5 rounded px-3 py-1.5 text-[0.72rem]"
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border)",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {demoUrl.replace(/^https?:\/\//, "")}
              </div>
            )}
          </div>

          {/* Preview content */}
          <div className="relative w-full" style={{ height: "550px" }}>
            {!iframeLoaded && demoUrl && (
              <div className="bg-bg-card/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
                <Loader2 size={28} className="text-primary animate-spin" />
              </div>
            )}
            {demoUrl ? (
              <iframe
                key={demoUrl}
                src={demoUrl}
                className="absolute inset-0 h-full w-full border-0"
                title={title}
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => setIframeLoaded(true)}
              />
            ) : (
              <div className="text-text-muted flex h-full items-center justify-center text-sm">
                No demo URL available
              </div>
            )}
          </div>
        </div>

        {/* Screenshot cards */}
        {images.length > 0 && (
          <div className="mt-4 mb-8">
            <h2 className="text-text-main mb-3 text-[1rem] font-semibold">
              Screenshots
            </h2>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl(img)}
                  className="border-border-subtle shrink-0 cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                  style={{ width: 200, height: 125 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Screenshot ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Screenshot preview"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="border-border-subtle bg-bg-card rounded-xl border p-8">
            <h2 className="text-text-main mb-4 text-[1.1rem] font-bold">
              About this template
            </h2>
            <div
              className="template-description text-text-muted text-[0.875rem] leading-[1.8]"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
