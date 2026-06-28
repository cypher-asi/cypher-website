// AUTO-GENERATED from the ZNS whitepaper draft. Do not edit by hand.
// Source: draft-zns-whitepaper.pdf (September 5, 2025)

import type { Block } from '../zero-os/content';

export type { Block };

export const abstract =
  "ZNS is an on-chain naming protocol that tokenizes hierarchical domain names as ERC-721 assets. The need for such a system to manage digital identity in a decentralized way that empowers the sovereignty of its users only rises as we progress into the modern era. Digital identity should be owned by individuals and communities, not loaned from platforms. Names, reputation, and provenance are the connective tissue of the internet, yet they are too often brittle, siloed, and subject to seemingly arbitrary policy shifts. A sovereign naming and identity substrate must be portable, censorship-resistant, and programmable so that identity can evolve without the risk of being confiscated. ZNS aims to be that substrate: a credibly neutral base layer where names are cryptographic assets, governance is explicit, and control resides with the holder. In a world of increasing dependency on centralized applications to provide digital identity, a cryptographic namespace gives users durable and verifiable ownership, along with the freedom to route around gatekeepers that have held them back for so long. We believe a protocol like ZNS is not just an engineering choice, but an architectural stance in favor of independence, self-custody, and user agency.";

export const blocks: Block[] = [
  {
    kind: 'h',
    num: '1.0',
    title: 'Introduction',
    id: 'sec-1-0-introduction',
  },
  {
    kind: 'p',
    text: "Names and identity are bound to the most fundamental part of humanity. They are how people discover one another, how software locates services, and how reputations accumulate over time. In today's digital landscape, however, most identifiers are rented from intermediaries. The thing that represents us can be revoked, reshaped, or stranded behind product pivots and opaque moderation.",
  },
  {
    kind: 'p',
    text: 'Relative to the existence of humans and society, the internet has existed for an extremely short time. It has, however, fundamentally reshaped human interaction, commerce, and information exchange. As this digital transformation accelerates, the need for robust, self-sovereign digital identities becomes increasingly paramount. Our economic and social lives increasingly depend on software-mediated interactions, and so the interface that binds identifiers to ownership, metadata, and policy must be rethought from first principles.',
  },
  {
    kind: 'p',
    text: "This paradigm of rented identity creates fragility and a lack of true ownership for users. When an identity is tied to a centralized platform, it is subject to the platform's whims, terms of service changes, and potential outages. This not only undermines individual sovereignty but also hinders the evolution of a truly decentralized and resilient digital ecosystem. The ability to control one's own digital presence, independent of any single entity, is critical for fostering trust, enabling seamless interoperability, and unlocking new forms of economic and social interaction in the digital realm.",
  },
  {
    kind: 'p',
    text: 'Zero Name Service (ZNS) proposes a naming and identity layer that treats names as key-controlled digital property, living directly on public ledgers that are specifically outside of the control of external entities. At its core, ZNS models a tree of names where each node can issue children, delegate rights, and carry records that point to addresses, services, and arbitrary metadata. Ownership of a name is a transferable token following the widely used non-fungible standard on EVM chains, bringing with it the full convenience of wallets, safes, multisigs, account abstraction, and marketplace tooling. This approach turns a label into something a user can truly hold, move, escrow, or recover, without seeking permission from any platform.',
  },
  {
    kind: 'h',
    num: '2.0',
    title: 'Goals',
    id: 'sec-2-0-goals',
  },
  {
    kind: 'p',
    text: 'Identity has shifted from static profiles to programmable relationships. Access control, membership, attestations, credentials, and routing now span many applications and evolve as roles change. A modern naming layer must therefore satisfy three properties:',
  },
  {
    kind: 'ol',
    items: [
      'Portability: Identities must be freely movable between applications and platforms without loss of data or functionality, ensuring user agency and preventing vendor lock-in.',
      'Censorship-Resistance: The system must be resilient to arbitrary takedowns or modifications by centralized entities, guaranteeing persistent and verifiable ownership.',
      "Resilience: It must allow policies and integrations to change over time without endangering the owner's authority.",
    ],
  },
  {
    kind: 'p',
    text: 'ZNS is engineered to address and fulfill these requirements. Its design philosophy prioritizes transparent rules, ensuring that the mechanisms governing identity resolution and interaction are openly auditable and understandable. By adhering to standard interfaces, ZNS promotes interoperability, facilitating seamless integration with a wide array of existing and future applications, and ultimately contributing to a more open, secure, and user-centric digital identity ecosystem.',
  },
  {
    kind: 'h',
    num: '3.0',
    title: 'Design Principles',
    id: 'sec-3-0-design-principles',
  },
  {
    kind: 'h',
    num: '3.1',
    title: 'Fundamentals',
    id: 'sec-3-1-fundamentals',
  },
  {
    kind: 'h',
    num: '3.1.1',
    title: 'Narrow Core',
    id: 'sec-3-1-1-narrow-core',
  },
  {
    kind: 'p',
    text: "ZNS separates ownership from policy and resolution. The registry maintains the canonical mapping from a name's hash to its owner, its resolver module, and its parent. This contract is intentionally small and conservative. It focuses on correct state transitions, inheritance of authority through the parent-child relationship, and clean handoffs to external modules. By reducing the core to its essentials, the protocol minimizes the surface area for special privileges and long-term maintenance risk.",
  },
  {
    kind: 'h',
    num: '3.1.2',
    title: 'Robust Adaptability',
    id: 'sec-3-1-2-robust-adaptability',
  },
  {
    kind: 'p',
    text: 'Creation, renewal, and revocation rules are handled by registrars, modular controllers that can encode any issuance mechanism a community desires. A root domain owner might use a conservative allocator for high-stakes names, while a community subtree could opt for open minting, mintlist campaigns, or pricing schedules that respond to demand. Because registrars are swap-in modules referenced by the registry, policy can evolve without migrating ownership or breaking the namespace.',
  },
  {
    kind: 'h',
    num: '3.1.3',
    title: 'Flexible Resolution',
    id: 'sec-3-1-3-flexible-resolution',
  },
  {
    kind: 'p',
    text: 'Resolvers map names to data: wallet addresses, service endpoints, profile fields, content identifiers, and application-specific keys. Different use cases can pick resolvers that fit their needs, from purely on-chain records to hybrid models that incorporate off-chain proofs. Importantly, updating a resolver does not alter ownership. This decoupling allows name holders to adopt new formats and richer integrations over time while preserving continuity.',
  },
  {
    kind: 'h',
    num: '3.1.4',
    title: 'Explicit Authority',
    id: 'sec-3-1-4-explicit-authority',
  },
  {
    kind: 'p',
    text: 'Where control needs to be shared—such as stewardship of a shared root—ZNS encodes roles in contracts rather than relying on convention or hidden levers. Who can do what, under which conditions, is visible and verifiable. Communities can choose their own oversight mechanisms: multisigs, time locks, token voting, or other arrangements. The emphasis is on legibility and auditability: power is documented in code, not inferred from trust.',
  },
  {
    kind: 'h',
    num: '3.2',
    title: 'Key Components',
    id: 'sec-3-2-key-components',
  },
  {
    kind: 'ol',
    items: [
      'Registry: the source of truth for ownership of a domain. It exposes minimal functions to change owners or set its resolvers, and is designed to be stable over time.',
      'Registrars: policy engines that control the rules of domain or subdomain creation and allow domain owners to manage their individual community rights.',
      'Resolvers: data mappers that translate names into useful data. Because resolver behavior is modular, new resolvers with richer profile formats or service discovery can be adopted without disrupting the namespace.',
      'Pricers: optional modules that route fees to maintainers, fund public goods, or support community initiatives. These pieces are opt-in and replaceable, reflecting the reality that different communities will choose different stewardship models.',
    ],
  },
  {
    kind: 'h',
    num: '3.3',
    title: 'Security and Resilience Posture',
    id: 'sec-3-3-security-and-resilience-posture',
  },
  {
    kind: 'ol',
    items: [
      'Ownership is key-bound: the same techniques that protect other digital property such as hardware wallets also apply to domains.',
      'Changes are on-chain and observable: transfers, delegation, and policy updates leave traceable history that clients and indexers can always monitor.',
      'Least privilege by default: the core avoids catch-all administrator roles. Where elevated permissions exist, they are tightly scoped, discoverable, and revocable under defined conditions.',
    ],
  },
  {
    kind: 'p',
    text: 'Our objective is pragmatic. We aim to provide a durable, minimal base that remains stable while enabling experimentation at the edges. By putting names directly under the control of their holders, documenting power in code, and leaning on open standards, ZNS offers a path to an identity layer that endures beyond any single organization or application.',
  },
  {
    kind: 'h',
    num: '4.0',
    title: 'Architecture Overview',
    id: 'sec-4-0-architecture-overview',
  },
  {
    kind: 'p',
    text: 'ZNS implements a modular architecture where ownership, policy, and resolution are cleanly separated into distinct but coordinating components. This separation allows the protocol to remain stable at its core while enabling flexible evolution at its edges. The architecture is designed around the principle that different aspects of domain management should be handled by specialized contracts that can evolve independently without disrupting the core ownership semantics.',
  },
  {
    kind: 'p',
    text: 'The modular approach provides several key advantages for both users and developers. Users benefit from stable ownership guarantees while gaining access to evolving features and integrations. Developers can build new resolver types, pricing models, and distribution mechanisms without requiring changes to the core registry. This flexibility enables ZNS to adapt to new use cases and technological developments while maintaining backward compatibility and preserving the integrity of existing domain ownership.',
  },
  {
    kind: 'h',
    num: '4.1',
    title: 'Core Components and Interaction',
    id: 'sec-4-1-core-components-and-interaction',
  },
  {
    kind: 'p',
    text: 'The system consists of several key components that work together to provide comprehensive naming services. Each component has a clearly defined role and interacts with others through well-established interfaces, ensuring that the system remains coherent while allowing for independent evolution of individual parts.',
  },
  {
    kind: 'ul',
    items: [
      'Registry: The foundational contract that maintains the canonical ownership mapping. It serves as the single source of truth for who owns which domain, which resolver handles data for that domain, and the hierarchical parent-child relationships. The Registry is intentionally minimal and stable, focusing solely on ownership state transitions and resolver assignments. This design ensures that the core ownership semantics remain consistent even as other parts of the system evolve.',
      'Domain Tokens: ERC-721 tokens that represent transferable rights to domains. These tokens synchronize with the Registry to ensure ownership consistency while enabling standard NFT operations like marketplace trading and escrow. The tokenization of domains brings ZNS into the broader NFT ecosystem, allowing users to leverage existing tooling for wallet management, marketplace transactions, and DeFi integrations while maintaining the security and permanence of on-chain ownership records.',
      'Registrars: Policy enforcement contracts that control how domains are created, renewed, and revoked. The Root Registrar handles top-level operations while the Sub Registrar manages subdomain distribution according to parent-defined rules. This dual-registrar architecture allows for different governance models at different levels of the hierarchy, enabling root-level stability while permitting flexible community-driven subdomain policies.',
      'Resolvers: Data mapping contracts that translate domain hashes to useful information like addresses, content hashes, or arbitrary key-value pairs. Multiple resolver types can coexist, allowing different use cases to choose appropriate data formats. The resolver system is designed for extensibility, enabling new data types and resolution mechanisms to be added without disrupting existing functionality or requiring changes to the core registry.',
      'Treasury: Payment processing and stake management system that handles both direct payments and staking models, routing fees to appropriate beneficiaries and managing collateral for revocable registrations. The Treasury supports multiple economic models, from simple direct payments to sophisticated staking mechanisms that enable revocable domain assignments and community funding models.',
      'Access Controller: Role-based permission system that governs administrative functions across all contracts, ensuring that sensitive operations are properly authorized. The Access Controller implements a hierarchical role system that allows for fine-grained permission management while maintaining clear lines of authority and accountability throughout the system.',
    ],
  },
  {
    kind: 'h',
    num: '4.2',
    title: 'Data Flow and Operations',
    id: 'sec-4-2-data-flow-and-operations',
  },
  {
    kind: 'p',
    text: 'Domain registration follows a coordinated flow across these components:',
  },
  {
    kind: 'ol',
    items: [
      'A user requests a domain through a Registrar, which validates the request against its configured policies (pricing, access controls, mintlists).',
      "The Treasury processes payment according to the parent domain's configuration, either collecting direct payment or holding stake that can be reclaimed on revocation.",
      'The Root Registrar coordinates with the Registry to record ownership and with the Domain Token contract to mint the corresponding NFT.',
      'The domain owner can configure a resolver to map their domain to addresses, content, or other data, and can set distribution policies for any subdomains they wish to offer.',
      'All ownership changes, policy updates, and resolution changes are recorded on-chain, providing transparent auditability and enabling indexers to maintain comprehensive views of the namespace.',
    ],
  },
  {
    kind: 'p',
    text: 'This architecture ensures that while the core ownership semantics remain simple and stable, the system can accommodate diverse community needs through configurable policies, pluggable pricing models, and flexible resolution mechanisms.',
  },
  {
    kind: 'h',
    num: '5.0',
    title: 'Use Cases and Examples',
    id: 'sec-5-0-use-cases-and-examples',
  },
  {
    kind: 'p',
    text: 'To illustrate how ZNS works in practice, consider these common scenarios:',
  },
  {
    kind: 'h',
    num: '5.1',
    title: 'Individual Name Registration',
    id: 'sec-5-1-individual-name-registration',
  },
  {
    kind: 'p',
    text: 'Alice wants to register 0://alice as her primary digital identity:',
  },
  {
    kind: 'ol',
    items: [
      'Alice connects her wallet to a ZNS interface and searches for 0://alice.',
      'The system queries the Root Registrar to check availability and pricing.',
      'Assuming 0://alice is available, Alice pays the registration fee set by Zero.',
      'The Root Registrar coordinates with Treasury to process payment, Registry to record ownership, and Domain Token to mint the NFT.',
      'Alice now owns the 0://alice domain as an ERC-721 token and can set it to resolve to her wallet address, social profiles, or other data.',
    ],
  },
  {
    kind: 'h',
    num: '5.2',
    title: 'Community Namespace Creation',
    id: 'sec-5-2-community-namespace-creation',
  },
  {
    kind: 'p',
    text: 'The 0://dao community wants to distribute subdomains to their members:',
  },
  {
    kind: 'ol',
    items: [
      'The DAO registers 0://dao as their root domain.',
      'They configure a distribution policy: mintlist-only access, fixed 0.01 ETH pricing for subdomains.',
      'Community members on the mintlist can register names like 0://dao.alice, 0://dao.bob.',
      'The DAO receives fees from subdomain registrations, funding their operations.',
      'Individual members own their subdomains as NFTs while the DAO retains control over the 0://dao namespace.',
    ],
  },
  {
    kind: 'h',
    num: '5.3',
    title: 'Service Integration',
    id: 'sec-5-3-service-integration',
  },
  {
    kind: 'p',
    text: 'A decentralized application wants to use ZNS names for user discovery:',
  },
  {
    kind: 'ol',
    items: [
      'Users register names like 0://alice and configure them to resolve to their wallet addresses.',
      'The application queries ZNS resolvers to translate names to addresses: 0://alice → 0x123…',
      'Users can send payments, messages, or interact using human-readable names instead of hex addresses.',
      'The application can maintain compatibility as users change their underlying wallet addresses by updating their ZNS resolution.',
    ],
  },
  {
    kind: 'h',
    num: '5.4',
    title: 'Controlled Domains',
    id: 'sec-5-4-controlled-domains',
  },
  {
    kind: 'p',
    text: 'ZNS controlled domains enable corporate-style identity management similar to how companies assign email addresses like alice@company.com. In this model, an organization maintains operational control while granting usage rights to individuals.',
  },
  {
    kind: 'p',
    text: 'Consider TechCorp, a technology company that wants to provide blockchain identities for their employees:',
  },
  {
    kind: 'ol',
    items: [
      'TechCorp registers 0://techcorp as their corporate root domain.',
      'For Alice, a new employee, TechCorp creates the subdomain 0://techcorp.alice.',
      "TechCorp transfers the domain token to Alice's personal wallet, making the domain \u201ccontrolled\u201d.",
      'Alice can now use 0://techcorp.alice for business transactions, signing contracts, and professional identity.',
      'Alice has full token rights: she can trade, lend, or use the name as collateral.',
      "However, TechCorp retains registry control: they can update resolvers, manage the domain's configuration, and revoke access if Alice leaves the company.",
      'If Alice changes roles, TechCorp can reassign the token to reflect new responsibilities while maintaining corporate oversight.',
      'When Alice eventually leaves TechCorp, the company can reclaim the domain by reassigning the token, similar to deactivating a corporate email address.',
    ],
  },
  {
    kind: 'p',
    text: "This controlled domain mechanism provides the best of both worlds: employees gain valuable, transferable digital assets while organizations maintain necessary administrative control. Unlike traditional corporate email that becomes worthless when you leave a company, the tokenized nature means Alice's 0://techcorp.alice domain has inherent value that could be negotiated as part of compensation packages or separation agreements.",
  },
  {
    kind: 'p',
    text: 'The system also enables sophisticated corporate structures, such as subsidiary relationships (0://techcorp.subsidiary.alice) or role-based identities (0://techcorp.engineering.alice), all while maintaining clear lines of authority and control.',
  },
  {
    kind: 'h',
    num: '6.0',
    title: 'System Architecture',
    id: 'sec-6-0-system-architecture',
  },
  {
    kind: 'p',
    text: 'ZNS implements a hierarchical naming system where each domain has a unique identifier generated from cryptographic hashes. The system is designed around several core principles: separation of ownership from policy, modular components that can evolve independently, and transparent on-chain governance.',
  },
  {
    kind: 'h',
    num: '6.1',
    title: 'Core System Components',
    id: 'sec-6-1-core-system-components',
  },
  {
    kind: 'h',
    num: '6.1.1',
    title: 'Registry and Domain Identification',
    id: 'sec-6-1-1-registry-and-domain-identification',
  },
  {
    kind: 'p',
    text: 'The ZNS Registry serves as the canonical source of truth for domain ownership and resolution. Each domain is identified by a unique hash:',
  },
  {
    kind: 'ul',
    items: [
      'Root domains: domainHash = keccak256(label)',
      'Subdomains: domainHash = keccak256(parentHash, label)',
    ],
  },
  {
    kind: 'p',
    text: 'This recursive hashing ensures that each domain at every level has a unique identifier while maintaining the hierarchical structure. Each registered name has a Registry record storing the owner address and resolver address.',
  },
  {
    kind: 'h',
    num: '6.1.2',
    title: 'Domain Tokens and Ownership',
    id: 'sec-6-1-2-domain-tokens-and-ownership',
  },
  {
    kind: 'p',
    text: 'Domain ownership is represented by ERC-721 tokens where tokenID = uint256(domainHash). This provides several benefits:',
  },
  {
    kind: 'ul',
    items: [
      'Standard wallet and marketplace compatibility',
      'Transparent ownership transfers',
      'Integration with DeFi protocols for lending and escrow',
      'Compatibility with existing NFT tooling and infrastructure',
    ],
  },
  {
    kind: 'p',
    text: 'By default, token transfers automatically update the Registry owner to maintain consistency. However, this behavior can be modified through the controlled domains mechanism.',
  },
  {
    kind: 'h',
    num: '6.1.3',
    title: 'Access Control and Governance',
    id: 'sec-6-1-3-access-control-and-governance',
  },
  {
    kind: 'p',
    text: 'The ZNSAccessController manages a role-based permission system:',
  },
  {
    kind: 'ul',
    items: [
      'GOVERNOR_ROLE: Highest privilege level for protocol upgrades and role management',
      'ADMIN_ROLE: Operational control over module configurations and registrar permissions',
      'REGISTRAR_ROLE: Authorization for domain registration and treasury operations',
      'DOMAIN_TOKEN_ROLE: Synchronization privileges between tokens and registry',
      'EXECUTOR_ROLE: Reserved for future functionality',
    ],
  },
  {
    kind: 'p',
    text: 'All business logic contracts inherit from AAccessControlled to enforce these permission boundaries. The system uses UUPS proxies for upgradeability on most contracts, with some core components remaining immutable for security.',
  },
  {
    kind: 'h',
    num: '6.2',
    title: 'Registration and Management Systems',
    id: 'sec-6-2-registration-and-management-systems',
  },
  {
    kind: 'h',
    num: '6.2.1',
    title: 'Registrar Architecture',
    id: 'sec-6-2-1-registrar-architecture',
  },
  {
    kind: 'p',
    text: 'Registration is handled by two coordinating contracts:',
  },
  {
    kind: 'ul',
    items: [
      'ZNSRootRegistrar: Orchestrates core registration flows, manages root domain registrations, finalizes subdomain registrations, and handles token assignment and revocation.',
      'ZNSSubRegistrar: Manages subdomain distribution policies, enforces access controls and pricing rules, and maintains mintlist configurations for restricted registrations.',
    ],
  },
  {
    kind: 'p',
    text: 'This separation allows root-level policies to remain stable while enabling flexible subdomain distribution mechanisms.',
  },
  {
    kind: 'h',
    num: '6.2.2',
    title: 'Treasury and Payment Processing',
    id: 'sec-6-2-2-treasury-and-payment-processing',
  },
  {
    kind: 'p',
    text: 'The ZNSTreasury handles financial operations and supports two payment models:',
  },
  {
    kind: 'ul',
    items: [
      'Direct payments: Immediate transfers to designated beneficiaries',
      'Stake-based payments: Refundable deposits held in escrow, enabling revocable registrations',
    ],
  },
  {
    kind: 'p',
    text: 'The Treasury maintains per-domain payment configurations and tracks staked amounts tied to registry ownership, not specific addresses.',
  },
  {
    kind: 'h',
    num: '6.2.3',
    title: 'Pricing and Distribution',
    id: 'sec-6-2-3-pricing-and-distribution',
  },
  {
    kind: 'p',
    text: 'ZNS uses pluggable pricing modules implementing the IZNSPricer interface:',
  },
  {
    kind: 'ul',
    items: [
      'ZNSCurvePricer: Implements hyperbolic pricing curves with configurable parameters for length-based pricing.',
      'ZNSFixedPricer: Simple constant pricing model.',
      'Custom pricers: Communities can deploy specialized pricing logic.',
    ],
  },
  {
    kind: 'p',
    text: 'Distribution policies are configured per-domain and govern subdomain registration:',
  },
  {
    kind: 'ul',
    items: [
      'PaymentType: DIRECT or STAKE',
      'AccessType: LOCKED, OPEN, or MINTLIST-restricted',
      'Pricing configuration: Encoded parameters for the selected pricer',
    ],
  },
  {
    kind: 'h',
    num: '6.3',
    title: 'Data Resolution and Storage Systems',
    id: 'sec-6-3-data-resolution-and-storage-systems',
  },
  {
    kind: 'h',
    num: '6.3.1',
    title: 'Resolver Architecture',
    id: 'sec-6-3-1-resolver-architecture',
  },
  {
    kind: 'p',
    text: 'ZNS uses a modular resolver system that separates name-to-data mapping from ownership:',
  },
  {
    kind: 'ul',
    items: [
      'ZNSAddressResolver: Maps domain hashes to Ethereum addresses (mapping(bytes32 => address)).',
      'ZNSStringResolver: Maps domain hashes to arbitrary strings (mapping(bytes32 => string)).',
      'Custom resolvers: Communities can deploy specialized resolvers for unique data types.',
    ],
  },
  {
    kind: 'p',
    text: 'The Registry maintains a mapping of resolver types to contract addresses (mapping(string resolverType => address resolver)), allowing administrators to register new resolver types and domains to select appropriate resolvers during registration.',
  },
  {
    kind: 'p',
    text: 'All resolvers support ERC-165 interface discovery and include administrative controls for registry updates. This modular approach enables new data formats and resolution mechanisms to be added without disrupting existing functionality.',
  },
  {
    kind: 'h',
    num: '6.3.2',
    title: 'Storage and State Management',
    id: 'sec-6-3-2-storage-and-state-management',
  },
  {
    kind: 'p',
    text: 'The system maintains several key data structures.',
  },
  {
    kind: 'p',
    text: 'Registry State:',
  },
  {
    kind: 'ul',
    items: [
      'records: Core ownership and resolver mapping (mapping(bytes32 domainHash => DomainRecord{owner, resolver})).',
      'operators: Delegation rights for domain management (mapping(owner => operator => bool)).',
      'resolvers: Available resolver type registry.',
    ],
  },
  {
    kind: 'p',
    text: 'Treasury State:',
  },
  {
    kind: 'ul',
    items: [
      'paymentConfigs: Per-domain payment settings (mapping(bytes32 domainHash => PaymentConfig{IERC20 token, address beneficiary})).',
      'stakedForDomain: Tracked stakes for revocable registrations (mapping(bytes32 domainHash => Stake{IERC20 token, uint256 amount})).',
    ],
  },
  {
    kind: 'p',
    text: 'SubRegistrar State:',
  },
  {
    kind: 'ul',
    items: [
      'distrConfigs: Per-parent distribution policies (mapping(bytes32 domainHash => DistributionConfig)).',
      'mintlist: Access control lists for restricted registrations.',
    ],
  },
  {
    kind: 'h',
    num: '6.4',
    title: 'Advanced Features and Mechanisms',
    id: 'sec-6-4-advanced-features-and-mechanisms',
  },
  {
    kind: 'h',
    num: '6.4.1',
    title: 'Controlled Domains',
    id: 'sec-6-4-1-controlled-domains',
  },
  {
    kind: 'p',
    text: 'ZNS introduces a novel controlled domain mechanism that allows separation of token ownership from registry control. When the registry owner and token owner differ, the domain becomes "controlled" (ZNSDomainToken.isControlled(domainHash) returns true).',
  },
  {
    kind: 'p',
    text: 'This enables several advanced use cases:',
  },
  {
    kind: 'ul',
    items: [
      'Delegation without transfer: Grant token rights while retaining operational control.',
      'Lending and collateralization: Use domains as collateral without losing management rights.',
      'Corporate structures: Separate beneficial ownership from operational management.',
    ],
  },
  {
    kind: 'p',
    text: 'In controlled state, only the Registry owner can reassign tokens, while token holders cannot initiate transfers. This provides fine-grained control over domain governance and economic rights.',
  },
  {
    kind: 'h',
    num: '6.4.2',
    title: 'Pricing Implementation Details',
    id: 'sec-6-4-2-pricing-implementation-details',
  },
  {
    kind: 'p',
    text: 'The pricing system supports multiple models through the IZNSPricer interface.',
  },
  {
    kind: 'p',
    text: 'Curve Pricing: The ZNSCurvePricer implements sophisticated length-based pricing using hyperbolic curves:',
  },
  {
    kind: 'ul',
    items: [
      'Short names (length ≤ baseLength): Fixed maximum price',
      'Long names (length ≥ maxLength): Clamped to minimum value',
      'Variable pricing: Hyperbolic function based on curveMultiplier and baseLength',
      'Precision control: Prices rounded to precisionMultiplier boundaries',
      'Fee calculation: Percentage-based fees for stake-based payments',
    ],
  },
  {
    kind: 'p',
    text: 'Fixed Pricing: The ZNSFixedPricer provides simple constant pricing with configurable fee percentages, suitable for communities wanting predictable costs.',
  },
  {
    kind: 'p',
    text: 'Validation and Safety: Both pricing models include comprehensive validation:',
  },
  {
    kind: 'ul',
    items: [
      'Parameter bounds checking (precisionMultiplier within valid range)',
      'Logical consistency (maxLength ≥ baseLength)',
      'Division by zero prevention',
      'Price floor enforcement',
    ],
  },
  {
    kind: 'h',
    num: '6.4.3',
    title: 'Payment Processing',
    id: 'sec-6-4-3-payment-processing',
  },
  {
    kind: 'p',
    text: 'The system supports two distinct payment models.',
  },
  {
    kind: 'p',
    text: 'Direct Payment Model:',
  },
  {
    kind: 'ol',
    items: [
      "Price calculation via parent's configured pricer",
      'Token approval by payer',
      "Direct transfer to parent's beneficiary plus protocol fees",
      'Immediate domain activation',
    ],
  },
  {
    kind: 'p',
    text: 'Stake-Based Model:',
  },
  {
    kind: 'ol',
    items: [
      'Price and fee calculation via pricer',
      'Extended approval for price + stakeFee + protocolFee',
      'Stake held in Treasury, fees distributed',
      'Revocation returns stake to current Registry owner (minus protocol fees)',
    ],
  },
  {
    kind: 'p',
    text: 'This dual-model approach accommodates both permanent purchases and revocable memberships, enabling diverse community structures and governance models.',
  },
  {
    kind: 'h',
    num: '7.0',
    title: 'Deployment',
    id: 'sec-7-0-deployment',
  },
  {
    kind: 'p',
    text: 'The ZNS contracts are deployed on Z Chain at the following addresses. Note that contracts without an implementation are not upgradeable.',
  },
  {
    kind: 'ol',
    items: [
      'ZNSAccessController — Proxy: 0x814B9d286FeF2E4CB854492f04BF58f123e47433',
      'ZNSRegistry — Proxy: 0x02e5B8e08BdcC6258ae0d7E0114E4dDE695aA6f7; Implementation: 0x961F88747B092ED10D30949eB15814A5431d7A00',
      'ZNSDomainToken — Proxy: 0xe2524b70c49C05b72845DDfd06257c45dB9b46bF; Implementation: 0x47A09eBEf86565Cb6b2418D7CC0E223a3F9633a6',
      'ZNSAddressResolver — Proxy: 0x4ce4f7E164e5f695f26CbBBcB712f86C024f9400; Implementation: 0xb3FeCD51B96fB56c7FCCf355fBc7537511b80AD3',
      'ZNSStringResolver — Proxy: 0x1122aEe2a5c763eb0E5955077fC5281DC407c2D1; Implementation: 0x569296Eb7DcC6E8F0faB17E9aA6513e6846fb3DF',
      'ZNSCurvePricer — Address: 0x5Ee4302CBED516B8BB34170Be3Ca9aDA82400448',
      'ZNSFixedPricer — Address: 0xBa5D3ad09360f10E56A2638CAEF14688Ca785c5A',
      'ZNSTreasury — Proxy: 0x2607F4dE725F0bA64850a1e47A93A05f29Bd8796; Implementation: 0xD3496Bd39E796F0b3D6D4E2b154F919ce4652050',
      'ZNSRootRegistrar — Proxy: 0x9C384560Ac294083cdA862979eFe3dABF0eF605a; Implementation: 0xF3a6eba83B42f810A385cfA726cC04e87223dc7B',
      'ZNSSubRegistrar — Proxy: 0x4E5A5c44A2b3AD02580128582d1F5Ff36482E550; Implementation: 0xCF15AD86D3D4C1000ED0Cf60f8cd796fEBc2b297',
    ],
  },
];
