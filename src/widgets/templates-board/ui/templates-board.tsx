"use client";

import { useQuery } from "@tanstack/react-query";

import { useRouter } from "@/shared/lib/i18n/navigation";
import { cn } from "@/shared/lib/utils/cn";

import {
  fetchTemplates,
  formatTemplatePrice,
  getTemplateDislikeCount,
  getTemplateImage,
  getTemplateLikeCount,
  getTemplateMyReaction,
  getTemplateTitle,
  type Template,
} from "../model/templates";
import { TemplateReactions } from "./template-reactions";

export const TemplatesBoard = () => {
  const router = useRouter();

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ugen-templates"],
    queryFn: fetchTemplates,
    refetchOnWindowFocus: false,
    // Reactions can change while the user is on a detail page, so always pull
    // fresh counts/state when the board re-mounts instead of serving the
    // 5-minute-stale global cache. gcTime: 0 drops the cache the moment the
    // board unmounts (no observers), so returning to the page shows a clean
    // load rather than flashing the previous stale state.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const handleSelectTemplate = (template: Template) => {
    router.push(`/dashboard/templates/${template.id}` as any);
  };

  return (
    <div className="bg-bg-main h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-300">
        <h1 className="text-text-main mb-8 text-3xl font-bold">Templates</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="bg-bg-sidebar/60 aspect-16/10 w-full animate-pulse rounded-xl" />
                <div className="space-y-1.5">
                  <div className="bg-bg-sidebar/60 h-4 w-1/2 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="border-border-subtle bg-bg-card text-text-muted rounded-xl border p-8 text-center">
            Failed to load templates. Please try again later.
          </div>
        ) : templates.length === 0 ? (
          <div className="border-border-subtle bg-bg-card text-text-muted rounded-xl border border-dashed p-12 text-center">
            No templates available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TemplateCard = ({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (template: Template) => void;
}) => {
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "";
  const title = getTemplateTitle(template);
  const rawImage = getTemplateImage(template);

  const buildImageUrl = (raw: string) => {
    const full = raw.includes("https") ? raw : `${cdnBase}/${raw}`;
    try {
      return encodeURI(decodeURI(full));
    } catch {
      return full;
    }
  };
  const image = rawImage ? buildImageUrl(rawImage) : "";
  const price = formatTemplatePrice(template);

  return (
    <div
      className="group flex cursor-pointer flex-col gap-3"
      onClick={() => onSelect(template)}
    >
      <div className="bg-bg-sidebar border-border-subtle relative aspect-16/10 w-full overflow-hidden rounded-xl border shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <span
          className={cn(
            "absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm",
            price
              ? "bg-black/70 text-white"
              : "bg-green-500/90 text-white",
          )}
        >
          {price ?? "Free"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-text-main truncate text-[15px] font-semibold">
          {title}
        </h3>
        <div onClick={(e) => e.stopPropagation()}>
          <TemplateReactions
            templateId={template.id}
            initialReaction={getTemplateMyReaction(template)}
            initialLikeCount={getTemplateLikeCount(template)}
            initialDislikeCount={getTemplateDislikeCount(template)}
          />
        </div>
      </div>
    </div>
  );
};
