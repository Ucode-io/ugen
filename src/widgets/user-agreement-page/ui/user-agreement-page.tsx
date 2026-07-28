"use client";

import { COMPANY_INFO } from "@/shared/config/company";
import { LegalPage } from "@/widgets/legal-page";

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of the Agreement",
    blocks: [
      "By creating an account, accessing Ugen, or using any Ugen service, you agree to this User Agreement and any policies referenced by it.",
      "If you use Ugen on behalf of a company or organization, you confirm that you have authority to bind that organization to this Agreement.",
    ],
  },
  {
    id: "accounts",
    title: "2. Accounts and Security",
    blocks: [
      "You are responsible for keeping account credentials secure and for all activity that occurs under your account or workspace.",
      "You must provide accurate account and billing information and keep it up to date.",
    ],
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable Use",
    blocks: [
      "You may not use Ugen to violate applicable law, infringe third-party rights, distribute malware, attempt unauthorized access, abuse platform resources, or interfere with the service.",
      "You are responsible for the projects, content, data, automations, integrations, and applications created or operated through your workspace.",
    ],
  },
  {
    id: "customer-data",
    title: "4. Customer Data and Integrations",
    blocks: [
      "You retain responsibility for data uploaded to or processed through Ugen, including data received from third-party integrations.",
      "When you connect third-party services, you authorize Ugen to access and process the connected data only as needed to provide the requested product functionality.",
    ],
  },
  {
    id: "plans-and-payments",
    title: "5. Plans, Payments, and Cancellation",
    blocks: [
      "Paid plans, usage limits, billing periods, and prices are shown at checkout or in the billing area. You agree to pay applicable fees and taxes for the plan you select.",
      "Cancellation is handled according to the Cancellation Policy unless a separate written agreement states otherwise.",
    ],
  },
  {
    id: "availability",
    title: "6. Service Availability and Changes",
    blocks: [
      "We may update, improve, suspend, or discontinue parts of Ugen to maintain security, comply with law, support product development, or protect users and the platform.",
      "We work to keep the service available, but we do not guarantee uninterrupted or error-free operation.",
    ],
  },
  {
    id: "liability",
    title: "7. Disclaimers and Limitation of Liability",
    blocks: [
      "Ugen is provided on an as-is and as-available basis to the maximum extent permitted by applicable law.",
      "To the maximum extent permitted by law, UCODE is not liable for indirect, incidental, consequential, special, punitive, or lost-profit damages arising from use of the service.",
    ],
  },
  {
    id: "contact",
    title: "8. Contact",
    blocks: [
      `For questions about this User Agreement, contact ${COMPANY_INFO.businessEmail}.`,
      `${COMPANY_INFO.legalName}, ${COMPANY_INFO.address}`,
    ],
  },
];

export const UserAgreementPage = () => (
  <LegalPage
    title="User"
    accentTitle="Agreement"
    effectiveDate="July 28, 2026"
    intro="This User Agreement sets the main terms for accessing and using Ugen products, services, workspaces, integrations, and generated applications."
    sections={SECTIONS}
  />
);
