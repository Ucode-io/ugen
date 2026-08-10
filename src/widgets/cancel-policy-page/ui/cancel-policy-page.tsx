"use client";

import { useTranslations } from "next-intl";
import { LegalPage, fillCompany, type LegalSection } from "@/widgets/legal-page";

export const CancelPolicyPage = () => {
  const t = useTranslations("widgets.cancelPolicy");
  const sections = (t.raw("sections") as LegalSection[]).map((section) => ({
    ...section,
    blocks: section.blocks.map(fillCompany),
    list: section.list?.map(fillCompany),
  }));

  return (
    <LegalPage
      title={t("title")}
      accentTitle={t("accentTitle")}
      effectiveDate={t("effectiveDate")}
      intro={t("intro")}
      sections={sections}
    />
  );
};
