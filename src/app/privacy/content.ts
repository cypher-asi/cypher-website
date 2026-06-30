import type { LegalSection } from '@/components/LegalDocument';
import type { CompanyKey } from '@/lib/companies/types';

export interface LegalDocContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  description: string;
  effectiveDate?: string;
  intro?: string;
  sections: LegalSection[];
  contactBody: string;
  email: string;
}

/* ---------------------------------------------------------------------------
   Cypher
   --------------------------------------------------------------------------- */
const CYPHER = 'Cypher, Inc.';
const CYPHER_EMAIL = 'hello@cypher.net';

const cypherPrivacy: LegalDocContent = {
  metaTitle: 'Privacy Policy | Cypher',
  metaDescription:
    'How Cypher, Inc. handles your information when you use the Cypher website.',
  title: 'Privacy Policy',
  description:
    'How we handle your data, and the privacy-first principles behind Cypher.',
  effectiveDate: 'Effective date: June 27, 2026',
  intro: `This Privacy Policy explains how ${CYPHER} collects, uses, and shares information when you use the Cypher website. We are committed to a privacy-first approach: we collect only what we need and never sell your personal information.`,
  contactBody: `If you have questions about this Privacy Policy or your personal information, contact ${CYPHER} at ${CYPHER_EMAIL}.`,
  email: CYPHER_EMAIL,
  sections: [
    {
      heading: '1. Scope',
      body: [
        `This Privacy Policy explains how ${CYPHER} ("${CYPHER}", "we", "us", or "our") collects, uses, and shares information when you visit cypher.net and our related informational pages (collectively, the "Site").`,
        'It does not apply to third-party websites, products, or services that we link to or that you choose to use, which are governed by their own privacy policies.',
      ],
    },
    {
      heading: '2. Information We Collect',
      body: [
        'Information you provide directly. When you contact us, for example by email, we receive your message and any details you choose to include, such as your name and email address.',
        'Usage and device information. We may collect standard technical information such as browser type, device type, referring pages, and aggregate usage data used to operate, secure, and improve the Site.',
      ],
    },
    {
      heading: '3. How We Use Information',
      body: [
        'We use information to provide, maintain, and secure the Site; to respond to your inquiries; to understand how the Site is used and to improve it; to detect, prevent, and address fraud, abuse, and security issues; and to comply with legal obligations.',
      ],
    },
    {
      heading: '4. How We Share Information',
      body: [
        `We do not sell your personal information. We share information only as follows: with service providers who process data on our behalf under confidentiality obligations; to comply with law or valid legal process; to protect the rights, safety, and security of users, the public, or ${CYPHER}; and in connection with a merger, acquisition, or sale of assets, subject to this Policy.`,
      ],
    },
    {
      heading: '5. Cookies and Analytics',
      body: [
        'The Site may use cookies or similar technologies to remember preferences and to measure aggregate traffic and performance. You can control cookies through your browser settings, though disabling them may affect some functionality.',
      ],
    },
    {
      heading: '6. Data Retention',
      body: [
        'We retain information for as long as needed to operate the Site and for legitimate business or legal purposes. We delete or anonymize information when it is no longer needed, subject to applicable law.',
      ],
    },
    {
      heading: '7. Security',
      body: [
        'We use technical and organizational measures to protect information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
      ],
    },
    {
      heading: '8. Your Rights and Choices',
      body: [
        'Depending on where you live, you may have rights to access, correct, delete, or port your personal information, to object to or restrict certain processing, and to withdraw consent. Residents of the European Economic Area, the United Kingdom, and California, among others, may have additional rights under laws such as the GDPR and the CCPA/CPRA.',
        `To exercise these rights, contact us at ${CYPHER_EMAIL}. We will respond as required by applicable law, and we will not discriminate against you for exercising your rights.`,
      ],
    },
    {
      heading: '9. International Data Transfers',
      body: [
        'We may process and store information in countries other than the one in which you reside. Where required, we use appropriate safeguards for cross-border transfers of personal information.',
      ],
    },
    {
      heading: "10. Children's Privacy",
      body: [
        `The Site is not directed to children under the age required by applicable law, and we do not knowingly collect personal information from them. If you believe a child has provided us personal information, contact us at ${CYPHER_EMAIL} and we will take appropriate steps to delete it.`,
      ],
    },
    {
      heading: '11. Changes to this Policy',
      body: [
        'We may update this Privacy Policy from time to time. If we make material changes, we will update the effective date above and, where required, provide additional notice. Your continued use of the Site after changes take effect constitutes acceptance of the updated Policy.',
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
   Wilder World (content adapted from wilderworld.com/privacy-policy)
   --------------------------------------------------------------------------- */
const WILDER_EMAIL = 'info@wilderworld.com';

const wilderPrivacy: LegalDocContent = {
  metaTitle: 'Privacy Policy | Wilder World',
  metaDescription:
    'How Wilder World collects, uses, and protects your personal data.',
  title: 'Privacy Policy',
  description: 'How Wilder World handles your personal data.',
  effectiveDate: 'Effective date: January 24, 2023',
  intro:
    'This Privacy Policy includes important information about your personal data and we encourage you to read it carefully.',
  contactBody: `If you have questions about this Privacy Policy or wish to exercise your data protection rights, contact Wilder World at ${WILDER_EMAIL}.`,
  email: WILDER_EMAIL,
  sections: [
    {
      heading: 'Consent',
      body: [
        'By using our website, you hereby consent to our Privacy Policy and agree to its terms.',
      ],
    },
    {
      heading: 'Information we collect',
      body: [
        'The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.',
        'If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.',
        'When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.',
      ],
    },
    {
      heading: 'How we use your information',
      body: [
        'We use the information we collect in various ways, including to:',
        'Provide, operate, and maintain our website.',
        'Improve, personalize, and expand our website.',
        'Understand and analyze how you use our website.',
        'Develop new products, services, features, and functionality.',
        'Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes.',
        'Send you emails.',
        'Find and prevent fraud.',
      ],
    },
    {
      heading: 'Log Files',
      body: [
        "Wilder World follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.",
      ],
    },
    {
      heading: 'Cookies and Web Beacons',
      body: [
        "Like any other website, Wilder World uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.",
      ],
    },
    {
      heading: 'Advertising Partners Privacy Policies',
      body: [
        'You may consult this list to find the Privacy Policy for each of the advertising partners of Wilder World.',
        'Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Wilder World, which are sent directly to users\u2019 browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.',
        'Note that Wilder World has no access to or control over these cookies that are used by third-party advertisers.',
      ],
    },
    {
      heading: 'Third Party Privacy Policies',
      body: [
        "Wilder World's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.",
        "You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.",
      ],
    },
    {
      heading: 'CCPA Privacy Rights (Do Not Sell My Personal Information)',
      body: [
        'Under the CCPA, among other rights, California consumers have the right to:',
        "Request that a business that collects a consumer's personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.",
        "Request that a business delete any personal data about the consumer that a business has collected.",
        "Request that a business that sells a consumer's personal data, not sell the consumer's personal data.",
        'If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.',
      ],
    },
    {
      heading: 'GDPR Data Protection Rights',
      body: [
        'We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:',
        'The right to access \u2013 You have the right to request copies of your personal data. We may charge you a small fee for this service.',
        'The right to rectification \u2013 You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.',
        'The right to erasure \u2013 You have the right to request that we erase your personal data, under certain conditions.',
        'The right to restrict processing \u2013 You have the right to request that we restrict the processing of your personal data, under certain conditions.',
        'The right to object to processing \u2013 You have the right to object to our processing of your personal data, under certain conditions.',
        'The right to data portability \u2013 You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.',
        `If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at ${WILDER_EMAIL}.`,
      ],
    },
    {
      heading: "Children's Information",
      body: [
        'Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.',
        'Wilder World does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.',
      ],
    },
  ],
};

const PRIVACY_CONTENT: Partial<Record<CompanyKey, LegalDocContent>> = {
  cypher: cypherPrivacy,
  wilderworld: wilderPrivacy,
};

export function getPrivacyContent(key: CompanyKey): LegalDocContent {
  return PRIVACY_CONTENT[key] ?? cypherPrivacy;
}
