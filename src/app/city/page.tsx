import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import CityShowcase from '@/sites/wilderworld/CityShowcase';
import RegionSelector from '@/sites/wilderworld/RegionSelector';
import IslandMap from '@/sites/wilderworld/IslandMap';
import PlotMetrics from '@/sites/wilderworld/PlotMetrics';
import Neighborhoods from '@/sites/wilderworld/Neighborhoods';
import KeyLocations from '@/sites/wilderworld/KeyLocations';
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
        subtitle="Beyond the city, Wiami's world spans three distinct landmasses, each with its own terrain, resources, and role in the simulation."
      />
      <RegionSelector />

      <SectionHeader
        eyebrow="The Island"
        title="Nine Neighborhoods"
        subtitle="The Island is divided into distinct neighborhoods, each with its own character, industry, and role in the life of Wiami."
      >
        <a
          className="sci-btn sci-btn-primary"
          href="https://map.wilderworld.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore the Island
          <ArrowUpRight size={16} />
        </a>
      </SectionHeader>
      <IslandMap />
      <PlotMetrics />
      <Neighborhoods />

      <SectionHeader
        eyebrow="The Island"
        title="Key Locations"
        subtitle="Landmarks that define Wiami, from where every Wilder begins to the corners where the city's stories unfold."
      />
      <KeyLocations />
    </div>
  );
}
