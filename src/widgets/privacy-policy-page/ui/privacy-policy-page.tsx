"use client";
import { useTranslations } from "next-intl";
import { COMPANY_INFO } from "@/shared/config/company";
import { Footer } from "@/widgets/footer";

type Section = {
  id: string;
  title: string;
  blocks: string[];
  list?: string[];
  after?: string[];
};

export const PrivacyPolicyPage = () => {
  const t = useTranslations("widgets.privacyPolicy");
  const tLegal = useTranslations("widgets.legal");
  const sections = t.raw("sections") as Section[];

  return (
    <div className="bg-bg-main flex min-h-screen flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-border-subtle border-b px-6 py-20 text-center">
        <span className="text-text-muted/60 mb-3 inline-block text-[0.68rem] font-bold tracking-[0.08em] uppercase">
          {tLegal("eyebrow")}
        </span>
        <h1
          className="text-text-main mb-3 leading-[1.1] font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
        >
          {t("title")}{" "}
          <em className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent not-italic">
            {t("accentTitle")}
          </em>
        </h1>
        <p className="text-text-muted text-[0.85rem]">
          {tLegal("effectiveDate", { date: t("effectiveDate") })}
        </p>
      </div>

      {/* Body */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="text-text-muted mb-12 text-[0.92rem] leading-[1.75]">
            {t("intro")}
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
              {section.blocks.map((block, i) => (
                <p
                  key={i}
                  className="text-text-muted mb-4 text-[0.9rem] leading-[1.75]"
                >
                  {block}
                </p>
              ))}
              {section.list && (
                <ul className="mb-4 list-disc space-y-1.5 pl-6">
                  {section.list.map((item, i) => (
                    <li
                      key={i}
                      className="text-text-muted text-[0.9rem] leading-[1.65]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.after?.map((block, i) => (
                <p
                  key={i}
                  className="text-text-muted mb-4 text-[0.9rem] leading-[1.75]"
                >
                  {block}
                </p>
              ))}
            </div>
          ))}

          {/* Contact */}
          <div id="contact-us" className="mb-4 scroll-mt-24">
            <h2 className="text-text-main mb-4 text-[1.15rem] font-bold">
              {t("contact.title")}
            </h2>
            <p className="text-text-muted mb-4 text-[0.9rem] leading-[1.75]">
              {t("contact.intro")}
            </p>
            <div className="bg-bg-card border-border-subtle text-text-muted rounded-[12px] border p-6 text-[0.9rem] leading-[1.85]">
              <div className="text-text-main font-bold">
                {COMPANY_INFO.legalName}
              </div>
              <div>
                {t("contact.emailLabel")}:{" "}
                <a
                  href={`mailto:${COMPANY_INFO.businessEmail}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.businessEmail}
                </a>
              </div>
              <div>
                {t("contact.addressLabel")}: {COMPANY_INFO.address}
              </div>
              <div>
                {t("contact.websiteLabel")}:{" "}
                <a
                  href={COMPANY_INFO.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.website}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
