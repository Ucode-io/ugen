"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

const PDF_URL = "/UCODE_User_Agreement_Stamped_Corrected.pdf";
// ponytail: viewer params strip the built-in PDF chrome (toolbar, thumbnail
// pane, scrollbar) so the document reads as page content. Chromium/Safari
// honour them; Firefox ignores them and keeps its own viewer.
const PDF_SRC = `${PDF_URL}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH&zoom=page-width`;

export const UserAgreementPage = () => {
  const t = useTranslations("widgets.userAgreement");
  const title = `${t("title")} ${t("accentTitle")}`;

  return (
    // ponytail: 4rem = the sticky Header height in the guest layout.
    <div className="bg-bg-main flex h-[calc(100dvh-4rem)] min-h-[480px] flex-col">
      <div className="border-border-subtle flex items-center justify-between gap-4 border-b px-6 py-3">
        <h1 className="text-text-main truncate text-[1rem] font-bold">{title}</h1>
        <a
          href={PDF_URL}
          download
          className="bg-primary hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-white transition-colors"
        >
          <Download className="h-4 w-4" />
          {t("downloadPdf")}
        </a>
      </div>

      <iframe
        src={PDF_SRC}
        title={title}
        className="mx-auto min-h-0 w-full max-w-[860px] flex-1 border-0 bg-white"
      />
    </div>
  );
};
