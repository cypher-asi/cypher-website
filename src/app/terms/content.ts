import type { LegalSection } from '@/components/LegalDocument';
import type { CompanyKey } from '@/lib/companies/types';
import type { LegalDocContent } from '../privacy/content';

export type { LegalDocContent };

/* ---------------------------------------------------------------------------
   Cypher
   --------------------------------------------------------------------------- */
const CYPHER = 'Cypher, Inc.';
const STATE = 'Nevada';
const CYPHER_EMAIL = 'hello@cypher.net';

const cypherTerms: LegalDocContent = {
  metaTitle: 'Terms of Service | Cypher',
  metaDescription:
    'The terms that govern your access to and use of the Cypher website.',
  title: 'Terms of Service',
  description: 'The terms that govern your access to and use of the Cypher website.',
  effectiveDate: 'Effective date: June 27, 2026',
  intro: `These Terms form a binding agreement between you and ${CYPHER} and govern your access to and use of the Cypher website. Please read them carefully. By accessing or using the Site, you agree to be bound by these Terms.`,
  contactBody: `If you have questions about these Terms, contact ${CYPHER} at ${CYPHER_EMAIL}.`,
  email: CYPHER_EMAIL,
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: [
        `These Terms of Service (the "Terms") form a binding agreement between you and ${CYPHER} ("${CYPHER}", "we", "us", or "our") and govern your access to and use of the Cypher website and related informational pages (collectively, the "Site").`,
        'By accessing or using the Site, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use the Site.',
      ],
    },
    {
      heading: '2. Eligibility',
      body: [
        'You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Site. By using the Site, you represent and warrant that you meet these requirements and that you are not barred from using the Site under any applicable law.',
      ],
    },
    {
      heading: '3. Use of the Site',
      body: [
        'The Site is provided for general informational purposes about the Cypher ecosystem and related projects. We may add, change, or remove content and features at any time, and we may restrict access to parts of the Site without notice or liability.',
      ],
    },
    {
      heading: '4. Intellectual Property',
      body: [
        `The Site and all related materials, including the Cypher name, logos, text, and design, are owned by ${CYPHER} or its licensors and are protected by intellectual property laws. These Terms do not grant you any right to use our trademarks without our prior written consent.`,
        'Where portions of the underlying software are made available under open-source licenses, your use of those components is governed by those licenses.',
      ],
    },
    {
      heading: '5. Acceptable Use',
      body: [
        'You agree not to use the Site to violate any law or the rights of others; to attempt to gain unauthorized access to any system or data; to interfere with or disrupt the integrity or performance of the Site; or to reverse engineer or circumvent any security or usage limits except to the extent permitted by applicable law.',
      ],
    },
    {
      heading: '6. Third-Party Links and Services',
      body: [
        `The Site may link to or reference third-party websites, products, and services. Your use of those third parties is governed by their own terms and privacy policies, and ${CYPHER} is not responsible for their availability, accuracy, or conduct.`,
      ],
    },
    {
      heading: '7. Disclaimers',
      body: [
        `THE SITE AND ALL CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. ${CYPHER.toUpperCase()} DOES NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.`,
      ],
    },
    {
      heading: '8. Limitation of Liability',
      body: [
        `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${CYPHER.toUpperCase()} AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SITE.`,
      ],
    },
    {
      heading: '9. Indemnification',
      body: [
        `You agree to indemnify and hold harmless ${CYPHER} and its affiliates from any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or related to your use of the Site or your violation of these Terms or applicable law.`,
      ],
    },
    {
      heading: '10. Changes to the Site and Terms',
      body: [
        'We may modify these Terms from time to time. If we make material changes, we will update the effective date above and, where required, provide additional notice. Your continued use of the Site after changes take effect constitutes acceptance of the revised Terms.',
      ],
    },
    {
      heading: '11. Governing Law',
      body: [
        `These Terms are governed by the laws of the State of ${STATE}, without regard to its conflict-of-laws rules. Subject to any applicable mandatory law, the state and federal courts located in ${STATE} will have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Site, and you consent to personal jurisdiction in those courts.`,
        'Nothing in this section limits any non-waivable statutory rights available to you as a consumer in your country of residence.',
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
   Wilder World (content adapted from wilderworld.com/terms-and-conditions)
   --------------------------------------------------------------------------- */
const ENTITY = 'Intergalactic Launch Pad Limited';
const MARKET = `${ENTITY} NFT Marketplace`;
const WILDER_TERMS_EMAIL = 'info@intergalactic.group';

const wilderTerms: LegalDocContent = {
  metaTitle: 'Terms & Conditions | Wilder World',
  metaDescription:
    'The terms and conditions that govern your use of the Wilder World NFT Marketplace.',
  title: 'Terms & Conditions',
  description: 'The terms that govern your use of the Wilder World NFT Marketplace.',
  effectiveDate: 'Effective date: January 24, 2023',
  intro: `The ${MARKET} ("${MARKET}") allows you to participate, by creating, displaying, buying and selling non-fungible tokens ("NFTs") and is made available to you by ${ENTITY} ("${ENTITY}").`,
  contactBody: `If you have questions about these Terms, contact us at ${WILDER_TERMS_EMAIL}.`,
  email: WILDER_TERMS_EMAIL,
  sections: [
    {
      heading: 'Acceptance',
      body: [
        `By clicking the "Sign Up" button, completing the account registration process and using the ${MARKET}, you confirm that you understand and agree to these terms and conditions, together with any documents that may be expressly referred to and are incorporated by reference ("Terms").`,
        `These Terms constitute a legal agreement between you and ${ENTITY} and govern your access to and use of the ${MARKET}, including any content, functionality, and services offered on or through ${ENTITY}/NFT (the "Site").`,
        `${ENTITY} reserves the right to change or modify these terms at any time and at our sole discretion. You agree and understand that by accessing or using the ${MARKET} and the Site following any change to these Terms, you are regarded as having agreed to the revised Terms.`,
      ],
    },
    {
      heading: 'Definitions',
      body: [
        '"Non-fungible token" / "NFT": Non-fungible token is a commercial term to describe items like your furniture, a picture image file, or your laptop. These things are not interchangeable for other items because they have unique properties. NFTs are tokens that we can use to represent ownership of unique items. They let us tokenize things like art, collectibles, even real estate. They can only have one official owner at a time and they are secured by the Ethereum blockchain \u2013 no one can modify the record of ownership or copy/paste a new NFT into existence.',
        '"Fungible items": on the other hand, can be exchanged because their value defines them rather than their unique properties. For example, ETH or dollars are fungible because 0.1 ETH / $1 USD is exchangeable for another 0.1 ETH / $1 USD.',
        '"Applicable Law": any law, rule, statute, subordinate legislation, regulation, by-law order, ordinance, protocol, code, guideline, treaty, policy, notice, direction or judicial, arbitral, administrative, ministerial or departmental judgment, award, decree, treaty, directive, or other requirement or guideline published or in force at any time which applies to or is otherwise intended to govern or regulate any person (including all parties to these Terms), property, transaction, activity, event or other matter, including any rule, order, judgment, directive or other requirement or guideline issued by any governmental or regulatory authority.',
        '"Sale Item" means any one or more of the following without limitation: (a) any art (including without limitation, designs, drawings, prints, images in any form or media, including without limitation videos and photographs); (b) audio files; (c) collectibles; (d) memorabilia; (e) game assets.',
        `"we/us/our" means ${ENTITY}; "you/your" means the user of the ${MARKET}.`,
      ],
    },
    {
      heading: 'Eligibility',
      body: [
        `${ENTITY} has sole and absolute discretion to allow or disallow your access to the ${MARKET}.`,
        'By agreeing to these Terms, you represent and warrant that: (i) you are at least 18 years of age; (ii) you have the full right, power, and authority to agree to these Terms; (iii) you are not subject to any financial sanctions, embargoes or other restrictive measures imposed by the United Nations, European Union, any EU country, UK Treasury or US Office of Foreign Assets Control (OFAC), or any governmental authority in any jurisdiction in which the Marketplace is available; (iv) you are not a citizen or resident of any sanctioned or restricted country; (v) you are not impersonating any other person; (vi) you will not use the Marketplace if any Applicable Laws in your country prohibit you from doing so in accordance with these Terms; (vii) you are compliant with all Applicable Laws to which you are subject; and (viii) you have read, understood and agreed to our Privacy Notice and Cookie Policy.',
      ],
    },
    {
      heading: 'Account',
      body: [
        `You must create an account ("Account") to use the ${MARKET}. To create an account, we will require you to provide certain information about yourself and we may, in our sole discretion, require you to provide further information and/or documents at any stage during your use of the platform. We may, in our sole discretion, refuse, decline, suspend or disable your access or use of the Marketplace.`,
      ],
    },
    {
      heading: 'Changes to the Marketplace',
      body: [
        'We may in our absolute and sole discretion change, update, amend, remove, or discontinue any part of the Site, the services and the Content at any time without prior notice to you.',
      ],
    },
    {
      heading: 'Fees',
      body: [
        `By buying and selling NFTs, including through the Auction process, on the ${MARKET}, you agree to pay all applicable fees as stipulated in the FAQ and on the checkout screen at the time of your purchase. You authorize ${ENTITY} to automatically deduct fees directly from payments to you and/or add fees to your payments to ${ENTITY} where applicable.`,
      ],
    },
    {
      heading: 'Your Use of the Marketplace and Conduct',
      body: [
        'We hereby grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Site and Content. Our grant of such license is subject to the following conditions. You undertake not to (and shall not, knowingly or otherwise, authorize, allow or assist any other party to): conduct electronic spamming or distribute unsolicited advertising; perform unlawful activities that violate any Applicable Laws (including money laundering, terrorism financing and/or fraudulent activities) or immoral activities; engage in any activity which operates to defraud us, other users, or any other person, or provide false, inaccurate, or misleading information; upload content infected with viruses, malicious code or Trojan horses, or that is immoral or illegal; modify or adapt any part of the Site or incorporate it into any other program; disassemble, decompile, or reverse-engineer the Site; infringe our, our affiliates\u2019 or any third party\u2019s intellectual property rights; act in any manner that could damage, disable, impair or compromise the Site or interfere with other users; gain or attempt to gain unauthorized access to the accounts or wallets of other users; impose an unreasonable or disproportionately large burden on our infrastructure; engage in any other inappropriate activity in contravention of these Terms or Applicable Laws; provide false, inaccurate, incomplete or misleading information; and/or engage in any lottery, bidding fee auctions, contests, sweepstakes, or other games of chance.',
      ],
    },
    {
      heading: 'User Content',
      body: [
        `The ${MARKET} allows (i) users to create a profile where they can post information about themselves, display their NFTs, and sell NFTs they own and (ii) artists or creators of NFTs ("Creator") to put their NFTs up for sale, which may be via auction ("Auction") (together the "User Content").`,
        'Any information you post on the Site as a Creator will be considered non-confidential. By providing any User Content on the Site, you grant us and our affiliates and our respective licensees, successors, and assigns the right to use, reproduce, modify, perform, display, distribute, retransmit, publish, broadcast, and otherwise disclose to third parties any such material for any purpose. You represent and warrant that (1) you own and control all rights in and to your User Content and have the right to grant such licenses; and (2) all of your User Content do and will comply with these Terms.',
        'You understand and agree that you are responsible for any User Content you submit or contribute, and you, and not us, have full responsibility for such content, including its legality, reliability, accuracy, and appropriateness. We are not responsible or liable to any third party for the content, accuracy, or appropriateness of any User Content posted by you or any other user on the Site.',
        'If you are a Creator, you hereby grant us the right to use your name and image for marketing or promotional purposes and agree that we may use or modify images from the NFTs that you create for marketing or promotional purposes. You also agree that we can use your biography and other public information about you to promote the NFTs that you create. You agree that you will not infringe on the intellectual property of others and will not coordinate pricing of any NFTs with other Creators.',
        'We reserve the right, in our absolute sole discretion, to prohibit you from uploading any NFTs to the Site. We are not required to monitor any User Content, but we may, in our sole discretion, remove any User Content at any time and for any reason without notice. We may monitor the User Content to detect and prevent fraudulent activity or violation of these Terms.',
      ],
    },
    {
      heading: 'Intellectual Property',
      body: [
        `Unless otherwise indicated by us, and except to the extent of the User Content, the Site, all content, and other materials contained therein, including, without limitation, the ${ENTITY} logo, and all designs, text, graphics, pictures, information, data, software, and files relating to the ${MARKET} (the "Content") are the proprietary property of ${ENTITY} or our affiliates, licensors, or users, as applicable.`,
        `The ${ENTITY} logo and any ${MARKET} product or service names, logos, or slogans that may appear on the Site or elsewhere are the proprietary property of ${ENTITY} and may not be copied, imitated or used, in whole or in part, without our prior written permission.`,
        'Unless otherwise stated, you may not use any Content without our express written permission. We reserve the right to suspend or terminate any Account that has actually or allegedly infringed upon any person\u2019s intellectual property rights.',
      ],
    },
    {
      heading: 'Sale by Auction',
      body: [
        `You may sell and purchase NFTs through the Auction process. Your participation in the Auction is subject to the rules available on the ${MARKET} FAQ.`,
        'You may only participate in the Auction by linking your digital wallet, which must be a type supported by us, to your Account.',
        `${ENTITY} may pause, cancel, or discontinue your Auction transactions at its sole discretion without liability.`,
      ],
    },
    {
      heading: 'Your Ownership of the NFT',
      body: [
        'Apart from the Content, all other copyrights, trademarks, product names, and logos on the Site relating to and including the NFTs and User Content, are the property of their respective owners and may not be copied, imitated, or used, in whole or in part, without the permission of the applicable intellectual property right owner.',
        `When you buy an NFT on the ${MARKET}, you own the NFT and have the right to sell or give away the NFT. If the NFT is associated with a Sale Item, you will have a worldwide, perpetual, exclusive, transferable licence to use, copy, and display the Sale Item for your NFT, for so long as you own the NFT, solely for the following purposes: (a) for your own personal, non-commercial use; (b) as part of the Marketplace that permits the purchase, sale and display of your NFT; (c) as part of a third party website or application that permits the inclusion, involvement, storage, or participation of your NFT.`,
        'Without limiting the foregoing, if you believe that third-party material hosted by the Marketplace infringes your copyright or trademark rights, please file a notice of infringement by contacting: info@intergalactic.group.',
      ],
    },
    {
      heading: 'Data Protection / Privacy',
      body: [
        `By using the ${MARKET}, you confirm that you have read and understood our Privacy Notice and understand how we collect, use, disclose and share your Personal Data and disclose such Personal Data to our authorised service providers and relevant third parties. We will only share your Personal Data in order to facilitate and administer your use of the Marketplace or otherwise if required by law. For full and comprehensive information about when and why we collect personal information about you, how we use it, the conditions under which we may disclose it and how we keep it secure, please refer to our Privacy Policy.`,
        'We reserve the right at any time to satisfy our internal requirements as to your Personal Data (for example, by requesting relevant original documents) including for the purposes of preventing fraud and/or anti-money laundering and counter-terrorist financing purposes.',
      ],
    },
    {
      heading: 'Limitation of Services / Account Closure / Termination',
      body: [
        'We reserve the right, without notice and in our sole discretion, to terminate or suspend your access to or use of the Site and any Content and/or close your Account, at any time for any reason but in particular, if we suspect in our sole discretion that: (1) your Account is being used for illegal activity; (2) you have concealed or provided false information; (3) you have engaged in fraudulent activity; and/or (4) you have engaged in activity in violation of these Terms.',
        `If ${ENTITY} is holding funds in your Account and has no record of your use of the Marketplace for several years, we may be required, upon passage of applicable time periods, to report these funds as unclaimed property in accordance with the abandoned property and escheat laws. If this occurs, we will use reasonable efforts to give you written notice. If you fail to respond within seven business days or the period as required by Applicable Law, we may be required to deliver any such funds to the applicable jurisdiction as unclaimed property. We reserve the right to deduct a reasonable administrative fee from such unclaimed funds, as permitted by Applicable Law.`,
      ],
    },
    {
      heading: 'Risks',
      body: [
        `You understand and agree that your access and use of the ${MARKET} is subject to certain risks including without limitation: (i) price and liquidity of blockchain assets, including the NFTs, are extremely volatile and may be subject to fluctuations; (ii) fluctuations in the price of other digital assets could materially and adversely affect the NFTs; (iii) legislative and regulatory changes or actions may adversely affect the use, transfer, and value of the NFTs; (iv) NFTs are not legal tender and are not backed by any government; (v) transactions involving NFTs may be irreversible, and losses due to fraudulent or accidental transactions may not be recoverable; (vi) the value of NFTs may be derived from the continued willingness of market participants to exchange fiat currency or digital assets for NFTs, and therefore the value of NFTs is subject to the potential for permanent or total loss of value should the market for NFTs disappear; (vii) NFTs are subject to the risk of fraud, counterfeiting, cyber-attacks and other technological difficulties which may prevent access to or use of your NFTs.`,
        `${ENTITY} reserves the right, at our absolute sole discretion, to redesign and/or recreate any NFT sold on the NFT Marketplace in regards to how it may look and/or appear visually once the NFT is utilized in-game and in the Metaverse.`,
        `You understand and agree that you are solely responsible for determining the nature, potential value, suitability, and appropriateness of these risks for yourself. ${ENTITY} does not give any advice or recommendations regarding the NFTs. You understand and agree that you access and use the Marketplace at your own risk.`,
      ],
    },
    {
      heading: 'Taxes',
      body: [
        `You agree that you are solely responsible for determining what, if any, taxes apply to your NFT transactions on the platform. Neither ${ENTITY} nor any other ${ENTITY} Party is responsible for determining the taxes that may apply to your NFT transactions.`,
      ],
    },
    {
      heading: 'Disclaimers',
      body: [
        `Creators may engage in promotion of their respective User Content, including without limitation their Sale Item, through various communications channels such as their social media accounts. ${ENTITY} is not responsible for any such communications and/or promotional activities carried out by the Creators and will not be liable to you in relation to any such communications and/or promotional activities.`,
        `You bear full responsibility for verifying the identity, legitimacy, and authenticity of assets you purchase on the ${MARKET}. Notwithstanding indicators and messages that suggest verification, ${ENTITY} makes no claims about the identity, legitimacy, or authenticity of assets on the Marketplace.`,
        `Except as expressly provided to the contrary in writing by ${ENTITY}, the Site, content contained therein, and the NFTs listed therein are provided on an "as is" and "as available" basis without warranties or conditions of any kind, either express or implied. ${ENTITY} (and its suppliers) make no warranty that the Site will (1) meet your requirements; (2) be available on an uninterrupted, timely, secure, or error-free basis; or (3) be accurate, reliable, complete, legal, or safe.`,
        `While ${ENTITY} attempts to make your access to and use of the Site and content safe, ${ENTITY} does not represent or warrant that the Site, content, any NFTs listed on the Site or any other part of the Marketplace are free of viruses or other harmful components. We cannot guarantee the security of any data that you disclose online. We will not be responsible for any breach of security unless it is due to our gross negligence.`,
        'We will not be responsible or liable to you for any loss and take no responsibility for, and will not be liable to you for, any use of the NFTs including but not limited to, any losses, damages, or claims arising from: (1) user error such as if you forget your password(s), incorrect transactions, or mistyped addresses; (2) server failure or data loss; (3) corrupted wallet files; (4) loss of NFTs.',
        `TO THE FULLEST EXTENT PROVIDED BY LAW, ${ENTITY.toUpperCase()} HEREBY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT AS TO THE SITE AND CONTENT CONTAINED THEREIN.`,
      ],
    },
    {
      heading: 'Limitation of Liability',
      body: [
        `TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL ${ENTITY.toUpperCase()} BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY LOST PROFIT OR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL OR PUNITIVE DAMAGES ARISING FROM THESE TERMS, THE SITE, PRODUCTS OR THIRD PARTY SITES AND PRODUCTS, OR FOR ANY DAMAGES RELATED TO LOSS OF REVENUE, LOSS OF PROFITS, LOSS OF BUSINESS OR ANTICIPATED SAVINGS, LOSS OF USE, LOSS OF GOODWILL, OR LOSS OF DATA, WHETHER CAUSED BY TORT (INCLUDING NEGLIGENCE), BREACH OF CONTRACT, OR OTHERWISE, EVEN IF FORESEEABLE.`,
        `NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, IN NO EVENT SHALL THE MAXIMUM AGGREGATE LIABILITY OF ${ENTITY.toUpperCase()} ARISING OUT OF OR IN ANY WAY RELATED TO THESE TERMS, THE ACCESS AND USE OF THE SITE, CONTENT, NFTS OR ANY PRODUCT OR SERVICES PURCHASED ON THE SITE EXCEED US$100. THE FOREGOING LIMITATIONS OF LIABILITY SHALL NOT APPLY TO LIABILITY FOR PERSONAL INJURY CAUSED BY NEGLIGENCE OR ANY INJURY CAUSED BY FRAUD OR FRAUDULENT MISREPRESENTATION.`,
      ],
    },
    {
      heading: 'Indemnification',
      body: [
        `To the fullest extent permitted by Applicable Law, you agree to indemnify, defend and hold harmless ${ENTITY} and our past, present and future employees, officers, directors, contractors, consultants, equity holders, suppliers, vendors, service providers, parent companies, subsidiaries, affiliates, agents, representatives, predecessors, successors and assigns (individually and collectively the "${ENTITY} Parties"), from and against all actual or alleged third party claims, damages, awards, judgments, losses, liabilities, obligations, penalties, interest, fees, and expenses, of every kind and nature whatsoever, whether in tort, contract or otherwise (collectively, "Claims"), including damages to property or personal injury, that are caused by, arise out of or are related to (a) your use or misuse of the Site, Content or NFTs, (b) your breach of these Terms, and (c) your breach or violation of the rights of a third party. You agree to promptly notify us of any third party Claims and cooperate in defending such Claims, and that the ${ENTITY} Parties shall have control of the defense or settlement of any third party Claims.`,
        'THIS INDEMNITY IS IN ADDITION TO, AND NOT IN LIEU OF, ANY OTHER INDEMNITIES THAT MAY BE SET FORTH IN A WRITTEN AGREEMENT BETWEEN YOU AND THE COMPANY.',
      ],
    },
    {
      heading: 'Amendment and Variation',
      body: [
        `These Terms may from time to time be updated or amended. We will post any such updates on the Site. Such updated Terms as posted will take effect immediately unless otherwise indicated. You should regularly check the Site to inform yourself of any such changes. By continuing to use the ${MARKET} and/or the Site after any such changes have taken effect, you are indicating your acceptance of the updated or amended Terms.`,
      ],
    },
    {
      heading: 'Transfer, Assignment or Delegation',
      body: [
        `Unless otherwise stated herein, these Terms, and any rights and obligations and licenses granted hereunder, are limited, revocable, non-exclusive and personal to you and therefore may not be transferred, assigned or delegated by you to any third-party without our written consent, but may be transferred, assigned or delegated by us without notice and restriction, including to any of the entities within the ${ENTITY} group, or to any successor in interest of any business associated with the Marketplace. Any attempted transfer or assignment in violation hereof shall be null and void.`,
      ],
    },
    {
      heading: 'Severability',
      body: [
        'If any provision of these Terms shall be found by any court or administrative body of competent jurisdiction to be invalid or unenforceable, the invalidity or unenforceability of such provision shall not affect the other provisions of these Terms and all provisions not affected by such invalidity or unenforceability shall remain in full force and effect.',
      ],
    },
    {
      heading: 'Entire Agreement / Translation',
      body: [
        'These Terms constitute the entire agreement between the parties regarding its subject matter and supersede and invalidate all other prior representations, arrangements, understandings, and agreements relating to the same subject matter, whether oral or in writing, express or implied.',
        'These Terms are concluded in the English language and all communications including any notices or information being transmitted shall be in English. In the event that these Terms or any part of it is translated into any other language, the English language text of these Terms shall prevail.',
      ],
    },
    {
      heading: 'Waiver',
      body: [
        'These Terms shall not be waived in whole or in part except where agreed by the parties in writing.',
        'The delay of enforcement or the non-enforcement of any of the terms of these Terms by any party shall not be construed as a waiver of any of the other rights of that party, and each right, power or remedy shall be cumulative.',
      ],
    },
    {
      heading: 'Notices and Communications',
      body: [
        `By using the ${MARKET}, you agree that we may provide you with notices or other communications, including marketing, relating to your use of the Marketplace electronically: (a) via email, SMS message, or telephone call (in each case to the contact details that you provide), or (b) by posting to the Site. For notices made by email, the date of receipt will be deemed the date on which such notice is transmitted. You will always be given the option to unsubscribe from receiving any marketing material from us.`,
        `Notices to us should be sent electronically to ${WILDER_TERMS_EMAIL}.`,
      ],
    },
    {
      heading: 'Third Party Rights',
      body: [
        `Other than the entities within the ${ENTITY} group, a person who is not a party to these Terms has no right to enforce any of these Terms.`,
      ],
    },
    {
      heading: 'Governing Law and Jurisdiction',
      body: [
        'These Terms are governed by and shall be construed in accordance with the laws of the British Virgin Islands without regard to any choice or conflict of laws rules. Any dispute, controversy, or claim, whether contractual or non-contractual, arising out of or in connection with these Terms, or the breach, termination or invalidity thereof, shall be referred to and finally settled by arbitration administered by the British Virgin Islands IAC under the Rules in force when the Notice of Arbitration is submitted.',
        'The law of this arbitration clause shall be British Virgin Islands law. The seat of arbitration shall be in the British Virgin Islands. The number of arbitrators shall be one. The arbitration proceedings shall be conducted in the English language.',
      ],
    },
  ],
};

const TERMS_CONTENT: Partial<Record<CompanyKey, LegalDocContent>> = {
  cypher: cypherTerms,
  wilderworld: wilderTerms,
};

export function getTermsContent(key: CompanyKey): LegalDocContent {
  return TERMS_CONTENT[key] ?? cypherTerms;
}

export type { LegalSection };
