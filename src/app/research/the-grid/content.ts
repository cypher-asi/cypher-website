// THE GRID whitepaper. Sourced from the Grid Protocol whitepaper v0.6.0
// (../the-grid/docs/whitepaper/grid-protocol-whitepaper-v0.6.0.html).
//
// Inline markup: `code`, **bold**, *emphasis* (parsed by WhitepaperBody).

import type { Block } from '../zero-os/content';

export type { Block };

export const abstract: string[] = [
  'Global consensus is required only when multiple actors mutate shared, non-commutative state. Traditional blockchains impose global ordering across all state transitions, forcing unrelated computation to synchronize and replicate unnecessarily. This architecture introduces systemic coordination bottlenecks, state bloat, and artificial throughput ceilings driven by network-wide agreement rather than actual conflict density.',
  'THE GRID is a distributed verifiable execution environment that separates execution from coordination. ZODES form a peer-to-peer mesh where Programs and Services manage IO, zero-knowledge Proofs attest to valid state transitions, and storage Sectors persist ordered, encrypted state commitments. State is modeled as immutable objects or notes that are consumed and recreated, eliminating shared mutable balances and reducing contention to the specific assets involved in a transaction.',
  'A globally staked validator set is randomly assigned to conflict domains. Consensus is invoked only when transactions attempt to consume the same object or nullifier. Domain committees issue quorum-signed certificates that finalize state transitions, preventing double-spends without requiring network-wide ordering. Independent state evolves in parallel across Sectors, reducing coordination complexity from global agreement to domain-scoped validation.',
  'Higher-level Services compose over Proof-verified, certificate-finalized state, enabling scalable verifiable computation without inheriting blockchain-wide replication or fee-market constraints.',
];

export const blocks: Block[] = [
  { kind: 'h', num: '1.0', title: 'Introduction', id: 'sec-1-0-introduction' },
  {
    kind: 'p',
    text: 'The Grid is a peer-to-peer encrypted storage protocol. Participating nodes, called **ZODES**, form a network of program-scoped, append-only log stores. Clients encrypt all data locally before upload; ZODES store and serve only opaque ciphertext. The protocol has no consensus layer, no tokens, and no global state.',
  },
  {
    kind: 'p',
    text: 'Existing decentralized storage systems typically require participants to reach consensus on a shared ledger, introduce protocol-native tokens to incentivize storage providers, or maintain globally replicated state that every node must process. These design choices impose coordination overhead, economic complexity, and scalability ceilings that are unnecessary when the primary goal is simply to store and retrieve encrypted blobs. The Grid sidesteps these concerns entirely: a ZODE is a stateless relay that accepts ciphertext, appends it to a local log, and optionally gossips it to peers. There is no ordering protocol beyond append indexing, no fee market, and no finality mechanism. The result is a minimal, high-throughput substrate on which higher-level applications (identity registries, messaging channels, document stores) can be composed as *programs* without inheriting the weight of a full blockchain stack. A Services layer built atop this substrate provides a standard framework for stateless servers that use programs for persistent state and expose HTTP endpoints, supporting both native and sandboxed WASM runtimes.',
  },
  {
    kind: 'p',
    text: 'Cryptographic privacy is a first-class invariant rather than an optional feature. Every entry is encrypted client-side with either XChaCha20-Poly1305 or a ZK-friendly Poseidon sponge, and signatures are embedded inside the ciphertext so that ZODES can never observe authorship, content structure, or access patterns beyond coarse timing and payload size. Post-quantum resistance is likewise non-negotiable: all signing and key-agreement operations use hybrid constructions that pair classical algorithms (Ed25519, X25519) with their post-quantum counterparts (ML-DSA-65, ML-KEM-768), ensuring that an attacker must break both families simultaneously. This document defines the Grid protocol in implementation-neutral terms. Any conforming implementation, regardless of programming language, that follows the wire formats, cryptographic constructions, and behavioral rules described here can interoperate with any other conforming implementation.',
  },

  { kind: 'h', num: '2.0', title: 'Terminology', id: 'sec-2-0-terminology' },
  {
    kind: 'table',
    headers: ['Term', 'Definition'],
    rows: [
      ['**NeuralKey**', 'A 256-bit root secret from which all identity and machine keys are deterministically derived.'],
      ['**ZODE**', 'A storage node that participates in the Grid network. Identified by a libp2p PeerId, displayed with a `Zx` prefix. The prefix is display-only; wire and storage formats use the raw PeerId.'],
      ['**Client**', 'Any participant that connects to ZODES to store or retrieve data. A client does not serve requests.'],
      ['**Program**', 'A named, versioned application scope. All storage, subscriptions, and topic routing are scoped by program.'],
      ['**ProgramId**', 'A 32-byte identifier derived as `SHA-256(CBOR(ProgramDescriptor))`.'],
      ['**Sector**', 'An append-only log of encrypted entries identified by a `(ProgramId, SectorId)` pair.'],
      ['**SectorId**', 'An opaque 32-byte identifier. In the sector protocol, sector IDs MUST be exactly 32 bytes.'],
      ['**Entry**', 'A single encrypted blob appended to a sector log. Entries are indexed 0, 1, 2, …'],
      ['**SectorKey**', 'A random 256-bit symmetric key used to encrypt sector entries (§7).'],
      ['**Topic**', 'A GossipSub topic string of the form `prog/<program_id_hex>` (programs) or `svc/<service_id_hex>` (services).'],
      ['**Service**', 'An active, stateless process that runs on a ZODE, uses Programs for persistent state, and exposes HTTP endpoints. Contrast with Programs, which are passive descriptors.'],
      ['**ServiceId**', 'A 32-byte identifier derived as `SHA-256(CBOR(ServiceDescriptor))`.'],
      ['**ServiceDescriptor**', 'A CBOR map declaring a service’s name, version, required programs, and owned programs.'],
      ['**ProgramStore**', 'A key-value abstraction over sector append-logs provided to services. Keys map to SectorIds via `SHA-256(key)`; values are sector log entries.'],
    ],
  },

  { kind: 'h', num: '3.0', title: 'Serialization', id: 'sec-3-0-serialization' },
  {
    kind: 'p',
    text: 'All protocol messages, program descriptors, and gossip payloads use **CBOR** (RFC 8949) with deterministic encoding (RFC 8949 §4.2.1).',
  },
  {
    kind: 'p',
    text: 'Implementations MUST produce identical byte sequences for identical logical values. Field ordering within CBOR maps MUST be consistent. The canonical CBOR bytes are the input to all hash operations (ProgramId derivation, CID computation, etc.). Binary fields (payloads, keys, ciphertexts) are encoded as CBOR byte strings.',
  },

  { kind: 'h', num: '4.0', title: 'Cryptographic Identity', id: 'sec-4-0-cryptographic-identity' },

  { kind: 'h', num: '4.1', title: 'Key Hierarchy', id: 'sec-4-1-key-hierarchy' },
  { kind: 'p', text: 'All keys derive from a **NeuralKey**, a 256-bit secret generated by CSPRNG.' },
  {
    kind: 'code',
    text: `NeuralKey (256-bit CSPRNG)
|
+-- IdentitySigningKey (Ed25519 + ML-DSA-65)
|   Derived with: identity_id (16 bytes)
|
+-- MachineKeyPair (per device, per epoch)
    Derived with: identity_id, machine_id, epoch
    Contains:
    +-- Ed25519      (classical signing)
    +-- X25519       (classical key agreement)
    +-- ML-DSA-65    (post-quantum signing)
    +-- ML-KEM-768   (post-quantum encapsulation)`,
  },
  { kind: 'p', text: 'All four key types are always present in every MachineKeyPair. There is no classical-only mode.' },

  { kind: 'h', num: '4.2', title: 'Key Derivation', id: 'sec-4-2-key-derivation' },
  { kind: 'p', text: 'All derivation uses **HKDF-SHA256** with `salt = None` unless otherwise specified.' },
  { kind: 'p', text: '**Identity Signing Key.** Two separate derivations from the NeuralKey:' },
  {
    kind: 'table',
    headers: ['Component', 'HKDF info'],
    rows: [
      ['Ed25519 seed', '`"cypher:id:identity:v1" || identity_id`'],
      ['ML-DSA-65 seed', '`"cypher:id:identity:pq-sign:v1" || identity_id`'],
    ],
  },
  { kind: 'p', text: '**Machine Key Pair.** Two-level derivation. **Step 1**, machine seed:' },
  {
    kind: 'code',
    text: `machine_seed = HKDF-SHA256(
    ikm  = NeuralKey,
    info = "cypher:shared:machine:v1"
           || identity_id || machine_id
           || epoch_be_bytes
)`,
  },
  { kind: 'p', text: '**Step 2**, individual key seeds from machine seed:' },
  {
    kind: 'table',
    headers: ['Component', 'HKDF info'],
    rows: [
      ['Ed25519 signing', '`"cypher:shared:machine:sign:v1" || machine_id`'],
      ['X25519 encryption', '`"cypher:shared:machine:encrypt:v1" || machine_id`'],
      ['ML-DSA-65 signing', '`"cypher:shared:machine:pq-sign:v1" || machine_id`'],
      ['ML-KEM-768 encap', '`"cypher:shared:machine:pq-encrypt:v1" || machine_id`'],
    ],
  },
  {
    kind: 'p',
    text: 'ML-KEM-768 keys are generated deterministically: the PQ encrypt seed is expanded via HKDF into `d` (`"mlkem768:d"`) and `z` (`"mlkem768:z"`) parameters, which are passed to ML-KEM-768 deterministic key generation.',
  },

  { kind: 'h', num: '4.3', title: 'Machine Key Capabilities', id: 'sec-4-3-machine-key-capabilities' },
  { kind: 'p', text: 'Machine keys carry a bitflag:' },
  {
    kind: 'table',
    headers: ['Bit', 'Name', 'Value'],
    rows: [
      ['0', 'SIGN', '0x01'],
      ['1', 'ENCRYPT', '0x02'],
      ['2', 'STORE', '0x04'],
      ['3', 'FETCH', '0x08'],
    ],
  },
  { kind: 'p', text: 'Capabilities are metadata; enforcement is at the application/policy layer.' },

  { kind: 'h', num: '4.4', title: 'Hybrid Signatures', id: 'sec-4-4-hybrid-signatures' },
  { kind: 'p', text: 'A **HybridSignature** always contains both components:' },
  {
    kind: 'table',
    headers: ['Component', 'Size', 'Description'],
    rows: [
      ['Ed25519', '64 bytes', 'Classical signature'],
      ['ML-DSA-65', '3,309 bytes', 'Post-quantum signature'],
    ],
  },
  { kind: 'p', text: '**Binary format:** `ed25519_bytes (64) || ml_dsa_bytes (3309)`' },
  { kind: 'p', text: 'Both components sign the same message. **Both MUST verify** for the signature to be considered valid.' },

  { kind: 'h', num: '4.5', title: 'Hybrid Key Encapsulation', id: 'sec-4-5-hybrid-key-encapsulation' },
  { kind: 'p', text: 'Key agreement combines X25519 and ML-KEM-768:' },
  {
    kind: 'code',
    text: `x25519_ss = X25519(sender_secret,
                   recipient_public)
(mlkem_ct, mlkem_ss) =
    ML-KEM-768.Encapsulate(recipient_pk)

shared_secret = HKDF-SHA256(
    ikm  = x25519_ss || mlkem_ss,
    salt = None,
    info = "zid:encap:v1"
) -> 32 bytes`,
  },
  { kind: 'p', text: 'The output is a `SharedSecret` (32 bytes) and an `EncapBundle`:' },
  {
    kind: 'table',
    headers: ['Field', 'Size', 'Description'],
    rows: [
      ['`x25519_public`', '32 bytes', 'Sender’s static X25519 public key'],
      ['`mlkem_ciphertext`', '1,088 bytes', 'ML-KEM-768 ciphertext'],
    ],
  },
  { kind: 'p', text: 'An attacker must break **both** X25519 and ML-KEM-768 to recover the shared secret.' },

  { kind: 'h', num: '4.6', title: 'DID Encoding', id: 'sec-4-6-did-encoding' },
  {
    kind: 'p',
    text: 'Ed25519 public keys are encoded as `did:key` identifiers: `did:key:z` + `base58btc(0xed01 || ed25519_public_key_bytes)`. The multicodec prefix `0xed01` identifies Ed25519 public keys.',
  },

  { kind: 'h', num: '4.7', title: 'Shamir Secret Sharing', id: 'sec-4-7-shamir-secret-sharing' },
  {
    kind: 'p',
    text: 'The NeuralKey MAY be split into Shamir shares for backup and recovery. **Split**: `split(secret[32], total, threshold, rng)`. **Combine**: `combine(shares[≥ threshold])`. Each share is serialized as hex: `hex(index_byte || share_data)`.',
  },
  {
    kind: 'p',
    text: 'Identity generation, signing, and machine key derivation can all operate by **ephemerally reconstructing** the NeuralKey from shares, performing the operation, and immediately zeroizing the secret.',
  },

  { kind: 'h', num: '5.0', title: 'Programs', id: 'sec-5-0-programs' },
  {
    kind: 'p',
    text: 'A **Program** is the fundamental organizational unit of the Grid. It defines a named, versioned data scope: all storage, subscriptions, topic routing, and encryption policy are scoped by program. Programs are passive descriptors: they specify *what* data looks like, not how to process it.',
  },

  { kind: 'h', num: '5.1', title: 'ProgramDescriptor', id: 'sec-5-1-programdescriptor' },
  { kind: 'p', text: 'A CBOR map with at minimum:' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`name`', 'text string', 'Short program name'],
      ['`version`', 'unsigned integer (u32)', 'Program version number'],
      ['`proof_required`', 'boolean', 'Whether Valid-Sector proofs are required'],
      ['`proof_system`', 'optional ProofSystem', '`None` → XChaCha20-Poly1305; `Groth16` → Poseidon sponge + shape proofs (§7, §8)'],
    ],
  },
  {
    kind: 'p',
    text: 'Program-specific descriptors MAY add additional fields. Two implementations that serialize the same descriptor fields to CBOR MUST produce the same ProgramId.',
  },

  { kind: 'h', num: '5.2', title: 'ProgramId', id: 'sec-5-2-programid' },
  { kind: 'p', text: 'A 32-byte value:' },
  { kind: 'code', text: 'ProgramId = SHA-256(CBOR(ProgramDescriptor))' },
  { kind: 'p', text: 'Displayed as 64 lowercase hex characters.' },

  { kind: 'h', num: '5.3', title: 'ZID (Zero Identity)', id: 'sec-5-3-zid' },
  {
    kind: 'table',
    headers: ['Field', 'Value'],
    rows: [
      ['`name`', '`"zid"`'],
      ['`version`', '`1`'],
      ['`proof_required`', '`false`'],
    ],
  },
  {
    kind: 'p',
    text: '**ZidMessage:** `owner_did` (text), `display_name` (optional text), `timestamp_ms` (uint64), `signature` (PQ-hybrid, §7.7).',
  },

  { kind: 'h', num: '5.4', title: 'Interlink', id: 'sec-5-4-interlink' },
  { kind: 'p', text: '**v2 Descriptor (current default):**' },
  {
    kind: 'table',
    headers: ['Field', 'Value'],
    rows: [
      ['`name`', '`"interlink"`'],
      ['`version`', '`2`'],
      ['`proof_required`', '`true`'],
      ['`proof_system`', '`Groth16`'],
    ],
  },
  {
    kind: 'p',
    text: '**ZMessage:** `sender_did`, `channel_id`, `content` (UTF-8), `timestamp_ms`, `signature`. Maximum encoded message size: 64 KB.',
  },
  { kind: 'p', text: '**Channel-to-sector mapping:**' },
  {
    kind: 'code',
    text: `SectorId = SHA-256("interlink/channel/"
                   || channel_id_bytes)`,
  },
  { kind: 'p', text: 'ZID (v1) and Interlink (v2) are **default programs**: ZODES subscribe to them automatically.' },

  { kind: 'h', num: '6.0', title: 'Sectors & Storage', id: 'sec-6-0-sectors-storage' },
  {
    kind: 'p',
    text: 'Within a program, data is organized into **sectors**, append-only logs of encrypted entries. A sector is identified by a `(ProgramId, SectorId)` pair.',
  },

  { kind: 'h', num: '6.1', title: 'SectorId', id: 'sec-6-1-sectorid' },
  {
    kind: 'p',
    text: 'An opaque 32-byte identifier. In the sector protocol, sector IDs MUST be exactly 32 bytes. ZODES MUST reject requests with non-32-byte sector IDs. Displayed as lowercase hex.',
  },

  { kind: 'h', num: '6.2', title: 'Cid (Content Identifier)', id: 'sec-6-2-cid' },
  { kind: 'code', text: 'Cid = SHA-256(ciphertext)' },
  {
    kind: 'p',
    text: 'A 32-byte content-addressed identifier derived from the stored ciphertext. Displayed as 64 lowercase hex characters.',
  },

  { kind: 'h', num: '6.3', title: 'Append-Only Logs', id: 'sec-6-3-append-only-logs' },
  { kind: 'p', text: 'Each sector is an ordered sequence of entries indexed starting at 0.' },

  { kind: 'h', num: '6.4', title: 'Key Layout', id: 'sec-6-4-key-layout' },
  {
    kind: 'code',
    text: `key = program_id (32 B) || sector_id (32 B)
   || index (8 B, big-endian)`,
  },
  { kind: 'p', text: 'Total key size: 72 bytes.' },

  { kind: 'h', num: '6.5', title: 'Operations', id: 'sec-6-5-operations' },
  {
    kind: 'table',
    headers: ['Operation', 'Behavior'],
    rows: [
      ['**append**', 'Reverse-seek to find max index, write at `max + 1`'],
      ['**insert_at**', 'Write at specific index if unoccupied (idempotent)'],
      ['**read_log**', 'Forward-iterate from `from_index`, return up to `max_entries`'],
      ['**log_length**', 'Reverse-seek to find max index + 1 (0 if empty)'],
    ],
  },

  { kind: 'h', num: '6.6', title: 'Policy Enforcement', id: 'sec-6-6-policy-enforcement' },
  {
    kind: 'table',
    headers: ['Policy', 'Description'],
    rows: [
      ['Program allowlist', 'Only serve programs in effective topic set. Reject: `PolicyReject`.'],
      ['Sector filter', 'Optionally restrict to explicit sector ID set.'],
      ['Entry size limit', 'Max 256 KB per entry. Reject: `InvalidPayload`.'],
      ['Batch limits', 'Max 64 entries, 4 MB total. Reject: `BatchTooLarge`.'],
      ['Shape proof', 'Verify `ShapeProof` when `proof_system = Groth16`. Reject: `ProofInvalid`.'],
      ['Per-program quota', 'Optional max bytes per program.'],
    ],
  },

  { kind: 'h', num: '7.0', title: 'Encryption & Signing', id: 'sec-7-0-encryption-signing' },
  {
    kind: 'p',
    text: 'Data in sectors is protected by two complementary mechanisms: encryption ensures confidentiality; signing provides authenticity and integrity. Both happen client-side; ZODES never see plaintext.',
  },

  { kind: 'h', num: '7.1', title: 'SectorKey', id: 'sec-7-1-sectorkey' },
  {
    kind: 'p',
    text: 'A SectorKey is a random 256-bit symmetric key generated via CSPRNG. Key wrapping (§7.5) is unchanged regardless of encryption algorithm.',
  },

  { kind: 'h', num: '7.2', title: 'XChaCha20-Poly1305', id: 'sec-7-2-xchacha20-poly1305' },
  { kind: 'code', text: 'sealed = nonce (24 bytes) || ciphertext || tag (16 bytes)' },
  {
    kind: 'p',
    text: '**Nonce:** 192-bit, randomly generated per encryption. **AAD:** `program_id (32) || sector_id (32)`, binding ciphertext to its program and sector.',
  },

  { kind: 'h', num: '7.3', title: 'Poseidon Sponge', id: 'sec-7-3-poseidon-sponge' },
  { kind: 'p', text: '**Parameters:** BN254 scalar field, rate=2, capacity=1.' },
  {
    kind: 'code',
    text: `sealed = nonce (32 bytes)
      || ciphertext_elements (32 bytes each)
      || tag (32 bytes)`,
  },
  {
    kind: 'ul',
    items: [
      '**Nonce:** 256-bit, randomly generated per encryption.',
      '**AAD:** `program_id || sector_id` absorbed into the sponge before the plaintext.',
      '**Field element packing:** Plaintext is split into chunks of 30 data bytes. Each chunk is packed into a 32-byte field element as `[1-byte length][up to 30 bytes data][zero-pad]`.',
      '**Duplex mode:** The sponge absorbs key, nonce, and AAD elements. For each rate-sized chunk it squeezes keystream, adds to plaintext to produce ciphertext, then absorbs plaintext.',
      '**Tag:** Final 32-byte squeeze authenticates the entire encryption.',
    ],
  },
  {
    kind: 'p',
    text: 'The choice of algorithm is per-program via `proof_system` in the ProgramDescriptor (§5.1): `None` uses XChaCha20-Poly1305; `Groth16` uses Poseidon sponge (required for shape proofs, §8).',
  },

  { kind: 'h', num: '7.4', title: 'Padding', id: 'sec-7-4-padding' },
  {
    kind: 'p',
    text: 'Before encryption, content MUST be padded to fixed-size buckets to resist payload-size analysis. Buckets grow in 2× progression:',
  },
  {
    kind: 'table',
    headers: ['Content size (incl. 4-byte prefix)', 'Padded to'],
    rows: [
      ['0 – 256 B', '256 B'],
      ['257 – 512 B', '512 B'],
      ['513 – 1,024 B', '1 KB'],
      ['1,025 – 2,048 B', '2 KB'],
      ['2,049 – 4,096 B', '4 KB'],
      ['4,097 – 8,192 B', '8 KB'],
      ['8,193 – 16,384 B', '16 KB'],
      ['16,385 – 32,768 B', '32 KB'],
      ['32,769 – 65,536 B', '64 KB'],
      ['65,537 – 131,072 B', '128 KB'],
      ['131,073 – 262,144 B', '256 KB'],
      ['> 262,144 B', 'Next 256 KB multiple'],
    ],
  },
  { kind: 'p', text: '**Padding format:**' },
  {
    kind: 'code',
    text: `padded = content_length (4 bytes, LE)
      || content
      || 0x00 * (bucket_size - 4 - content_length)`,
  },

  { kind: 'h', num: '7.5', title: 'Key Wrapping', id: 'sec-7-5-key-wrapping' },
  {
    kind: 'p',
    text: '**Step 1, Hybrid key agreement:** between sender’s MachineKeyPair and the recipient’s MachinePublicKey using §4.5, producing a `SharedSecret` and `EncapBundle`.',
  },
  { kind: 'p', text: '**Step 2, Context-bound wrapping:**' },
  {
    kind: 'code',
    text: `wrap_key = HKDF-SHA256(
    ikm  = SharedSecret,
    salt = None,
    info = "grid:sector-key-wrap:v1"
           || program_id || sector_id
)

wrapped_sector_key = XChaCha20-Poly1305(
    key       = wrap_key,
    nonce     = random 192-bit,
    plaintext = sector_key_bytes
)`,
  },
  { kind: 'p', text: 'The result is a **KeyEnvelopeEntry**:' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`recipient_did`', 'text', '`did:key` of recipient'],
      ['`sender_x25519_public`', 'bytes', 'Sender’s X25519 public key (32 B)'],
      ['`mlkem_ciphertext`', 'bytes', 'ML-KEM-768 ciphertext (1,088 B)'],
      ['`wrapped_key`', 'bytes', '`nonce(24) || enc_key(32) || tag(16)` = 72 B'],
    ],
  },

  { kind: 'h', num: '7.6', title: 'Sector ID Derivation', id: 'sec-7-6-sector-id-derivation' },
  { kind: 'p', text: 'For metadata-private storage, sector IDs are derived client-side via two-step HKDF:' },
  {
    kind: 'code',
    text: `derivation_key = HKDF-SHA256(
    ikm=shared_secret,
    salt="grid:sector:v1",
    info="grid:sector:derive-key:v1")

sector_id = HKDF-SHA256(
    ikm=derivation_key,
    salt="grid:sector:v1",
    info=<application-defined string>)`,
  },
  {
    kind: 'p',
    text: 'The intermediate derivation key MUST be zeroized after use. Info string convention: `"grid:{program}:{purpose}:{...fields}"`.',
  },
  {
    kind: 'p',
    text: '**Properties:** Deterministic (same secret + info → same sector ID), Unlinkable (different info strings → unrelated IDs), Collision-resistant (32-byte HKDF output).',
  },

  { kind: 'h', num: '7.7', title: 'Message Signing', id: 'sec-7-7-message-signing' },
  {
    kind: 'p',
    text: 'Signatures provide authenticity and integrity for entries within the encrypted blob. They are PQ-hybrid (Ed25519 + ML-DSA-65) and are produced before encryption, verified after decryption. Signatures live **inside** the encrypted payload; the ZODE never sees them.',
  },

  { kind: 'h', num: '7.8', title: 'Signable Bytes', id: 'sec-7-8-signable-bytes' },
  {
    kind: 'code',
    text: `signable_bytes = canonical_cbor(
    all_fields_except_signature)`,
  },
  { kind: 'p', text: 'Fields MUST be serialized in deterministic CBOR order.' },

  { kind: 'h', num: '7.9', title: 'HybridSignature Format', id: 'sec-7-9-hybridsignature-format' },
  {
    kind: 'p',
    text: '`Ed25519 (64) || ML-DSA-65 (3309)` = 3,373 bytes total. Both components sign the same `signable_bytes`. **Both MUST verify.**',
  },

  { kind: 'h', num: '7.10', title: 'Signing and Verification Flow', id: 'sec-7-10-signing-verification-flow' },
  {
    kind: 'ol',
    items: [
      '**Signing:** Client computes `signable_bytes`, signs with both algorithms, appends signature, then encrypts.',
      '**Verification:** Recipient decrypts, recomputes `signable_bytes`, verifies both Ed25519 and ML-DSA-65.',
    ],
  },

  { kind: 'h', num: '7.11', title: 'Ed25519-Only Fallback (v1)', id: 'sec-7-11-ed25519-only-fallback' },
  { kind: 'p', text: 'For v1 compatibility, programs MAY support Ed25519-only signatures (64 bytes).' },

  { kind: 'h', num: '8.0', title: 'Shape Proofs', id: 'sec-8-0-shape-proofs' },
  {
    kind: 'p',
    text: 'Shape proofs allow clients to prove that an encrypted blob conforms to a declared schema without revealing plaintext. Programs with `proof_system = Groth16` use Poseidon sponge encryption (§7.3) and MAY attach a shape proof to each entry.',
  },

  { kind: 'h', num: '8.1', title: 'ProofSystem Enum', id: 'sec-8-1-proofsystem-enum' },
  {
    kind: 'table',
    headers: ['Variant', 'Encryption', 'Shape proofs'],
    rows: [
      ['`None`', 'XChaCha20-Poly1305', 'Not supported'],
      ['`Groth16`', 'Poseidon sponge', 'Supported'],
    ],
  },

  { kind: 'h', num: '8.2', title: 'FieldSchema', id: 'sec-8-2-fieldschema' },
  {
    kind: 'p',
    text: 'Message structure is described by a **FieldSchema**: a sequence of `FieldDef` (named field + `CborType`).',
  },
  { kind: 'code', text: 'schema_hash = SHA-256(canonical_cbor(schema))' },

  { kind: 'h', num: '8.3', title: 'ShapeProof Wire Format', id: 'sec-8-3-shapeproof-wire-format' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`proof_system`', 'ProofSystem', '`Groth16`'],
      ['`ciphertext_hash`', 'bytes(32)', 'Poseidon(C)'],
      ['`proof_bytes`', 'byte string', 'Groth16 proof'],
      ['`schema_hash`', 'bytes(32)', 'SHA-256 of schema'],
      ['`size_bucket`', 'uint32', 'Circuit bucket size'],
    ],
  },

  { kind: 'h', num: '8.4', title: 'Universal Circuit', id: 'sec-8-4-universal-circuit' },
  { kind: 'p', text: 'The shape-proof circuit proves three predicates:' },
  {
    kind: 'ol',
    items: [
      '**shape(B)**: Plaintext B conforms to the FieldSchema.',
      '**Poseidon_encrypt(B, K, N, AAD) = C**: Ciphertext C is the correct encryption.',
      '**Poseidon(C) = ciphertext_hash**: Public hash matches.',
    ],
  },

  { kind: 'h', num: '8.5', title: 'Strong Binding', id: 'sec-8-5-strong-binding' },
  {
    kind: 'p',
    text: 'The ZODE computes `Poseidon(received_ciphertext)` and MUST verify it equals the attested `ciphertext_hash`.',
  },

  { kind: 'h', num: '8.6', title: 'Message-Size Buckets', id: 'sec-8-6-message-size-buckets' },
  {
    kind: 'table',
    headers: ['Bucket', 'Max size'],
    rows: [
      ['1 KB', '1,024 bytes'],
      ['4 KB', '4,096 bytes'],
      ['16 KB', '16,384 bytes'],
      ['64 KB', '65,536 bytes'],
    ],
  },
  {
    kind: 'p',
    text: '**Version 1:** Only 1 KB and 4 KB buckets are supported. One (pk, vk) pair per bucket; setup is program-agnostic.',
  },

  { kind: 'h', num: '8.7', title: 'Verification Rules', id: 'sec-8-7-verification-rules' },
  {
    kind: 'ol',
    items: [
      'Groth16 proof verifies against vk for the declared `size_bucket`.',
      '`Poseidon(received_ciphertext) == ciphertext_hash`.',
      '`schema_hash` matches the program’s declared schema.',
      'Entry size (post-padding) fits within `size_bucket`.',
    ],
  },

  { kind: 'h', num: '9.0', title: 'Networking', id: 'sec-9-0-networking' },

  { kind: 'h', num: '9.1', title: 'ZODE ID', id: 'sec-9-1-zode-id' },
  {
    kind: 'p',
    text: 'A libp2p PeerId. On the wire and in storage, the raw PeerId bytes are used. For human display, the canonical format is `Zx<PeerId_string>`. The `Zx` prefix MUST NOT appear in wire formats.',
  },

  { kind: 'h', num: '9.2', title: 'Topic Naming', id: 'sec-9-2-topic-naming' },
  {
    kind: 'p',
    text: 'Programs use topics of the form `prog/<program_id_hex>` where `program_id_hex` is the 64-char lowercase hex encoding of the 32-byte ProgramId. ZODES subscribe to one or more topics and only accept requests for subscribed programs. Services use topics of the form `svc/<service_id_hex>` for peer discovery.',
  },

  { kind: 'h', num: '9.3', title: 'Connection', id: 'sec-9-3-connection' },
  { kind: 'p', text: 'The Grid uses **libp2p** with the following transports:' },
  {
    kind: 'ul',
    items: [
      '**QUIC** (`/quic-v1`): Primary transport.',
      '**TCP + Noise + Yamux**: Fallback transport.',
    ],
  },
  { kind: 'p', text: 'Default listen address: `/ip4/0.0.0.0/udp/3690/quic-v1`.' },

  { kind: 'h', num: '9.4', title: 'Protocols', id: 'sec-9-4-protocols' },
  {
    kind: 'table',
    headers: ['Protocol String', 'Type', 'Purpose'],
    rows: [
      ['`/grid/sector/1.0.0`', 'Request-response', 'Client ↔ ZODE sector ops'],
      ['`/grid/kad/1.0.0`', 'Kademlia DHT', 'Peer discovery'],
      ['GossipSub', 'Pub/sub', 'Data propagation'],
      ['HTTP (`/services/`)', 'Request-response', 'Service endpoints (§12)'],
    ],
  },

  { kind: 'h', num: '9.5', title: 'GossipSub Configuration', id: 'sec-9-5-gossipsub-configuration' },
  {
    kind: 'p',
    text: 'Message authentication: signed (libp2p keypair). Heartbeat interval: 10 s. Validation mode: permissive. Message ID: hash of message data (content-based dedup).',
  },

  { kind: 'h', num: '9.6', title: 'Peer Discovery', id: 'sec-9-6-peer-discovery' },
  {
    kind: 'p',
    text: 'ZODES accept bootstrap peer multiaddrs in configuration. On startup, the ZODE dials each bootstrap peer. When Kademlia is enabled, the ZODE seeds the routing table, triggers initial `bootstrap()`, and periodically performs random walk queries (default: 30 s interval).',
  },
  {
    kind: 'table',
    headers: ['Parameter', 'Default'],
    rows: [
      ['Protocol name', '`/grid/kad/1.0.0`'],
      ['Query timeout', '60 s'],
      ['Mode', 'Server (ZODES) / Client (SDK)'],
      ['Random walk interval', '30 s'],
      ['Max concurrent dials', '8'],
    ],
  },

  { kind: 'h', num: '10.0', title: 'Wire Protocol', id: 'sec-10-0-wire-protocol' },
  {
    kind: 'p',
    text: 'The sector protocol is the primary client-to-ZODE interface, operating over `/grid/sector/1.0.0`.',
  },

  { kind: 'h', num: '10.1', title: 'Request Envelope', id: 'sec-10-1-request-envelope' },
  {
    kind: 'code',
    text: `SectorRequest = Append(SectorAppendRequest)
  | ReadLog(SectorReadLogRequest)
  | LogLength(SectorLogLengthRequest)
  | BatchAppend(SectorBatchAppendRequest)
  | BatchLogLength(SectorBatchLogLengthRequest)`,
  },

  { kind: 'h', num: '10.2', title: 'Response Envelope', id: 'sec-10-2-response-envelope' },
  { kind: 'p', text: 'Response variants correspond 1:1 to request variants.' },

  { kind: 'h', num: '10.3', title: 'Append', id: 'sec-10-3-append' },
  { kind: 'p', text: '**Request:**' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`program_id`', 'bytes(32)', 'Target program'],
      ['`sector_id`', 'bytes(32)', 'Target sector'],
      ['`entry`', 'byte string', 'Encrypted payload'],
      ['`shape_proof`', 'optional', 'ShapeProof (§8)'],
    ],
  },
  { kind: 'p', text: '**Response:** `ok` (boolean), `index` (optional uint64), `error_code` (optional).' },

  { kind: 'h', num: '10.4', title: 'ReadLog', id: 'sec-10-4-readlog' },
  {
    kind: 'p',
    text: '**Request:** `program_id`, `sector_id`, `from_index` (uint64), `max_entries` (uint32, capped at 64). **Response:** `entries` (array of byte strings), `error_code` (optional). Empty array if sector does not exist.',
  },

  { kind: 'h', num: '10.5', title: 'LogLength', id: 'sec-10-5-loglength' },
  {
    kind: 'p',
    text: '**Request:** `program_id`, `sector_id`. **Response:** `length` (uint64), `error_code` (optional).',
  },

  { kind: 'h', num: '10.6', title: 'BatchAppend', id: 'sec-10-6-batchappend' },
  {
    kind: 'p',
    text: '**Request:** `program_id`, `entries` (array of `BatchAppendEntry`, up to 64). Each entry: `sector_id`, `entry`, optional `shape_proof`. **Response:** `results` (array of `AppendResult`: `ok`, `index`, `error_code`).',
  },

  { kind: 'h', num: '10.7', title: 'BatchLogLength', id: 'sec-10-7-batchloglength' },
  {
    kind: 'p',
    text: '**Request:** `program_id`, `sector_ids` (array of bytes(32), up to 64). **Response:** `results` (array of `LogLengthResult`: `length`, `error_code`).',
  },

  { kind: 'h', num: '10.8', title: 'Batch Limits', id: 'sec-10-8-batch-limits' },
  {
    kind: 'p',
    text: 'Maximum **64 entries** and **4 MB total payload** per batch. ZODES MUST reject with `BatchTooLarge`.',
  },

  { kind: 'h', num: '10.9', title: 'Error Codes', id: 'sec-10-9-error-codes' },
  {
    kind: 'table',
    headers: ['Code', 'Meaning'],
    rows: [
      ['`StorageFull`', 'Storage capacity exceeded'],
      ['`ProofInvalid`', 'Shape proof verification failed'],
      ['`PolicyReject`', 'Policy violation'],
      ['`NotFound`', 'Data not present'],
      ['`InvalidPayload`', 'Malformed request or oversized entry'],
      ['`ProgramMismatch`', 'Wrong program for subscription'],
      ['`SlotOccupied`', 'Reserved (write-once)'],
      ['`BatchTooLarge`', 'Batch limits exceeded'],
      ['`ConditionFailed`', 'Reserved (conditional write)'],
    ],
  },
  { kind: 'p', text: 'Error codes are serialized as CBOR text strings.' },

  { kind: 'h', num: '11.0', title: 'Gossip Replication', id: 'sec-11-0-gossip-replication' },
  {
    kind: 'p',
    text: 'When a ZODE accepts an `Append` request, it publishes a `GossipSectorAppend` message to the program’s GossipSub topic. Other subscribed ZODES store the entry automatically.',
  },

  { kind: 'h', num: '11.1', title: 'GossipSectorAppend', id: 'sec-11-1-gossipsectorappend' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`program_id`', 'bytes(32)', 'Program'],
      ['`sector_id`', 'bytes(32)', 'Sector'],
      ['`index`', 'uint64', 'Assigned log index'],
      ['`payload`', 'byte string', 'Encrypted entry'],
      ['`shape_proof`', 'optional', 'ShapeProof (§8)'],
    ],
  },

  { kind: 'h', num: '11.2', title: 'Receiving ZODE Behavior', id: 'sec-11-2-receiving-zode-behavior' },
  {
    kind: 'ol',
    items: [
      '**Program check:** Discard if not serving `program_id`.',
      '**Sector filter:** Check allowlist if configured.',
      '**Entry size check:** Discard if oversized.',
      '**Shape proof:** Verify if required; discard on failure.',
      '**Idempotent insert:** Store at given index if unoccupied; silently ignore byte-identical duplicates; on conflict, append at next available index.',
      '**No re-gossip:** GossipSub mesh handles fan-out.',
    ],
  },

  { kind: 'h', num: '12.0', title: 'Services Layer', id: 'sec-12-0-services-layer' },
  {
    kind: 'p',
    text: 'The Services layer provides a framework for stateless servers that run on ZODES, use Programs for persistent state, and expose HTTP endpoints. Programs are passive descriptors that define storage schemas; Services are active processes with runtime lifecycle, request handling, and background tasks. A Service never holds authoritative local state; it reads and writes exclusively through Programs, so any ZODE running the same service can serve the same requests without migration or synchronization.',
  },

  { kind: 'h', num: '12.1', title: 'ServiceDescriptor and ServiceId', id: 'sec-12-1-servicedescriptor-serviceid' },
  { kind: 'p', text: 'A CBOR map with the following fields:' },
  {
    kind: 'table',
    headers: ['Field', 'Type', 'Description'],
    rows: [
      ['`name`', 'text string', 'Human-readable service name'],
      ['`version`', 'text string', 'Semantic version'],
      ['`required_programs`', 'list of ProgramId', 'Programs this service reads/writes (must already exist)'],
      ['`owned_programs`', 'list of ProgramDescriptor', 'Programs this service defines; auto-registered when the service is enabled'],
    ],
  },
  {
    kind: 'p',
    text: 'The `ServiceId` is derived as `SHA-256(CBOR(ServiceDescriptor))`, mirroring the ProgramId pattern (§5.2). Services can both depend on existing Programs and bring their own storage schemas via `owned_programs`.',
  },

  { kind: 'h', num: '12.2', title: 'Service Trait', id: 'sec-12-2-service-trait' },
  { kind: 'p', text: 'Every service, native or WASM, implements four operations:' },
  {
    kind: 'table',
    headers: ['Operation', 'Description'],
    rows: [
      ['`descriptor()`', 'Returns the service’s `ServiceDescriptor`; declares identity and program dependencies.'],
      ['`routes(ctx)`', 'Returns an HTTP router mounted at `/services/{service_id_hex}/`.'],
      ['`on_start(ctx)`', 'Called after ZODE boot; may spawn background tasks using a cancellation token for graceful shutdown.'],
      ['`on_stop()`', 'Cleanup hook called during ZODE shutdown.'],
    ],
  },

  { kind: 'h', num: '12.3', title: 'ServiceContext and ProgramStore', id: 'sec-12-3-servicecontext-programstore' },
  { kind: 'p', text: 'The `ServiceContext` is a service’s interface to the ZODE. It provides:' },
  {
    kind: 'ul',
    items: [
      '**ProgramStore**: a key-value abstraction over sector append-logs. Keys map to `SectorId` via `SHA-256(key)`. `put` appends a new entry (latest entry = current value). `get` reads the last entry. `list` reads the full log history.',
      '**Ephemeral tokens**: HMAC-SHA256 signed, time-limited tokens for stateless short-lived flows (auth challenges, OAuth nonces). The client holds the token and presents it back; no server-side storage is required.',
      '**Event broadcast**: services emit `Started`, `Stopped`, and `RequestHandled` events.',
      '**Shutdown token**: cooperative cancellation for background tasks.',
    ],
  },
  { kind: 'p', text: '**ProgramStore Operations.**' },
  {
    kind: 'table',
    headers: ['Operation', 'Behavior'],
    rows: [
      ['`get(key)`', 'Derive `SectorId = SHA-256(key)`, read last log entry.'],
      ['`put(key, value)`', 'Derive `SectorId`, append value to sector log.'],
      ['`list(key)`', 'Read all entries for the derived sector (full history).'],
      ['`list_from(key, from)`', 'Read entries starting from a given index.'],
      ['`len(key)`', 'Return the number of entries for the derived sector.'],
    ],
  },

  { kind: 'h', num: '12.4', title: 'ServiceRegistry', id: 'sec-12-4-serviceregistry' },
  { kind: 'p', text: 'The `ServiceRegistry` manages the lifecycle of all active services on a ZODE:' },
  {
    kind: 'ul',
    items: [
      '**Register**: compute `ServiceId`, reject duplicates, store the service.',
      '**Start all**: create a `ServiceContext` per service, call `on_start`, emit `Started` event.',
      '**Stop all**: cancel background tasks, call `on_stop`, emit `Stopped` event.',
      '**Merged router**: build a combined HTTP router with each service nested at `/services/{service_id_hex}/`.',
      '**Required programs**: collect the union of all registered services’ required and owned program IDs for topic subscription.',
    ],
  },

  { kind: 'h', num: '12.5', title: 'HTTP Integration', id: 'sec-12-5-http-integration' },
  {
    kind: 'p',
    text: 'Service HTTP routes are merged into the same server that hosts the JSON-RPC sector endpoint. The resulting route layout is:',
  },
  {
    kind: 'code',
    text: `POST /rpc                           -- JSON-RPC sector operations (§10)
GET|POST /services/{service_id}/... -- per-service endpoints`,
  },
  {
    kind: 'p',
    text: 'Each service defines its own sub-routes (e.g. `/resolve`, `/health`, `/messages`). The ZODE handles TLS, CORS, and connection management; services only see deserialized HTTP requests.',
  },

  { kind: 'h', num: '12.6', title: 'WASM Runtime', id: 'sec-12-6-wasm-runtime' },
  {
    kind: 'p',
    text: 'The Services layer supports a sandboxed WASM runtime for third-party services using the WebAssembly Component Model. A WIT (WebAssembly Interface Types) contract defines the host–guest boundary:',
  },
  { kind: 'p', text: '**Host-provided imports:**' },
  {
    kind: 'table',
    headers: ['Interface', 'Functions', 'Description'],
    rows: [
      ['`store`', '`get`, `put`, `list-entries`, `list-from`, `entry-count`', 'Key-value access to Grid Programs'],
      ['`ephemeral`', '`create-token`, `verify-token`', 'Signed time-limited tokens'],
    ],
  },
  { kind: 'p', text: '**Guest-exported interface:**' },
  {
    kind: 'table',
    headers: ['Function', 'Description'],
    rows: [
      ['`get-descriptor()`', 'Returns the service descriptor'],
      ['`handle-request(req)`', 'Processes an HTTP request and returns a response'],
      ['`on-start()`', 'Lifecycle hook at service startup'],
      ['`on-stop()`', 'Lifecycle hook at service shutdown'],
    ],
  },
  {
    kind: 'p',
    text: 'WASM services are subject to resource limits: CPU fuel metering, memory caps, and per-request wall-clock timeouts. A misbehaving module is terminated without affecting the ZODE or other services.',
  },

  { kind: 'h', num: '12.7', title: 'Standard Services', id: 'sec-12-7-standard-services' },
  { kind: 'p', text: 'Two services are registered by default:' },
  {
    kind: 'table',
    headers: ['Service', 'Required Programs', 'Endpoints'],
    rows: [
      ['**Identity** (v1.0.0)', 'ZID v1', '`POST /resolve`, `GET /health`'],
      ['**Interlink** (v1.0.0)', 'Interlink v2', '`GET /messages`, `GET /health`'],
    ],
  },
  {
    kind: 'p',
    text: 'The Identity service wraps the ZID Program with a DID resolution HTTP API. The Interlink service exposes channel message retrieval over HTTP. Both are native (compiled) services and are always registered on ZODE startup.',
  },

  { kind: 'h', num: '12.8', title: 'Programs vs. Services', id: 'sec-12-8-programs-vs-services' },
  {
    kind: 'table',
    headers: ['Aspect', 'Program', 'Service'],
    rows: [
      ['Nature', 'Passive descriptor (schema + proof config)', 'Active process (server, compute)'],
      ['State', 'Defines storage format', 'Stateless; reads/writes via Programs'],
      ['Identity', '`ProgramId = SHA-256(descriptor)`', '`ServiceId = SHA-256(descriptor)`'],
      ['Runs on', 'Nothing (specification only)', 'ZODE nodes'],
      ['Exposed API', 'None (sector protocol only)', 'HTTP routes, background tasks'],
    ],
  },

  { kind: 'h', num: '13.0', title: 'ZODE Behavior', id: 'sec-13-0-zode-behavior' },

  { kind: 'h', num: '13.1', title: 'Startup Sequence', id: 'sec-13-1-startup-sequence' },
  {
    kind: 'ol',
    items: [
      'Open persistent storage.',
      'Start libp2p swarm (GossipSub, request-response, Kademlia).',
      'Build `ServiceRegistry`; register default services (Identity, Interlink).',
      'Compute effective topic set: default programs ∪ configured programs ∪ service-required programs.',
      'Subscribe to each GossipSub topic.',
      'Start all registered services (`on_start`); build merged HTTP router.',
      'Start RPC server with sector endpoint and service routes merged.',
      'Dial bootstrap peers.',
      'If Kademlia enabled, seed routing table and bootstrap.',
      'Enter event loop.',
    ],
  },

  { kind: 'h', num: '13.2', title: 'Event Loop', id: 'sec-13-2-event-loop' },
  {
    kind: 'p',
    text: 'The ZODE continuously processes: incoming sector requests, gossip messages, peer events, Kademlia discovery, publish queue, service events, and shutdown signals.',
  },

  { kind: 'h', num: '13.3', title: 'Append + Gossip Flow', id: 'sec-13-3-append-gossip-flow' },
  {
    kind: 'p',
    text: 'On Append: (1) validate program, sector filter, entry size, shape proof; (2) append to local storage; (3) send success response. Gossip propagation is **client-triggered**: after successful append, the client publishes `GossipSectorAppend` to the program topic.',
  },

  { kind: 'h', num: '13.4', title: 'Shutdown Sequence', id: 'sec-13-4-shutdown-sequence' },
  {
    kind: 'p',
    text: 'On shutdown: (1) cancel service shutdown tokens; (2) call `on_stop` on each registered service; (3) stop the RPC server; (4) close the libp2p swarm; (5) flush and close persistent storage.',
  },

  { kind: 'h', num: '14.0', title: 'Visibility and Privacy Properties', id: 'sec-14-0-visibility-privacy' },
  { kind: 'p', text: '**What a ZODE can see**' },
  {
    kind: 'table',
    headers: ['Information', 'Visible?'],
    rows: [
      ['`program_id`', 'Yes, routing and policy'],
      ['`sector_id`', 'Yes, opaque 32 bytes'],
      ['Payload size', 'Yes, mitigated by padding'],
      ['Entry timing', 'Yes, append/read arrival'],
      ['Batched sector IDs', 'Yes, within one request'],
      ['Client IP', 'Yes, transport-level'],
      ['Service requests', 'Yes, ZODE routes HTTP to services'],
    ],
  },
  { kind: 'p', text: '**What a ZODE cannot see**' },
  {
    kind: 'table',
    headers: ['Information', 'Why'],
    rows: [
      ['Entry content/structure', 'Encrypted (XChaCha20/Poseidon)'],
      ['Author identity', 'Inside encrypted payload'],
      ['Access control', 'Key material never on wire'],
      ['Sector relationships', 'HKDF-derived IDs are unlinkable'],
      ['Ordering/timestamps', 'Inside encrypted payload'],
    ],
  },

  { kind: 'h', num: '15.0', title: 'Security Considerations', id: 'sec-15-0-security-considerations' },
  {
    kind: 'ul',
    items: [
      '**No transport anonymity.** IP addresses are visible. Onion routing is out of scope.',
      '**Timing correlation.** A ZODE can correlate writes/reads from the same connection.',
      '**No wire-level write authorization.** Any client with a ProgramId can append. Access control is application-layer.',
      '**Gossip propagation delay.** Entries initially exist on one ZODE. Clients MAY multi-send.',
      '**Key compromise.** NeuralKey compromise implies all derived keys are compromised. Shamir splitting mitigates single-point-of-failure.',
      '**Post-quantum readiness.** Hybrid constructions require breaking both classical and PQ components.',
      '**WASM service isolation.** Sandboxed WASM services are subject to fuel metering, memory limits, and wall-clock timeouts. A misbehaving module cannot affect the ZODE or other services, but resource exhaustion within limits is possible.',
      '**Service statefulness.** Services are stateless by construction; all persistent state flows through Programs. A compromised service cannot corrupt state beyond what its declared Programs allow.',
    ],
  },

  { kind: 'h', num: '16.0', title: 'Interoperability Requirements', id: 'sec-16-0-interoperability-requirements' },
  { kind: 'p', text: 'A conforming Grid implementation MUST:' },
  {
    kind: 'ol',
    items: [
      'Serialize all protocol messages as deterministic CBOR (RFC 8949 §4.2.1).',
      'Derive ProgramIds as `SHA-256(CBOR(ProgramDescriptor))`.',
      'Use HKDF-SHA256 with exact domain separation strings (§4.2).',
      'Produce hybrid signatures: Ed25519 (64 B) + ML-DSA-65 (3,309 B); both must verify.',
      'Perform hybrid key encapsulation: X25519 + ML-KEM-768 via HKDF (§4.5).',
      'Use XChaCha20-Poly1305 or Poseidon sponge per ProgramDescriptor.',
      'Implement the padding bucket scheme (§7.4).',
      'Reject non-32-byte sector IDs.',
      'Use `/grid/sector/1.0.0` for sector request-response.',
      'Use `/grid/kad/1.0.0` for Kademlia DHT.',
      'Format GossipSub topics as `prog/<64_hex_chars>`.',
      'Serialize `GossipSectorAppend` as CBOR.',
      'Enforce batch limits: 64 entries, 4 MB total.',
      'Accept gossip with conflict resolution per §11.2.',
      'Derive ServiceIds as `SHA-256(CBOR(ServiceDescriptor))`.',
      'Mount service HTTP routes at `/services/{service_id_hex}/` alongside the JSON-RPC endpoint.',
      'Format service GossipSub topics as `svc/<64_hex_chars>`.',
      'Map ProgramStore keys to SectorIds via `SHA-256(key)`; `put` appends, `get` reads last entry.',
    ],
  },

  { kind: 'h', num: 'Appendix A', title: 'Version History', id: 'sec-appendix-a-version-history' },
  {
    kind: 'table',
    headers: ['Version', 'Date', 'Changes'],
    rows: [
      ['0.1.0', 'January 2025', 'Initial draft. Core protocol: serialization (CBOR), identifiers, cryptographic primitives, sector encryption, padding, key wrapping, storage model, wire protocol, GossipSub replication, shape proofs (Groth16), and standard programs (ZID, Interlink).'],
      ['0.2.0', 'February 2025', 'Sector ID derivation. DID encoding. Shamir secret sharing for NeuralKey backup. Expanded ZODE behavior specification. Visibility and privacy properties. Security considerations. Interoperability requirements checklist.'],
      ['0.3.0', 'March 2026', 'Services layer. Stateless servers on ZODES with ProgramStore key-value abstraction, HTTP endpoints, WASM runtime (WIT contract). ServiceDescriptor, ServiceId, ServiceRegistry. Standard services: Identity and Interlink. Service GossipSub topics. Updated ZODE startup/shutdown.'],
      ['0.4.0', 'March 2026', 'Added version history. Versioned output filenames.'],
      ['0.5.0', 'March 2026', 'Reorganized document by conceptual layers: identity (§4) → programs (§5) → sectors (§6) → encryption & signing (§7) → shape proofs (§8) → networking (§9) → wire protocol (§10) → gossip (§11) → services (§12) → ZODE behavior (§13). Merged encryption and signing into unified §7. Merged identifiers into their owning sections. Moved shape proofs before networking. Standard programs now in §5 alongside the program concept. All cross-references updated.'],
      ['0.6.0', 'March 2026', 'Rewrote abstract. Reframed from “encrypted storage network” to “secure peer-to-peer compute network built on zero-knowledge proofs and post-quantum cryptography.” Defined the three core primitives (Programs, Sectors, Services) explicitly. Added proofs as the connective layer between stateless services, verifiable execution, and encrypted storage. Removed “no consensus, no tokens, no global state” framing from abstract.'],
    ],
  },
];
