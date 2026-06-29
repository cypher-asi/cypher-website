import type { ComponentType } from 'react';
import { getCurrentCompany } from '@/lib/companies/current';
import type { CompanyKey } from '@/lib/companies/types';
import CypherLanding from '@/content/companies/cypher/Landing';
import ZodeLanding from '@/content/companies/zode/Landing';
import ZeroLanding from '@/content/companies/zero/Landing';
import WilderLanding from '@/content/companies/wilder/Landing';
import ZLanding from '@/content/companies/z/Landing';

const LANDINGS: Record<CompanyKey, ComponentType> = {
  cypher: CypherLanding,
  zode: ZodeLanding,
  zero: ZeroLanding,
  wilder: WilderLanding,
  z: ZLanding,
};

export default async function Home() {
  const company = await getCurrentCompany();
  const Landing = LANDINGS[company.key] ?? CypherLanding;
  return <Landing />;
}
