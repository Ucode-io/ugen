import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Palette,
  Search,
  Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";

export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Ubuntu",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Source Code Pro",
  "Fira Code",
  "DM Sans",
  "Space Grotesk",
  "Plus Jakarta Sans",
  "Manrope",
  "Outfit",
  "Geist",
  "Geist Mono",
  "Josefin Sans",
  "Rubik",
  "Work Sans",
  "Karla",
  "Mulish",
  "Jost",
  "Cabin",
  "Quicksand",
  "Barlow",
  "Archivo",
  "Figtree",
  "Lexend",
  "Noto Sans",
  "PT Sans",
  "Source Sans 3",
  "IBM Plex Sans",
  "IBM Plex Mono",
  "Inconsolata",
  "DM Mono",
  "Pacifico",
  "Dancing Script",
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Crimson Text",
  "EB Garamond",
  "Libre Baskerville",
  "Cormorant Garamond",
  "Cinzel",
  "Spectral",
];

export interface ColorDefinition {
  cssVar: string;
  label: string;
}

export interface ColorGroup {
  title: string;
  colors: ColorDefinition[];
}

export interface ThemeSettingsValue {
  colors: Record<string, string>;
  logoUrl: string;
}

interface ThemePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colorGroups: ColorGroup[];
  themeSettings: ThemeSettingsValue;
  setThemeSettings: React.Dispatch<React.SetStateAction<ThemeSettingsValue>>;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ThemePopover = ({
  open,
  onOpenChange,
  colorGroups,
  themeSettings,
  setThemeSettings,
  fontFamily,
  setFontFamily,
  onCancel,
  onSave,
}: ThemePopoverProps) => {
  const [fontSearch, setFontSearch] = useState("");
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fontPreviewLoadedRef = useRef(false);

  // Open the first group by default once groups become available.
  useEffect(() => {
    if (colorGroups.length === 0) return;
    setOpenGroups((prev) =>
      prev.size === 0 ? new Set([colorGroups[0].title]) : prev,
    );
  }, [colorGroups]);

  // Lazy-load preview-font CSS only when the font dropdown is first opened.
  useEffect(() => {
    if (!fontDropdownOpen || fontPreviewLoadedRef.current) return;
    fontPreviewLoadedRef.current = true;
    const families = FONT_FAMILIES.map(
      (f) => `family=${f.replace(/\s+/g, "+")}`,
    ).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, [fontDropdownOpen]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const filteredFonts = FONT_FAMILIES.filter((f) =>
    f.toLowerCase().includes(fontSearch.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Theme"
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            open
              ? "bg-text-main text-bg-main"
              : "text-text-muted hover:bg-hover-bg hover:text-text-main",
          )}
        >
          <Palette size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-72 p-0">
        {/* Header */}
        <div className="border-border-subtle border-b px-4 pt-4 pb-3">
          <h3 className="text-text-main text-sm font-semibold">Theme</h3>
          <p className="text-text-muted mt-0.5 text-[11px]">
            Colors and fonts for your project.
          </p>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto px-4 py-3">
          {/* Colors — each group is a collapsible accordion */}
          {colorGroups.length === 0 && (
            <p className="text-text-muted text-[12px]">
              No CSS color variables found in src/index.css.
            </p>
          )}
          {colorGroups.map((group) => {
            const isOpen = openGroups.has(group.title);
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="text-text-muted hover:text-text-main flex w-full items-center gap-1 py-0.5 text-[11px] font-semibold tracking-wider uppercase transition-colors"
                >
                  <ChevronDown
                    size={10}
                    className={cn(
                      "transition-transform duration-150",
                      !isOpen && "-rotate-90",
                    )}
                  />
                  <span>{group.title}</span>
                </button>
                {isOpen && (
                  <div className="mt-1.5 space-y-2 pl-3">
                    {group.colors.map(({ cssVar, label }) => (
                      <div
                        key={cssVar}
                        className="flex items-center justify-between"
                      >
                        <span className="text-text-main text-[13px]">
                          {label}
                        </span>
                        <label className="group flex cursor-pointer items-center gap-2">
                          <span className="text-text-muted group-hover:text-text-main font-mono text-[12px] transition-colors">
                            {(themeSettings.colors[cssVar] ?? "").toUpperCase()}
                          </span>
                          <div
                            className="border-border-subtle relative h-6 w-6 overflow-hidden rounded border shadow-sm"
                            style={{
                              backgroundColor: themeSettings.colors[cssVar],
                            }}
                          >
                            <input
                              type="color"
                              value={themeSettings.colors[cssVar] ?? "#000000"}
                              onChange={(e) =>
                                setThemeSettings((prev) => ({
                                  ...prev,
                                  colors: {
                                    ...prev.colors,
                                    [cssVar]: e.target.value,
                                  },
                                }))
                              }
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Logo */}
          <div className="space-y-2 pt-2">
            <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
              Logo
            </p>
            <div className="flex items-center gap-2">
              {themeSettings.logoUrl ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <img
                    src={themeSettings.logoUrl}
                    alt="Logo"
                    className="border-border-subtle h-7 w-auto max-w-20 rounded border object-contain"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setThemeSettings((prev) => ({ ...prev, logoUrl: "" }))
                    }
                    className="text-text-muted ml-auto shrink-0 text-[11px] transition-colors hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="border-border-subtle hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-[12px] transition-colors"
                >
                  <Upload size={12} />
                  Upload logo
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setThemeSettings((prev) => ({
                      ...prev,
                      logoUrl: ev.target?.result as string,
                    }));
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
              Font Family
            </p>
            <button
              type="button"
              onClick={() => {
                setFontDropdownOpen((o) => !o);
                setFontSearch("");
              }}
              className="border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-[13px] transition-colors"
            >
              <span>{fontFamily}</span>
              {fontDropdownOpen ? (
                <ChevronUp size={12} className="text-text-muted" />
              ) : (
                <ChevronDown size={12} className="text-text-muted" />
              )}
            </button>
            {fontDropdownOpen && (
              <div className="border-border-subtle overflow-hidden rounded-lg border">
                <div className="border-border-subtle bg-bg-sidebar flex items-center gap-2 border-b px-2.5 py-1.5">
                  <Search size={11} className="text-text-muted shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search fonts..."
                    className="text-text-main placeholder:text-text-muted flex-1 bg-transparent text-[12px] outline-none"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto">
                  {filteredFonts.length === 0 ? (
                    <p className="text-text-muted px-3 py-2 text-[12px]">
                      No fonts found
                    </p>
                  ) : (
                    filteredFonts.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setFontFamily(f);
                          setFontDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-[12px] transition-colors",
                          f === fontFamily
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-text-main hover:bg-hover-bg",
                        )}
                        style={{ fontFamily: `'${f}', sans-serif` }}
                      >
                        {f}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border-subtle bg-bg-sidebar/50 flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
          >
            Save & Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
