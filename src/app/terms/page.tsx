import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { getCurrentCompany } from '@/lib/companies/current';
import { getTermsContent } from './content';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  const content = getTermsContent(company.key);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  };
}

export default async function TermsPage() {
  const company = await getCurrentCompany();
  const content = getTermsContent(company.key);
  return (
    <LegalDocument
      title={content.title}
      description={content.description}
      effectiveDate={content.effectiveDate}
      intro={content.intro}
      sections={content.sections}
      contactBody={content.contactBody}
      email={content.email}
    />
  );
}
