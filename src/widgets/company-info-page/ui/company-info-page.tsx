"use client";

import { COMPANY_INFO } from "@/shared/config/company";
import { LegalPage } from "@/widgets/legal-page";

const SECTIONS = [
  {
    id: "legal-entity",
    title: "1. Legal Entity",
    blocks: [
      COMPANY_INFO.legalName,
      `Taxpayer identification number: ${COMPANY_INFO.tin}.`,
    ],
  },
  {
    id: "address",
    title: "2. Address",
    blocks: [COMPANY_INFO.address],
  },
  {
    id: "business-phone",
    title: "3. Business Phone",
    blocks: [
      `USA: ${COMPANY_INFO.businessPhoneUS}`,
      `Uzbekistan: ${COMPANY_INFO.businessPhoneUZ}`,
    ],
  },
  {
    id: "business-email",
    title: "4. Business Email",
    blocks: [COMPANY_INFO.businessEmail],
  },
  {
    id: "website",
    title: "5. Website",
    blocks: [COMPANY_INFO.website],
  },
];

export const CompanyInfoPage = () => (
  <LegalPage
    title="Company"
    accentTitle="Info"
    intro="Official business information for UCODE and the Ugen service."
    sections={SECTIONS}
  />
);
