"use client";
import { COMPANY_INFO } from "@/shared/config/company";
import { Footer } from "@/widgets/footer";

const SECTIONS = [
  {
    id: "information-we-process",
    title: "1. Information We Process",
    blocks: [
      "When you use Ucode, we may process account, project, and workspace information required to provide the service.",
      "If you choose to connect Google Calendar to a Ucode project, Ucode requests permission to create, update, and delete calendar events in the Google Calendar selected for the integration.",
      "For the Google Calendar integration, Ucode may process only the information required to provide this user-facing integration:",
    ],
    list: [
      "Google OAuth authorization and refresh tokens;",
      "the selected Google Calendar identifier;",
      "event title, description, location, start date, and end date;",
      "the Google Calendar event identifier;",
      "synchronization status, timestamps, and error messages.",
    ],
    after: [
      "This information is processed only after you explicitly connect your Google account and configure a Ucode project table for synchronization.",
      "If you choose to connect Instagram Direct to a Ucode project, Ucode requests the permissions needed to connect your Instagram professional account, receive customer messages, and send replies on your behalf through Meta APIs.",
      "For the Instagram Direct integration, Ucode may process Instagram OAuth/access tokens, connected Instagram account identifiers, public account metadata such as username, incoming and outgoing Direct message content, attachments shared in messages, sender identifiers available through Meta APIs, timestamps, delivery status, and related conversation metadata.",
      "When an end-user shares one of your connected Instagram account's own posts in a Direct message, Ucode may read that post's caption or media metadata through the Instagram Graph API so the assistant can answer product or content-related questions. Ucode does not access media owned by other Instagram accounts except content that an end-user sends to your connected account in a message.",
    ],
  },
  {
    id: "how-we-use-google-user-data",
    title: "2. How We Use Integration Data",
    blocks: [
      "Ucode uses Google user data only to provide and improve the user-facing Google Calendar integration requested by the user.",
      "When a record in a mapped Ucode project table is created, updated, or deleted, Ucode may create, update, or delete the corresponding event in the connected Google Calendar.",
      "Ucode does not use Google user data for advertising, retargeting, personalized advertising, marketing, profiling, analytics unrelated to the integration, credit decisions, sale to data brokers, or any purpose unrelated to providing or improving the Google Calendar integration.",
      "Ucode uses Instagram Direct data only to provide and improve the user-facing Instagram messaging integration requested by the user, including connecting the Instagram account, receiving and routing customer messages, displaying conversations in the Ucode dashboard, sending replies on behalf of the connected account, generating AI-assisted replies, and supporting human operator handoff.",
      "Ucode may use captions or metadata from your connected account's own Instagram posts only when needed to generate a relevant response to an end-user who shared that post in a Direct message.",
      "Ucode does not use Instagram messaging data for advertising, retargeting, personalized advertising, marketing profiling, sale to data brokers, or any purpose unrelated to providing or improving the Instagram Direct integration.",
    ],
  },
  {
    id: "google-api-services-user-data-policy",
    title: "3. Google API Services User Data Policy",
    blocks: [
      "Ucode's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
      "Ucode does not sell Google user data. Ucode does not transfer Google user data to third parties except as necessary to provide or improve the user-facing Google Calendar integration, comply with applicable law, protect against security abuse, or with the user's explicit consent.",
    ],
  },
  {
    id: "meta-instagram-messaging-data",
    title: "4. Meta / Instagram Messaging Data",
    blocks: [
      "For Instagram Direct, Ucode acts on behalf of the business or project owner that connects the Instagram professional account. We process Meta and Instagram data only to provide the messaging functionality configured by that account owner.",
      "Messages are transmitted through Meta APIs to receive messages from end-users and deliver replies from the connected Instagram account. Access tokens are stored only for as long as the integration remains connected and are used solely to provide the integration.",
      "Authorized members of the relevant Ucode workspace may access Instagram conversation history when needed to operate the integration, review AI responses, or take over a conversation from the assistant.",
      "Instagram data is not used to train generalized AI models owned by Ucode. Message content may be sent to AI service providers only when necessary to generate a response requested by the connected account owner or the end-user's conversation context.",
    ],
  },
  {
    id: "storage-and-retention",
    title: "5. Storage and Retention",
    blocks: [
      "OAuth credentials are retained only while the Google Calendar integration remains connected to the relevant Ucode project. Event identifiers and synchronization metadata may be retained with the corresponding Ucode project records only as needed to provide the Google Calendar integration.",
      "When you disconnect the Google Calendar integration or delete the relevant project resource, Ucode stops using the stored authorization credentials for that integration. Events previously created in Google Calendar are not automatically deleted solely because the integration is disconnected.",
      "Instagram access tokens are retained only while the Instagram Direct integration remains connected to the relevant Ucode project. Instagram message history and synchronization metadata may be retained with the corresponding Ucode project records only as needed to provide the integration, support auditability, and comply with applicable legal obligations.",
      "When you disconnect the Instagram Direct integration or delete the relevant project resource, Ucode stops using the stored authorization credentials for that integration and no longer receives new messages for that connected account.",
    ],
  },
  {
    id: "sharing-of-information",
    title: "6. Sharing of Information",
    blocks: [
      "We do not sell personal information or Google user data.",
      "Google user data is shared only when necessary to provide or improve the user-facing Google Calendar integration, comply with applicable law, protect against security abuse, or with the user's explicit consent.",
      "Instagram messaging data is transmitted through Meta Platforms, Inc. APIs only as necessary to receive messages, deliver replies, verify the connected account, and provide the Instagram Direct integration. This data is processed in accordance with Meta terms and policies.",
      "Message content, attachments, and relevant conversation context may be shared with AI service providers only to generate AI-assisted replies or perform requested message processing for the connected project.",
      "Service providers that process information on our behalf are required to protect the information and use it only to provide services to Ucode.",
    ],
  },
  {
    id: "security",
    title: "7. Security",
    blocks: [
      "We use reasonable technical and organizational measures designed to protect information from unauthorized access, loss, misuse, alteration, and disclosure.",
    ],
  },
  {
    id: "your-choices",
    title: "8. Your Choices",
    blocks: [
      "You may disconnect Google Calendar from a Ucode project through the Ucode project resource settings. You may also revoke Ucode's access from your Google Account security settings.",
      "You may disconnect Instagram Direct from a Ucode project through the Ucode project resource settings. You may also revoke Ucode's access to Instagram or Facebook permissions from your Meta account, Facebook Page, Instagram professional account, or Meta Business Integrations settings.",
      "You may request deletion of personal information and integration data, including data received through Meta or Instagram integrations, by contacting us using the details below. We will delete or anonymize the relevant data unless retention is required by applicable law or necessary to resolve security, abuse, or billing issues.",
      "You may contact us to request access to, correction of, or deletion of personal information, subject to applicable law and our legal obligations.",
    ],
  },
  {
    id: "changes-to-this-policy",
    title: "9. Changes to This Policy",
    blocks: [
      "We may update this Privacy Policy from time to time. Ucode will not use Google user data or Instagram messaging data for any purpose other than providing or improving the relevant user-facing integration unless the user is clearly notified, provides consent where required, and the use is permitted by applicable platform policies and law.",
    ],
  },
];

export const PrivacyPolicyPage = () => {
  return (
    <div className="bg-bg-main flex min-h-screen flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-border-subtle border-b px-6 py-20 text-center">
        <span className="text-text-muted/60 mb-3 inline-block text-[0.68rem] font-bold tracking-[0.08em] uppercase">
          Legal
        </span>
        <h1
          className="text-text-main mb-3 leading-[1.1] font-extrabold tracking-[-0.04em]"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
        >
          Privacy{" "}
          <em className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent not-italic">
            Policy
          </em>
        </h1>
        <p className="text-text-muted text-[0.85rem]">
          Effective date: July 9, 2026
        </p>
      </div>

      {/* Body */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="text-text-muted mb-12 text-[0.92rem] leading-[1.75]">
            This Privacy Policy explains how “UCODE MCHJ” (“Ucode”, “we”, “us”,
            or “our”) collects, uses, stores, and protects personal information
            when you use Ucode, including Google Calendar and Instagram Direct
            integrations.
          </p>

          {SECTIONS.map((section) => (
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
              10. Contact Us
            </h2>
            <p className="text-text-muted mb-4 text-[0.9rem] leading-[1.75]">
              If you have questions about this Privacy Policy or how Ucode
              handles information, contact us:
            </p>
            <div className="bg-bg-card border-border-subtle text-text-muted rounded-[12px] border p-6 text-[0.9rem] leading-[1.85]">
              <div className="text-text-main font-bold">
                {COMPANY_INFO.legalName}
              </div>
              <div>
                Email:{" "}
                <a
                  href={`mailto:${COMPANY_INFO.businessEmail}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.businessEmail}
                </a>
              </div>
              <div>Address: {COMPANY_INFO.address}</div>
              <div>
                Website:{" "}
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
