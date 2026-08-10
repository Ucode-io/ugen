"use client";

import { useTranslations } from "next-intl";
import { LegalPage, fillCompany, type LegalSection } from "@/widgets/legal-page";

export const CompanyInfoPage = () => {
  const t = useTranslations("widgets.companyInfo");
  const sections = (t.raw("sections") as LegalSection[]).map((section) => ({
    ...section,
    blocks: section.blocks.map(fillCompany),
    list: section.list?.map(fillCompany),
  }));

  return (
    <LegalPage
      title={t("title")}
      accentTitle={t("accentTitle")}
      intro={t("intro")}
      sections={sections}
    />
  );
};
