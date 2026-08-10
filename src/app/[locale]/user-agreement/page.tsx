import { Metadata } from "next";
import { LandingPageClientWrapper } from "@/widgets/landing-page/ui/landing-page-client-wrapper";
import { UserAgreementPage } from "@/widgets/user-agreement-page";

export const metadata: Metadata = {
  title: "User Agreement | Ugen",
  description:
    "Terms for accessing and using Ugen products, services, workspaces, and integrations.",
};

export default function UserAgreementRoute() {
  return (
    <LandingPageClientWrapper>
      <UserAgreementPage />
    </LandingPageClientWrapper>
  );
}
