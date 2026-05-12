"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, MessagesSquare, Loader2, ArrowUpDown, Check, CircleDashed } from "lucide-react";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { useChatsListInfinite, ChatListItem } from "@/entities/chat";
import { useProjectsList } from "@/entities/project";
import { useAuthStore } from "@/entities/session";
import { useDebounce } from "@/shared/hooks/useDebounce";

type SortKey = "updated_at" | "title" | "project";
type SortDir = "asc" | "desc";

const formatTimeAgo = (raw: string): string => {
  if (!raw) return "—";
  try {
    const diffMs = Date.now() - new Date(raw).getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  } catch {
    return raw;
  }
};

export const ChatsBoard = () => {
  const t = useTranslations("widgets.chats");
  const tWidgets = useTranslations("widgets.projects");
  const router = useRouter();
  const { project } = useAuthStore();
  const isUgen = project?.is_ugen ?? false;

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const filterRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const {
    data: chatsPages,
    isLoading: isChatsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useChatsListInfinite(
    {
      order_by: sortKey === "project" ? "updated_at" : sortKey,
      order_direction: sortDir,
      title: debouncedSearch || undefined,
    },
    { enabled: isUgen }
  );

  const { data: projectsResponse } = useProjectsList(
    { limit: 1000 },
    { enabled: isUgen }
  );

  const projectsList = useMemo(() => {
    const raw =
      projectsResponse?.response || projectsResponse?.data || projectsResponse;
    const list = Array.isArray(raw) ? raw : raw?.projects || [];
    const map = new Map<string, { name: string; image?: string }>();
    list.forEach((p: any) => {
      const id = p.id || p.project_id || p.mcp_project_id;
      if (id) {
        map.set(id, {
          name: p.name || p.title || tWidgets("untitledProject"),
          image: p.project_image || p.image || p.thumbnail || undefined,
        });
      }
    });
    return map;
  }, [projectsResponse, tWidgets]);

  const chats: (ChatListItem & { project_label: string; project_image?: string })[] = useMemo(() => {
    const pages = chatsPages?.pages ?? [];
    const list = pages.flatMap((page) => {
      const raw = page?.data?.chats ?? page?.response ?? page?.chats ?? [];
      return Array.isArray(raw) ? raw : [];
    });
    return list.map((c: any) => {
      const pid = c.project_id || c.mcp_project_id;
      const fromMap = pid ? projectsList.get(pid) : undefined;
      return {
        id: c.id,
        title: c.title || c.name || t("untitledChat"),
        description: c.description,
        model: c.model,
        project_id: pid || "",
        project_name: c.project_name || c.project_title,
        updated_at: c.updated_at || c.created_at,
        created_at: c.created_at,
        project_label:
          c.project_name ||
          c.project_title ||
          fromMap?.name ||
          t("noProject"),
        project_image: c.project_image || fromMap?.image,
      };
    });
  }, [chatsPages, projectsList, t]);

  const sorted = useMemo(() => {
    if (sortKey !== "project") return chats;
    const arr = [...chats];
    arr.sort((a, b) => {
      const cmp = a.project_label.localeCompare(b.project_label);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [chats, sortKey, sortDir]);

  // Infinite scroll sentinel
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const handleRowClick = (chat: ChatListItem) => {
    if (chat.project_id) router.push(`/projects/${chat.project_id}` as any);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="bg-bg-card flex h-full w-full flex-col rounded-2xl p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-text-main flex items-center gap-2 text-2xl font-semibold">
          {t("title")}
        </h1>
      </div>

      {/* Toolbar */}
      <div className="flex w-full flex-wrap items-center gap-3">
        <div className="border-border-subtle bg-input-bg focus-within:border-primary/50 focus-within:ring-primary/20 mr-auto flex w-full items-center gap-2 rounded-xl border px-3 py-1.5 transition-all focus-within:ring-1 sm:w-64 md:w-80">
          <Search className="text-text-muted shrink-0" size={18} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-text-main placeholder:text-text-muted w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen((v) => !v)}
            className={`border-border-subtle flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
              isFilterOpen
                ? "bg-bg-secondary text-bg-main"
                : "bg-input-bg text-text-muted hover:bg-hover-bg hover:text-text-main"
            }`}
            title={t("filter")}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">{t("filter")}</span>
          </button>

          {isFilterOpen && (
            <div className="border-border-subtle bg-bg-card absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border shadow-lg">
              <div className="text-text-muted/70 border-border-subtle border-b px-3 py-2 text-xs font-semibold uppercase">
                {t("sortBy")}
              </div>
              {(
                [
                  { key: "updated_at" as const, label: t("columns.updated") },
                  { key: "title" as const, label: t("columns.name") },
                  { key: "project" as const, label: t("columns.project") },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleSort(opt.key)}
                  className="text-text-main hover:bg-hover-bg flex w-full items-center justify-between px-3 py-2 text-sm transition-colors"
                >
                  <span>{opt.label}</span>
                  {sortKey === opt.key && (
                    <span className="text-primary flex items-center gap-1 text-xs">
                      <Check size={14} />
                      <span className="uppercase">{sortDir}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 flex-1 overflow-y-auto">
        {isChatsLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="text-primary animate-spin" size={28} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-text-muted flex h-64 w-full flex-col items-center justify-center gap-2">
            <MessagesSquare size={32} className="opacity-50" />
            <p className="text-sm">{t("noChats")}</p>
          </div>
        ) : (
          <>
            <div className="border-border-subtle overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-sidebar/40 text-text-muted/80 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        onClick={() => toggleSort("project")}
                        className="hover:text-text-main flex items-center gap-1.5 transition-colors"
                      >
                        <span>{t("columns.name")}</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <span>{t("columns.project")}</span>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        onClick={() => toggleSort("updated_at")}
                        className="hover:text-text-main flex items-center gap-1.5 transition-colors"
                      >
                        <span>{t("columns.updated")}</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle/60 divide-y">
                  {sorted.map((chat) => (
                    <tr
                      key={chat.id}
                      onClick={() => handleRowClick(chat)}
                      className="hover:bg-hover-bg group cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {chat.project_image ? (
                            <img
                              src={chat.project_image}
                              alt={chat.project_label}
                              className="border-border-subtle h-7 w-7 shrink-0 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                              <MessagesSquare size={14} />
                            </div>
                          )}
                          <span className="text-text-main truncate font-medium">
                            {chat.project_label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text-muted flex items-center gap-1.5 text-xs">
                          <CircleDashed size={13} className="shrink-0" />
                          Draft
                        </span>
                      </td>
                      <td className="text-text-muted px-4 py-3 whitespace-nowrap text-xs">
                        {formatTimeAgo(chat.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="text-primary animate-spin" size={20} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
