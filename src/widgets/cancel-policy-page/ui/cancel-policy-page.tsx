"use client";

import { COMPANY_INFO } from "@/shared/config/company";
import { LegalPage } from "@/widgets/legal-page";

const SECTIONS = [
  {
    id: "subscriptions-and-renewals",
    title: "1. Subscriptions and Renewals",
    blocks: [
      "Ugen subscriptions may renew automatically at the end of the selected billing period unless cancelled before the next renewal date.",
      "The active plan, billing period, renewal date, and available limits are shown inside the account billing area when billing is enabled for the workspace.",
    ],
  },
  {
    id: "how-to-cancel",
    title: "2. How to Cancel",
    blocks: [
      "A workspace owner or authorized administrator may cancel a paid plan from the billing settings in the Ugen dashboard, where available.",
      `If cancellation controls are not available in the dashboard, contact ${COMPANY_INFO.businessEmail} from the email address associated with the workspace and include the workspace or company name.`,
    ],
  },
  {
    id: "effective-date-of-cancellation",
    title: "3. Effective Date of Cancellation",
    blocks: [
      "Cancellation usually takes effect at the end of the current paid billing period. Access to paid features may continue until the paid period ends, unless otherwise stated in the applicable order, invoice, or written agreement.",
      "After cancellation takes effect, the workspace may be moved to a free plan or access to paid features may be limited.",
    ],
  },
  {
    id: "refunds",
    title: "4. Refunds",
    blocks: [
      "Fees already paid are generally non-refundable unless required by applicable law or expressly agreed in writing by UCODE.",
      "If a charge appears incorrect, contact us as soon as possible so we can review the payment, invoice, and account activity.",
    ],
  },
  {
    id: "data-after-cancellation",
    title: "5. Data After Cancellation",
    blocks: [
      "Cancelling a subscription does not automatically delete workspace data. Users remain responsible for exporting or deleting project data according to the product functionality available to them.",
      "Some information may be retained as required for billing, security, audit, legal compliance, dispute resolution, or legitimate business records.",
    ],
  },
  {
    id: "contact",
    title: "6. Contact",
    blocks: [
      `Questions about cancellation may be sent to ${COMPANY_INFO.businessEmail}.`,
      `${COMPANY_INFO.legalName}, ${COMPANY_INFO.address}`,
    ],
  },
];

export const CancelPolicyPage = () => (
  <LegalPage
    title="Cancellation"
    accentTitle="Policy"
    effectiveDate="July 28, 2026"
    intro="This Cancellation Policy explains how customers may cancel paid Ugen subscriptions and what happens after cancellation."
    sections={SECTIONS}
  />
);
