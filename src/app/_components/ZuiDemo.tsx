'use client';

import { useState, type ChangeEvent } from 'react';
import {
  Button,
  Input,
  Card,
  CardItem,
  Heading,
  Text,
  Badge,
  Toggle,
  Spinner,
} from '@cypher-asi/zui';
import styles from './ZuiDemo.module.css';

export function ZuiDemo() {
  const [inputValue, setInputValue] = useState('');
  const [toggled, setToggled] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className={styles.demo}>
      {/* Buttons */}
      <section className={styles.section}>
        <Heading level={3}>Button</Heading>
        <Text variant="secondary" size="sm">
          Primary, secondary, ghost, and danger variants.
        </Text>
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="filled">Filled</Button>
          <Button variant="glass">Glass</Button>
        </div>
        <div className={styles.row}>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="secondary" size="sm">Small</Button>
        </div>
      </section>

      {/* Input */}
      <section className={styles.section}>
        <Heading level={3}>Input</Heading>
        <Text variant="secondary" size="sm">
          Text input with controlled state.
        </Text>
        <div className={styles.fieldGroup}>
          <Input
            placeholder="Type something…"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          />
          <Input placeholder="Small input" size="sm" />
          <Input
            placeholder="With validation"
            validationMessage="This field has a note"
          />
        </div>
        {inputValue && (
          <Text variant="muted" size="xs">
            You typed: {inputValue}
          </Text>
        )}
      </section>

      {/* Toggle */}
      <section className={styles.section}>
        <Heading level={3}>Toggle</Heading>
        <Text variant="secondary" size="sm">
          Switch with label support.
        </Text>
        <div className={styles.row}>
          <Toggle
            label="Dark mode"
            checked={toggled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setToggled(e.target.checked)}
          />
          <Toggle label="Accent variant" variant="accent" defaultChecked />
          <Toggle label="Disabled" disabled />
        </div>
      </section>

      {/* Card */}
      <section className={styles.section}>
        <Heading level={3}>Card &amp; CardItem</Heading>
        <Text variant="secondary" size="sm">
          Layout container with composable card items.
        </Text>
        <Card>
          <CardItem
            title="Alpha Service"
            iconBadge="AS"
            meta="Deployed 2 hours ago"
            statusBadge={<Badge variant="running" pulse />}
            selected={selected === 'alpha'}
            onClick={() => setSelected(selected === 'alpha' ? null : 'alpha')}
          />
          <CardItem
            title="Beta Pipeline"
            iconBadge="BP"
            meta="Last run 15 min ago"
            statusBadge={<Badge variant="pending" />}
            selected={selected === 'beta'}
            onClick={() => setSelected(selected === 'beta' ? null : 'beta')}
          />
          <CardItem
            title="Gamma Worker"
            iconBadge="GW"
            meta="Stopped yesterday"
            statusBadge={<Badge variant="stopped" />}
            selected={selected === 'gamma'}
            onClick={() => setSelected(selected === 'gamma' ? null : 'gamma')}
          />
        </Card>
      </section>

      {/* Badge */}
      <section className={styles.section}>
        <Heading level={3}>Badge</Heading>
        <Text variant="secondary" size="sm">
          Status indicators with optional pulse animation.
        </Text>
        <div className={styles.row}>
          <span className={styles.badgeLabel}><Badge variant="running" pulse /> Running</span>
          <span className={styles.badgeLabel}><Badge variant="pending" /> Pending</span>
          <span className={styles.badgeLabel}><Badge variant="stopped" /> Stopped</span>
          <span className={styles.badgeLabel}><Badge variant="error" /> Error</span>
          <span className={styles.badgeLabel}><Badge variant="provisioning" pulse /> Provisioning</span>
        </div>
      </section>

      {/* Spinner */}
      <section className={styles.section}>
        <Heading level={3}>Spinner</Heading>
        <Text variant="secondary" size="sm">
          Loading indicator.
        </Text>
        <div className={styles.row}>
          <Spinner />
        </div>
      </section>

      {/* Typography */}
      <section className={styles.section}>
        <Heading level={3}>Typography</Heading>
        <Text variant="secondary" size="sm">
          Heading and Text components.
        </Text>
        <div className={styles.stack}>
          <Heading level={1}>Heading 1</Heading>
          <Heading level={2}>Heading 2</Heading>
          <Heading level={3}>Heading 3</Heading>
          <Heading level={4}>Heading 4</Heading>
          <Text variant="primary">Primary text—the default body style.</Text>
          <Text variant="secondary">Secondary text—used for supporting content.</Text>
          <Text variant="muted" size="sm">Muted small—captions and metadata.</Text>
        </div>
      </section>
    </div>
  );
}
