'use client'
import { Footer } from '@/widgets/footer'

const SECTIONS = [
  {
    id: 'information-we-process',
    title: '1. Information We Process',
    blocks: [
      'When you use Ucode, we may process account, project, and workspace information required to provide the service.',
      'If you choose to connect Google Calendar to a Ucode project, Ucode requests permission to create, update, and delete calendar events in the Google Calendar selected for the integration.',
      'For the Google Calendar integration, Ucode may process:',
    ],
    list: [
      'Google OAuth authorization and refresh tokens;',
      'the selected Google Calendar identifier;',
      'event title, description, location, start date, and end date;',
      'the Google Calendar event identifier;',
      'synchronization status, timestamps, and error messages.',
    ],
    after: [
      'This information is processed only after you explicitly connect your Google account and configure a Ucode project table for synchronization.',
    ],
  },
  {
    id: 'how-we-use-google-calendar-data',
    title: '2. How We Use Google Calendar Data',
    blocks: [
      'Ucode uses Google Calendar data only to provide the calendar synchronization feature visible in the Ucode product.',
      'When a record in a mapped Ucode project table is created, updated, or deleted, Ucode may create, update, or delete the corresponding event in the connected Google Calendar.',
      'Ucode does not use Google Calendar data for advertising, profiling, credit decisions, sale to data brokers, or any purpose unrelated to the calendar synchronization feature.',
    ],
  },
  {
    id: 'google-api-services-user-data-policy',
    title: '3. Google API Services User Data Policy',
    blocks: [
      "Ucode's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
      'Ucode does not sell Google user data. Ucode does not use Google user data to serve advertisements, including retargeting, personalized advertising, or interest-based advertising.',
    ],
  },
  {
    id: 'storage-and-retention',
    title: '4. Storage and Retention',
    blocks: [
      'OAuth credentials are retained while the Google Calendar integration remains connected to the relevant Ucode project. Event identifiers and synchronization metadata may be retained with the corresponding Ucode project records.',
      'When you disconnect the Google Calendar integration or delete the relevant project resource, Ucode stops using the stored authorization credentials for that integration. Events previously created in Google Calendar are not automatically deleted solely because the integration is disconnected.',
      'We retain other project data in accordance with the applicable workspace, project, and legal retention requirements.',
    ],
  },
  {
    id: 'sharing-of-information',
    title: '5. Sharing of Information',
    blocks: ['We do not sell personal information or Google Calendar data.', 'We may share information only when necessary to:'],
    list: [
      'provide the Ucode service and its user-facing features;',
      'comply with applicable law, legal process, or enforceable governmental requests;',
      'protect the security, rights, and integrity of Ucode, our users, or the public;',
      'use infrastructure or service providers that process information on our behalf and under appropriate confidentiality and security obligations.',
    ],
  },
  {
    id: 'security',
    title: '6. Security',
    blocks: [
      'We use reasonable technical and organizational measures designed to protect information from unauthorized access, loss, misuse, alteration, and disclosure. No method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'your-choices',
    title: '7. Your Choices',
    blocks: [
      "You may disconnect Google Calendar from a Ucode project through the Ucode project resource settings. You may also revoke Ucode's access from your Google Account security settings.",
      'You may contact us to request access to, correction of, or deletion of personal information, subject to applicable law and our legal obligations.',
    ],
  },
  {
    id: 'changes-to-this-policy',
    title: '8. Changes to This Policy',
    blocks: [
      'We may update this Privacy Policy from time to time. If we make material changes to how we use Google user data, we will update this page and, where required, request your consent before using the data for a new purpose.',
    ],
  },
]

export const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center py-20">
        <span className="inline-block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/60 mb-3">
          Legal
        </span>
        <h1
          className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-3"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
        >
          Privacy{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Policy
          </em>
        </h1>
        <p className="text-[0.85rem] text-text-muted">Effective date: June 22, 2026</p>
      </div>

      {/* Body */}
      <section className="px-6 py-16">
        <div className="max-w-[820px] mx-auto">
          <p className="text-[0.92rem] text-text-muted leading-[1.75] mb-12">
            This Privacy Policy explains how “UCODE MCHJ” (“Ucode”, “we”, “us”, or “our”) collects, uses, stores, and
            protects personal information when you use Ucode, including the Google Calendar integration.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id} className="mb-12 scroll-mt-24">
              <h2 className="text-[1.15rem] font-bold text-text-main mb-4">{section.title}</h2>
              {section.blocks.map((block, i) => (
                <p key={i} className="text-[0.9rem] text-text-muted leading-[1.75] mb-4">
                  {block}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc pl-6 mb-4 space-y-1.5">
                  {section.list.map((item, i) => (
                    <li key={i} className="text-[0.9rem] text-text-muted leading-[1.65]">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.after?.map((block, i) => (
                <p key={i} className="text-[0.9rem] text-text-muted leading-[1.75] mb-4">
                  {block}
                </p>
              ))}
            </div>
          ))}

          {/* Contact */}
          <div id="contact-us" className="mb-4 scroll-mt-24">
            <h2 className="text-[1.15rem] font-bold text-text-main mb-4">9. Contact Us</h2>
            <p className="text-[0.9rem] text-text-muted leading-[1.75] mb-4">
              If you have questions about this Privacy Policy or how Ucode handles information, contact us:
            </p>
            <div className="bg-bg-card border border-border-subtle rounded-[12px] p-6 text-[0.9rem] text-text-muted leading-[1.85]">
              <div className="font-bold text-text-main">&ldquo;UCODE MCHJ&rdquo;</div>
              <div>
                Email:{' '}
                <a href="mailto:info@u-code.io" className="text-primary hover:underline">
                  info@u-code.io
                </a>
              </div>
              <div>Address: Yunusabad District, Tashkent, Uzbekistan</div>
              <div>
                Website:{' '}
                <a
                  href="https://ucode.run"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ucode.run
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
