import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import CityShowcase from '@/sites/wilderworld/CityShowcase';
import RegionSelector from '@/sites/wilderworld/RegionSelector';
import styles from './page.module.css';

export default function CityPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="City"
        title="Welcome to Wiami"
        subtitle="Wiami is a massive virtual metropolis with residential areas, commercial hubs, industrial zones and legendary landmarks. Watch the city shift from day to night."
      >
        <a
          className="sci-btn sci-btn-primary"
          href="https://map.wilderworld.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore Map
          <ArrowUpRight size={16} />
        </a>
      </SectionHeader>
      <CityShowcase />

      <SectionHeader
        eyebrow="The Map"
        title="Three Territories"
        subtitle={
          'Beyond the city, Wiami\u2019s world spans three distinct landmasses \u2014 each with its own terrain, resources, and role in the simulation.'
        }
      />
      <RegionSelector />
    </div>
  );
}
