import { Metadata } from "next";
import { LandingPageClientWrapper } from "@/widgets/landing-page/ui/landing-page-client-wrapper";
import { CancelPolicyPage } from "@/widgets/cancel-policy-page";

export const metadata: Metadata = {
  title: "Cancellation Policy | Ucode",
  description:
    "How to cancel a paid Ucode subscription and what happens after cancellation.",
};

export default function CancelPolicyRoute() {
  return (
    <LandingPageClientWrapper>
      <CancelPolicyPage />
    </LandingPageClientWrapper>
  );
}
