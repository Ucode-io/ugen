"use client";
import { COMPANY_INFO } from "@/shared/config/company";
import { Link } from "@/shared/lib/i18n/navigation";
import Image from "next/image";

const FOOTER_COLS = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Templates", href: "/templates" },
      { label: "Connectors", href: "/connectors" },
      {
        label: "Community",
        href: "https://t.me/ucode_community",
        external: true,
      },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Hire an Expert", href: "/hire-expert" },
      {
        label: "Community ↗",
        href: "https://t.me/ucode_community",
        external: true,
      },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Privacy", href: "/privacy-policy" },
      { label: "User Agreement", href: "/user-agreement" },
      { label: "Cancellation Policy", href: "/cancel-policy" },
      { label: "Company Info", href: "/company-info" },
    ],
  },
];

const BUSINESS_DETAILS = `Legal entity: ${COMPANY_INFO.legalName} — Address: ${COMPANY_INFO.address} TIN: ${COMPANY_INFO.tin}.`;

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border-subtle bg-bg-card border-t px-6 py-14">
      <div className="mx-auto max-w-[1100px]">
        {/* Top grid */}
        <div className="mb-10 grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link href="/" className="mb-2.5 inline-block no-underline">
              <Image
                src="/ugen-logo.svg"
                alt="Ugen Logo"
                width={120}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-text-muted max-w-[220px] text-[0.83rem] leading-[1.65]">
              The AI-powered platform that turns ideas into ready products in 15
              minutes.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href="https://t.me/ucode_community"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main flex h-8 w-8 items-center justify-center rounded-lg border text-[0.82rem] no-underline transition-all"
                title="Telegram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="0.8rem"
                  height="0.8rem"
                  fill="currentColor"
                  role="img"
                  viewBox="0 0 24 24"
                >
                  <title>Telegram</title>
                  <path
                    fill="currentColor"
                    d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main flex h-8 w-8 items-center justify-center rounded-lg border text-[0.82rem] no-underline transition-all"
                title="X / Twitter"
              >
                𝕏
              </a>
              <a
                href="#"
                className="bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main flex h-8 w-8 items-center justify-center rounded-lg border text-[0.82rem] no-underline transition-all"
                title="LinkedIn"
              >
                in
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-text-muted/60 mb-3.5 text-[0.67rem] font-bold tracking-[0.1em] uppercase">
                {col.heading}
              </h4>
              {col.links.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-main mb-2.5 block text-[0.83rem] no-underline transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href as any}
                    className="text-text-muted hover:text-text-main mb-2.5 block text-[0.83rem] no-underline transition-colors"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-border-subtle flex flex-wrap items-start justify-between gap-4 border-t pt-6">
          <div className="max-w-[680px]">
            <p className="text-text-muted/60 text-[0.76rem]">
              © {year} UCODE — All rights reserved.
            </p>
            <p className="text-text-muted/50 mt-2 text-[0.72rem] leading-[1.65]">
              {BUSINESS_DETAILS}
            </p>
          </div>
          <div className="text-text-muted/60 flex flex-wrap gap-x-4 gap-y-2 text-[0.76rem]">
            <Link
              href="/privacy-policy"
              className="hover:text-text-muted no-underline transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/user-agreement"
              className="hover:text-text-muted no-underline transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cancel-policy"
              className="hover:text-text-muted no-underline transition-colors"
            >
              Cancellation
            </Link>
            <Link
              href="/company-info"
              className="hover:text-text-muted no-underline transition-colors"
            >
              Company
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
