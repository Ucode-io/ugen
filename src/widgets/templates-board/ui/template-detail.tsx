"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  Minimize,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

import { useRouter } from "@/shared/lib/i18n/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";

import {
  fetchTemplateDetail,
  getTemplateDemoUrl,
  getTemplateDescription,
  getTemplateImage,
  getTemplateTitle,
} from "../model/templates";
import { useTemplateLaunch } from "../model/use-template-launch";

const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "";

type DeviceId = "desktop" | "tablet" | "mobile";

const DEVICES: { id: DeviceId; label: string; icon: JSX.Element }[] = [
  { id: "desktop", label: "Desktop", icon: <Monitor size={14} /> },
  { id: "tablet", label: "Tablet", icon: <Tablet size={14} /> },
  { id: "mobile", label: "Mobile", icon: <Smartphone size={14} /> },
];

const DEVICE_WIDTHS: Record<DeviceId, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { launchTemplate, launchingTemplateId } = useTemplateLaunch();

  const { data: template, isLoading } = useQuery({
    queryKey: ["ugen-template", id],
    queryFn: () => fetchTemplateDetail(id),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const photo = template ? getTemplateImage(template) : "";
  const rawImages: string[] =
    template && Array.isArray(template.images) ? template.images : [];
  const images: string[] = [
    ...(photo ? [photo] : []),
    ...rawImages.filter((img) => img !== photo),
  ].map((img) => buildImageUrl(img));

  useEffect(() => {
    if (lightboxIndex === null || images.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((idx) =>
          idx === null ? idx : (idx - 1 + images.length) % images.length,
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((idx) =>
          idx === null ? idx : (idx + 1) % images.length,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, images.length]);

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

  const selectedDevice = DEVICES.find((d) => d.id === device) ?? DEVICES[0];
  const iframeWidth = DEVICE_WIDTHS[device];

  const handleReload = () => {
    setIframeLoaded(false);
    setReloadKey((k) => k + 1);
  };

  const showPrev = () => {
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  };

  const showNext = () => {
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  };

  const previewSection = (
    <div
      className={cn(
        "bg-bg-main flex items-center justify-center",
        isMaximized
          ? "fixed inset-0 z-[150]"
          : "border-border-subtle bg-bg-card mb-3 overflow-hidden rounded-xl border",
      )}
      style={isMaximized ? undefined : { height: 600 }}
    >
      <div
        className="border-border-subtle relative flex h-full flex-shrink-0 flex-col overflow-hidden border shadow-md transition-all duration-300"
        style={{
          width: iframeWidth,
          maxWidth: "100%",
          borderRadius: isMaximized ? "0px" : device === "desktop" ? "12px" : "24px",
        }}
      >
        {/* Browser header (viewing-only) */}
        <div className="border-border-subtle bg-bg-card flex h-10 shrink-0 items-center justify-end gap-1 border-b px-2">
          <button
            type="button"
            onClick={handleReload}
            title="Reload preview"
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
          </button>

          <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 items-center gap-1 rounded-lg px-2 transition-colors"
                title={selectedDevice.label}
              >
                {selectedDevice.icon}
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform duration-200",
                    deviceOpen && "rotate-180",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-36 p-1">
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDevice(d.id);
                    setDeviceOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    d.id === device
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-muted hover:bg-hover-bg hover:text-text-main",
                  )}
                >
                  {d.icon}
                  <span>{d.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? "Exit fullscreen" : "Fullscreen"}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          >
            {isMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>

        {/* Iframe area */}
        <div className="bg-bg-main relative flex-1">
          {!iframeLoaded && demoUrl && (
            <div className="bg-bg-card/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
              <Loader2 size={28} className="text-primary animate-spin" />
            </div>
          )}
          {demoUrl ? (
            <iframe
              ref={iframeRef}
              key={`${demoUrl}-${reloadKey}`}
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
    </div>
  );

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

        {previewSection}

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
                  onClick={() => setLightboxIndex(i)}
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

        {/* Lightbox with prev/next */}
        {lightboxIndex !== null && images[lightboxIndex] && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex]}
              alt="Screenshot preview"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight size={22} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="border-border-subtle bg-bg-card rounded-xl border p-5">
            <h2 className="text-text-main mb-3 text-[1.1rem] font-bold">
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
