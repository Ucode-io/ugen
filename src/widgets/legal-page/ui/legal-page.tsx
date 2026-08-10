"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { COMPANY_INFO } from "@/shared/config/company";
import { Footer } from "@/widgets/footer";

// ponytail: legal copy lives in messages/*.json; company details stay in
// COMPANY_INFO and get spliced into {placeholders} so they can't drift.
export const fillCompany = (text: string) =>
  text.replace(
    /\{(\w+)\}/g,
    (match, key: string) => (COMPANY_INFO as Record<string, string>)[key] ?? match,
  );

export type LegalSection = {
  id: string;
  title: string;
  blocks: string[];
  list?: string[];
};

export type LegalPageProps = {
  eyebrow?: string;
  title: string;
  accentTitle?: string;
  effectiveDate?: string;
  intro: string;
  sections: LegalSection[];
  children?: ReactNode;
};

export const LegalPage = ({
  eyebrow,
  title,
  accentTitle,
  effectiveDate,
  intro,
  sections,
  children,
}: LegalPageProps) => {
  const t = useTranslations("widgets.legal");
  return (
    <div className="bg-bg-main flex min-h-screen flex-col">
      <div className="bg-bg-card border-border-subtle border-b px-6 py-20 text-center">
        <span className="text-text-muted/60 mb-3 inline-block text-[0.68rem] font-bold tracking-[0.08em] uppercase">
          {eyebrow ?? t("eyebrow")}
        </span>
        <h1
          className="text-text-main mb-3 leading-[1.1] font-extrabold"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
        >
          {title}
          {accentTitle && (
            <>
              {" "}
              <em className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent not-italic">
                {accentTitle}
              </em>
            </>
          )}
        </h1>
        {effectiveDate && (
          <p className="text-text-muted text-[0.85rem]">
            {t("effectiveDate", { date: effectiveDate })}
          </p>
        )}
      </div>

      <section className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="text-text-muted mb-12 text-[0.92rem] leading-[1.75]">
            {intro}
          </p>

          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="mb-12 scroll-mt-24"
            >
              <h2 className="text-text-main mb-4 text-[1.15rem] font-bold">
                {section.title}
              </h2>
              {section.blocks.map((block) => (
                <p
                  key={block}
                  className="text-text-muted mb-4 text-[0.9rem] leading-[1.75]"
                >
                  {block}
                </p>
              ))}
              {section.list && (
                <ul className="mb-4 list-disc space-y-1.5 pl-6">
                  {section.list.map((item) => (
                    <li
                      key={item}
                      className="text-text-muted text-[0.9rem] leading-[1.65]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {children}
        </div>
      </section>

      <Footer />
    </div>
  );
};
