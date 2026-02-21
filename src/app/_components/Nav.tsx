'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Topbar, MenuMega, Button } from '@cypher-asi/zui';
import type { MenuMegaColumnProps } from '@cypher-asi/zui';
import {
  ArrowUpRight,
  ChevronDown,
  Cpu,
  Globe,
  Layers,
  Code,
  Zap,
  Network,
  Brain,
  MessageSquare,
  Shield,
  BookOpen,
  Search,
} from 'lucide-react';
import { TypewriterText } from './TypewriterText';
import type { TypewriterSegment } from './TypewriterText';
import styles from './Nav.module.css';

// ============================================================================
// Mega Menu Data
// ============================================================================

const productColumns: MenuMegaColumnProps[] = [
  {
    items: [
      { id: 'aura', icon: <Cpu size={18} />, label: 'AURA', description: 'Deploy agent swarms' },
      { id: 'zero-os', icon: <Layers size={18} />, label: 'ZERO OS', description: 'Securely chat and collaborate' },
      { id: 'machina', icon: <Network size={18} />, label: 'MACHINA', description: 'Manage servers for agents' },
      { id: 'z-chain', icon: <Zap size={18} />, label: 'Z CHAIN', description: 'Transact quickly and securely' },
    ],
  },
];

const worldColumns: MenuMegaColumnProps[] = [
  {
    items: [
      { id: 'wilder-world', icon: <Globe size={18} />, label: 'WILDER WORLD', description: 'Join a new dimension of reality' },
      { id: 'shanty-town', icon: <Globe size={18} />, label: 'SHANTY TOWN', description: 'A new frontier awaits' },
    ],
  },
];

const protocolColumns: MenuMegaColumnProps[] = [
  {
    items: [
      { id: 'zero-id', icon: <Shield size={18} />, label: 'ZERO ID', description: 'A secure auth & identity system' },
      { id: 'zns', icon: <Globe size={18} />, label: 'ZNS', description: 'An onchain naming system' },
      { id: 'zero-sdk', icon: <Code size={18} />, label: 'ZERO SDK', description: 'A secure communication system' },
      { id: 'aura-runtime', icon: <Cpu size={18} />, label: 'AURA RUNTIME', description: 'A secure & auditable agent runtime' },
      { id: 'aura-swarm', icon: <Brain size={18} />, label: 'AURA SWARM', description: 'A system for building agentic swarms' },
      { id: 'the-grid', icon: <Network size={18} />, label: 'THE GRID', description: 'A distributed compute network' },
    ],
  },
];

const researchColumns: MenuMegaColumnProps[] = [
  {
    items: [
      { id: 'papers', icon: <BookOpen size={18} />, label: 'Papers', description: 'Published research and findings' },
      { id: 'search', icon: <Search size={18} />, label: 'Explorer', description: 'Search the knowledge base' },
      { id: 'docs', icon: <Code size={18} />, label: 'Documentation', description: 'Guides and references' },
    ],
  },
];

// ============================================================================
// Menu configuration
// ============================================================================

interface NavMenuConfig {
  id: string;
  label: string;
  columns: MenuMegaColumnProps[];
  width: number;
  hasDropdown?: boolean;
  href?: string;
}

const menus: NavMenuConfig[] = [
  { id: 'products', label: 'TOOLS', columns: productColumns, width: 300 },
  { id: 'worlds', label: 'WORLDS', columns: worldColumns, width: 300 },
  { id: 'protocols', label: 'PROTOCOLS', columns: protocolColumns, width: 300 },
  { id: 'research', label: 'RESEARCH', columns: researchColumns, width: 300 },
  { id: 'vision', label: 'VISION', columns: [], width: 300, hasDropdown: false, href: '/vision' },
];

// ============================================================================
// TopbarNavItem
// ============================================================================

interface TopbarNavItemProps {
  config: NavMenuConfig;
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}

function TopbarNavItem({
  config,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onClose,
}: TopbarNavItemProps) {
  const [selected, setSelected] = useState('');
  const canOpenMenu = config.hasDropdown !== false;

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const buttonContent = (
    <>
      {config.label}
      {canOpenMenu && (
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      )}
    </>
  );

  return (
    <div
      className={styles.navItem}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {config.href ? (
        <Link href={config.href} className={styles.navLink}>
          <Button
            variant="ghost"
            size="sm"
            className={styles.navButton}
          >
            {buttonContent}
          </Button>
        </Link>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className={canOpenMenu && isOpen ? styles.navButtonActive : styles.navButton}
        >
          {buttonContent}
        </Button>
      )}
      {canOpenMenu && isOpen && (
        <div className={styles.megaDropdown} style={{ width: config.width }}>
          <MenuMega
            columns={config.columns}
            value={selected}
            onChange={(id) => {
              setSelected(id);
              onClose();
            }}
            background="solid"
            border="future"
            rounded="md"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Nav
// ============================================================================

export function Nav() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(
    (id: string) => {
      cancelCloseTimer();
      setOpenMenuId(id);
    },
    [cancelCloseTimer]
  );

  const handleLeave = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpenMenuId(null), 150);
  }, [cancelCloseTimer]);

  const handleClose = useCallback(() => {
    cancelCloseTimer();
    setOpenMenuId(null);
  }, [cancelCloseTimer]);

  useEffect(() => {
    return () => cancelCloseTimer();
  }, [cancelCloseTimer]);

  const titleSegments: TypewriterSegment[] = useMemo(() => [
    { text: '/', style: { color: '#969696' } },
    { text: 'CYPHER' },
  ], []);

  return (
    <>
      <Topbar
        title={<Link href="/" className={styles.titleLink}><TypewriterText segments={titleSegments} speed={80} /></Link>}
        className={styles.siteTopbar}
        actions={
          <a href="#" className={styles.devButton}>
            DEPLOY AGENTS
            <ArrowUpRight size={14} color="#969696" />
          </a>
        }
      />
      <nav className={styles.sideNav}>
        {menus.map((menu) => (
          <TopbarNavItem
            key={menu.id}
            config={menu}
            isOpen={openMenuId === menu.id}
            onMouseEnter={() => (menu.hasDropdown === false ? handleClose() : handleEnter(menu.id))}
            onMouseLeave={menu.hasDropdown === false ? handleClose : handleLeave}
            onClose={handleClose}
          />
        ))}
      </nav>
    </>
  );
}
