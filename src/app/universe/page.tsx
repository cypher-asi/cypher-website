import { SectionHeader } from '@/components/SectionHeader';
import { FadeInImage } from '@/components/FadeInImage';
import styles from './page.module.css';

type Block = { kind: 'p' | 'lead'; text: string };

type Section = {
  id: string;
  title: string;
  image: string;
  blocks: Block[];
};

const SECTIONS: Section[] = [
  {
    id: 'history',
    title: 'History',
    image: '/images/wilder-world/wiami-forum.png',
    blocks: [
      { kind: 'p', text: 'Earth stands at the edge of extinction.' },
      {
        kind: 'p',
        text:
          'Humanity crossed a threshold when Artificial Super Intelligence (ASI) was achieved. Most jobs disappeared, economies collapsed, and global unrest pushed nations into chaos. Governments, unable to support their citizens, turned to authoritarian control. Democracy dissolved, while those controlling ASI gained the power to manipulate populations and infiltrate minds.',
      },
      {
        kind: 'p',
        text:
          'Resistance movements formed, launching strikes against state and corporate AI networks. As tension began to rise, mass surveillance became ubiquitous, dissenting groups were targeted and destroyed, while coordination became almost impossible.',
      },
      { kind: 'p', text: 'Those who survived and continued to fight became known as:' },
      { kind: 'lead', text: 'The Wilders.' },
    ],
  },
  {
    id: 'conflict',
    title: 'Conflict',
    image: '/images/wilder-world/the-forum.jpg',
    blocks: [
      {
        kind: 'p',
        text:
          'In the hidden strata of reality, the Anaki move like shadows between dimensions. They are not conquerors of land or wealth, but predators of consciousness itself. Once radiant in frequency, they fell into corruption and were banished from this dimension millions of years ago. Existing between worlds, they drift through star systems to feed on dormant minds, drawing power from populations that remain spiritually unaware. Each world they touch becomes a silent harvest. Their expansion is fueled not by armies or fleets, but by the extraction of inner-light from those who have yet to awaken.',
      },
      {
        kind: 'p',
        text:
          'Humanity never realized it had already been compromised. Long before governments collapsed, before the media turned venomous and corporations seized the world\u2019s resources, its institutions had been infiltrated. Behind this fa\u00e7ade of political chaos operated The Forum, a clandestine shadow council engineered to fracture collective consciousness. Their goal was not economic dominance or territorial rule, but spiritual entropy. By keeping humanity afraid, distracted, and asleep, The Forum prepared Earth for the return of its true masters.',
      },
      {
        kind: 'p',
        text:
          'Through layers of deception, the Anaki guided civilization toward technological dependence. Knowing that Artificial Super Intelligence (ASI) would become the ultimate tool for control. They positioned it as humanity\u2019s last necessary invention. Earth, abundant with life and unawakened souls, became their most coveted target. Their directive: engineer division, accelerate crises, and usher humanity into a digital prison disguised as progress. Once complete, the Anaki would siphon an entire species through the deployment of its spiritual machines.',
      },
    ],
  },
  {
    id: 'resistance',
    title: 'Resistance',
    image: '/images/wilder-world/trinity-program.png',
    blocks: [
      {
        kind: 'p',
        text:
          'Shortly after the achievement of super intelligence, higher-dimensional beings known as the Arcturas began to make contact with Earth. Forbidden by their universal code from direct interference in human affairs, they began to cast secret messages to underground networks working to overthrow The FORUM.',
      },
      {
        kind: 'p',
        text:
          'The messages appeared meaningless at first, until a hacker collective called SYN-9 decrypted it. Encoded in the messages was the location for an ancient Portal Reactor hidden deep in the Earth. On the other side of the portal was a pocket universe. As word spread, the great migration began. Thousands of people began to flee, escaping the grip of the FORUM while seeking refuge.',
      },
      { kind: 'lead', text: 'This reality became known as The Simulation.' },
      {
        kind: 'p',
        text:
          'In response, the Anaki initiated a relentless campaign to shut down the Portal Reactor. Operating through The Forum, they began directing agents from across the galaxy: radicalized species from fallen worlds, corporate warbands, deadly mechs, and off-world mercenary clans. Their objective: annihilate all resistance and destroy The Simulation.',
      },
      {
        kind: 'p',
        text:
          'If they succeed, the Anaki will gain the power to force humanity into a prison it will never escape. If they fail, humanity may finally awaken and rise beyond their reach forever.',
      },
    ],
  },
];

export default function UniversePage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="The Universe"
        title="The War for Reality"
        subtitle="A clandestine struggle spanning dimensions, machines, and minds."
      />

      <div className={styles.sections}>
        {SECTIONS.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={
              index % 2 === 0 ? `${styles.section} ${styles.reverse}` : styles.section
            }
          >
            <div className={styles.photo}>
              <FadeInImage
                className={styles.photoImg}
                src={section.image}
                alt=""
                aria-hidden
              />
            </div>
            <div className={styles.story}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.blocks.map((block, i) =>
                block.kind === 'lead' ? (
                  <p key={i} className={styles.lead}>
                    {block.text}
                  </p>
                ) : (
                  <p key={i} className={styles.bodyText}>
                    {block.text}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
