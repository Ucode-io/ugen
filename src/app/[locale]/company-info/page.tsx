import { Metadata } from "next";
import { LandingPageClientWrapper } from "@/widgets/landing-page/ui/landing-page-client-wrapper";
import { CompanyInfoPage } from "@/widgets/company-info-page";

export const metadata: Metadata = {
  title: "Company Info | Ucode",
  description:
    "Official company details, address, business phone, and business email for UCODE.",
};

export default function CompanyInfoRoute() {
  return (
    <LandingPageClientWrapper>
      <CompanyInfoPage />
    </LandingPageClientWrapper>
  );
}
