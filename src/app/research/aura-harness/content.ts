// AURA Harness whitepaper. Sourced from the aura-harness runtime docs
// (README.md, docs/architecture.md, docs/invariants.md).

import type { Block } from '../zero-os/content';

export type { Block };

export const abstract =
  "AURA Harness is a deterministic multi-agent runtime for running many autonomous agents concurrently with sandboxed tool execution. The system is built around per-agent kernels with cross-agent parallelism: each agent owns its own deterministic kernel and append-only record log, a single processor advances that agent's state by consuming transactions, and reasoning is delegated to a proxy-routed model provider. Every external effect, including every model call, every tool execution, and every state change, flows through the agent's kernel and is written to its record, so any one agent's full history is byte-for-byte replayable from its log alone, regardless of which other agents were running at the same time. The runtime backs interactive terminal sessions, headless servers, and long-running automatons from the same kernel, storage, and reasoning stack. As autonomous agents take on real work with real consequences, the question is no longer only what an agent can do, but whether we can prove what it did. AURA Harness answers that question with an architecture where auditability and determinism are structural guarantees rather than best-effort features.";

export const blocks: Block[] = [
  // 1.0 Introduction
  {
    kind: 'h',
    num: '1.0',
    title: 'Introduction',
    id: 'sec-1-0-introduction',
  },
  {
    kind: 'p',
    text: "Autonomous software agents are moving from demos into production. They read and write files, run commands, call external services, spawn other agents, and make decisions that ripple through real systems. As that capability grows, a harder question follows close behind: not merely what an agent is able to do, but whether anyone can later prove what it actually did, in what order, and on whose authority. Most agent frameworks treat history as a convenience, a transcript to scroll through, rather than as the canonical, authoritative record of the system's behavior.",
  },
  {
    kind: 'p',
    text: 'AURA Harness takes the opposite stance. It is a deterministic multi-agent runtime in which the record is the fundamental unit of truth. Every agent has its own append-only log of entries, strictly ordered by a per-agent sequence number, and all state is derivable from that log. There is no hidden state: if a thing is not in the record, it did not happen. This single commitment, that the log is the system and not a side effect of it, propagates into every layer of the design, from how the kernel computes context hashes to how unrelated agents are allowed to run in parallel.',
  },
  {
    kind: 'p',
    text: 'The runtime is an open-source Rust workspace. It builds two binaries, an interactive terminal client and a headless node server, over a shared kernel, storage, and reasoning stack. The same pipeline that drives a developer typing into a terminal also drives a headless server processing transactions over HTTP and a long-running automaton iterating on a task overnight. Because every front-end reduces to the same per-agent kernel, the guarantees described in this paper hold uniformly across all of them.',
  },
  {
    kind: 'p',
    text: 'This document describes the architecture of that runtime: its core concepts, its layered structure, the determinism and replay guarantees that make agent behavior auditable, the concurrency model that lets many agents run at once without weakening those guarantees, the policy and authorization model that gates every external effect, and the fifteen architectural invariants, each enforced in continuous integration, that hold the whole system to its promises.',
  },

  // 2.0 Goals
  {
    kind: 'h',
    num: '2.0',
    title: 'Goals',
    id: 'sec-2-0-goals',
  },
  {
    kind: 'p',
    text: 'A runtime intended to host autonomous agents at scale must satisfy a set of properties that ordinary application frameworks can leave implicit. AURA Harness is engineered around four:',
  },
  {
    kind: 'ol',
    items: [
      'Determinism: Given the same record, an agent must produce the same result. Replaying an agent\u2019s log must reconstruct its state byte-for-byte, without a live model or executor in the loop.',
      'Auditability: Every external effect, whether model calls, tool executions, policy decisions, or state changes, must be captured in the record with the full decision chain that produced it, so behavior can be verified after the fact.',
      'Parallelism: Many unrelated agents must run concurrently for throughput, and this must not come at the cost of determinism or auditability. Concurrency is a first-class property, not a hazard the design merely tolerates.',
      'Openness and sovereignty: The runtime is MIT-licensed and self-contained. Every layer is auditable and reusable, and the system is the authorization and execution boundary for agents, not a black box that owns user credentials or behavior.',
    ],
  },
  {
    kind: 'p',
    text: 'These goals are not aspirations bolted on after the fact; they are encoded as invariants and guarded by tests. The remainder of this paper shows how the architecture makes each one structural.',
  },

  // 3.0 Core Concepts
  {
    kind: 'h',
    num: '3.0',
    title: 'Core Concepts',
    id: 'sec-3-0-core-concepts',
  },
  {
    kind: 'p',
    text: 'Six concepts form the conceptual core of the runtime. Together they describe how an agent perceives, decides, and acts, and how each of those steps is made durable and replayable.',
  },
  {
    kind: 'h',
    num: '3.1',
    title: 'The Record',
    id: 'sec-3-1-the-record',
  },
  {
    kind: 'p',
    text: "The record is the fundamental unit of truth. Every agent owns an append-only log of record entries, strictly ordered by a per-agent sequence number with no reordering and no gaps. All agent state is derivable from this log. The log is immutable: there is no operation to update, delete, or truncate an entry. Compaction, where it happens, operates only on in-memory message history used to build prompts, never on the persisted record. This is what makes an agent's behavior auditable and replayable: the record is the system of record, and everything else is a projection of it.",
  },
  {
    kind: 'h',
    num: '3.2',
    title: 'The Kernel',
    id: 'sec-3-2-the-kernel',
  },
  {
    kind: 'p',
    text: 'The kernel is a deterministic, per-agent processor. Each agent owns exactly one kernel instance, bound to its agent identity at construction. The kernel builds context from the agent\u2019s record window, calls the reasoner, enforces policy, executes authorized actions through the executor, and commits new entries to the log. Given the same record, the kernel always produces the same output. Crucially, the record-append surface is sealed to the kernel: only the kernel\u2019s write handle can commit a record entry, so no other code can quietly mutate an agent\u2019s history.',
  },
  {
    kind: 'h',
    num: '3.3',
    title: 'Modes & Policy',
    id: 'sec-3-3-modes-and-policy',
  },
  {
    kind: 'p',
    text: 'Before any external effect, two checks run in sequence. First the resolved agent mode, which is Agent, Plan, Ask, or Debug, gates the action. The mode gate runs before the policy layer, not as a substitute for it. Then the policy layer narrows further per tool, evaluating hard-denial layers (allowed action kinds, required capabilities, argument scope, installed integrations) and a tri-state per-tool decision of on, off, or ask. Only actions that survive both gates become executable.',
  },
  {
    kind: 'h',
    num: '3.4',
    title: 'Reasoning',
    id: 'sec-3-4-reasoning',
  },
  {
    kind: 'p',
    text: 'Probabilistic model calls are isolated behind a single provider trait and recorded by the kernel. There is exactly one real provider in production: an Anthropic-shaped client that always routes through a JWT-authenticated proxy router. There is no direct-to-provider path: the runtime never calls a model vendor on its own. A mock provider is available for tests. Every model call passes through the kernel\u2019s reasoning entry points and produces a record entry capturing the request snapshot and the response metadata, so the reasoning step is as auditable as any other.',
  },
  {
    kind: 'h',
    num: '3.5',
    title: 'Tools & Executors',
    id: 'sec-3-5-tools-and-executors',
  },
  {
    kind: 'p',
    text: 'All side effects, including filesystem operations, shell commands, domain API calls, and automaton actions, are explicit and flow through authorized executors. The executor router dispatches approved actions and captures structured effects, keeping the kernel boundary clean. Filesystem and command tools run inside an OS-level sandbox that canonicalizes paths, guards against symlink escapes, and constrains subprocess spawning. Mutating git operations are funneled through a single sanctioned call site so that the boundary between read-only inspection and state-changing commits is explicit and enforced.',
  },
  {
    kind: 'h',
    num: '3.6',
    title: 'Memory & Skills',
    id: 'sec-3-6-memory-and-skills',
  },
  {
    kind: 'p',
    text: 'Per-agent memory and skill packages extend an agent\u2019s abilities at runtime without widening the deterministic kernel. Memory comes in three forms, namely durable facts, episodic events, and procedures detected over repeated behavior, stored in dedicated column families rather than in the record log. Writes flow through a two-stage pipeline that combines heuristic extraction with optional model-based refinement, and a retriever injects a size-budgeted slice of memory into the kernel context on each turn. Skills are packaged as standard skill files, wire-compatible with an open skill standard, and loaded by precedence from workspace, agent-personal, personal, configured, and bundled sources.',
  },

  // 4.0 Architecture
  {
    kind: 'h',
    num: '4.0',
    title: 'Architecture',
    id: 'sec-4-0-architecture',
  },
  {
    kind: 'h',
    num: '4.1',
    title: 'The Ten-Layer Stack',
    id: 'sec-4-1-the-ten-layer-stack',
  },
  {
    kind: 'p',
    text: 'The workspace is organized into ten layers with strict downward-only dependencies. From lowest to highest, the layers are: core, store, config, model, context, plugin, exec, agent, fleet, and surface. A crate may depend only on crates in the same layer or any lower layer; upward edges fail continuous integration. Every crate carries a source-level layer tag that must match its assigned layer, giving both a machine-checked dependency graph and a human-readable guardrail.',
  },
  {
    kind: 'ul',
    items: [
      'Core: Behavior-free identifiers, capability enums, mode primitives, and wire types, with no I/O and no async.',
      'Store: Durable storage, namely the append-only record log and its column families, behind a sealed write surface.',
      'Config: A single source of truth for environment variables and configuration.',
      'Model: The LLM provider abstraction and the single proxy-routed client.',
      'Context: Read-only context assembly, covering prompts, memory, compaction, and skills.',
      'Plugin: The plugin runtime, covering manifest schema, in-process API, hooks, MCP, and connectors.',
      'Exec: The tool execution surface, covering catalog, runner, sandbox, policy evaluation, isolation, and conflict locks.',
      'Agent: The deterministic core of a single agent, covering kernel, turn loop, steering, and subagent derivation.',
      'Fleet: The multi-agent runtime, covering registry, spawn, dispatch, quota, mailbox, and the daemon composition root.',
      'Surface: Composition roots such as the CLI, TUI, SDK, the HTTP/WebSocket gateway, the orchestration engine, and automatons.',
    ],
  },
  {
    kind: 'p',
    text: 'This layering is not cosmetic. It is what lets the system reason about the kernel boundary mechanically: because storage sits far below the agent loop, and because the loop is forbidden from importing store types, the rule that only the kernel may write the record becomes something a test can prove rather than something a reviewer must remember.',
  },
  {
    kind: 'h',
    num: '4.2',
    title: 'The Kernel Boundary',
    id: 'sec-4-2-the-kernel-boundary',
  },
  {
    kind: 'p',
    text: "For any agent, the only code permitted to interact with external systems on that agent's behalf is that agent's kernel. No code outside the kernel may call a model provider, execute an action through the executor, append to the record log, make mutating domain calls, or spawn subprocesses for git mutations. All external interactions are mediated through the kernel's processing and reasoning entry points, or through a single helper that assembles a context-hashed entry and commits it through the sealed write surface. A small number of sanctioned non-kernel append sites exist, namely an HTTP-driven tool-permissions write and the spawn audit rows, and each is individually allowlisted and serialized so the boundary stays tight.",
  },
  {
    kind: 'h',
    num: '4.3',
    title: 'Gateways & Transparency',
    id: 'sec-4-3-gateways-and-transparency',
  },
  {
    kind: 'p',
    text: 'The kernel mediates external systems through gateways that implement the same traits their consumers already expect. A model gateway implements the provider trait, a tool gateway implements the executor trait, and a domain gateway implements the domain API. Consumers, namely the agent loop and automatons, are unaware of kernel mediation: they hold an ordinary trait object and call it normally, while the gateway transparently records every call. The agent loop in particular is held in isolation: it owns iteration, streaming, compaction, budget management, and stall detection, but it may not touch store types, construct transactions, or reach a provider other than the one it was handed.',
  },

  // 5.0 Determinism & Replay
  {
    kind: 'h',
    num: '5.0',
    title: 'Determinism & Replay',
    id: 'sec-5-0-determinism-and-replay',
  },
  {
    kind: 'p',
    text: 'Determinism is the property that makes the record trustworthy. Four sub-properties combine to guarantee that any one agent\u2019s log replays byte-for-byte.',
  },
  {
    kind: 'h',
    num: '5.1',
    title: 'Per-Agent Deterministic Context',
    id: 'sec-5-1-per-agent-deterministic-context',
  },
  {
    kind: 'p',
    text: 'The context hash for an entry in an agent\u2019s log is derived solely from that transaction and that agent\u2019s record window: the transaction body chained against the context hashes of the preceding entries. Re-processing the same transaction against the same window for the same agent always produces the same hash. There is no cross-agent dependency in the chain, which is precisely what lets unrelated agents run in parallel without weakening per-agent determinism. The hashing is order-sensitive, insertion-sensitive, and transaction-sensitive, and these properties are pinned by property-based tests.',
  },
  {
    kind: 'h',
    num: '5.2',
    title: 'Per-Agent Monotonic Sequencing',
    id: 'sec-5-2-per-agent-monotonic-sequencing',
  },
  {
    kind: 'p',
    text: 'Within each agent, record entries carry strictly increasing, contiguous sequence numbers: the next sequence is always one greater than the head, with no gaps and no duplicates. Inbox dequeue and record append happen atomically in a single write batch, so a crash cannot leave a half-applied transaction. No cross-agent ordering is implied or required: two agents committing at the same wall-clock moment produce two independent, internally-monotonic chains.',
  },
  {
    kind: 'h',
    num: '5.3',
    title: 'Append-Only Record & the Sealed WriteStore',
    id: 'sec-5-3-append-only-record-and-the-sealed-writestore',
  },
  {
    kind: 'p',
    text: 'Each agent\u2019s record log is immutable; entries are never modified or deleted. The physical store backs many agents through column families keyed by agent and sequence, but the logical contract is strictly per-agent. The entire record-append family lives on a sealed write trait whose sealing marker is crate-private, so no new storage backend and no external caller can implement or invoke the append surface. Non-kernel crates depend only on a read-oriented trait; the kernel\u2019s write handle is the single path that can commit an entry. There are no update, delete, or truncate operations anywhere in the surface.',
  },
  {
    kind: 'h',
    num: '5.4',
    title: 'Audited vs AuditedLite',
    id: 'sec-5-4-audited-vs-auditedlite',
  },
  {
    kind: 'p',
    text: 'Every tool-proposal entry contains the full decision chain: the proposed action set, the decision with accepted or rejected action identifiers and reasons, the authorized actions, the resulting effects, and the context hash. The default audited mode stores effect payloads verbatim. For high-volume agents, an audited-lite mode replaces oversized payloads with a summary that carries the original length and hash, so replay can verify the original content against a content-addressed snapshot store. Either way, given the same record the same decisions can be verified offline without a live reasoner or executor.',
  },

  // 6.0 Concurrency
  {
    kind: 'h',
    num: '6.0',
    title: 'Concurrency',
    id: 'sec-6-0-concurrency',
  },
  {
    kind: 'h',
    num: '6.1',
    title: 'Per-Agent Kernels',
    id: 'sec-6-1-per-agent-kernels',
  },
  {
    kind: 'p',
    text: 'The runtime is built around per-agent kernels with cross-agent parallelism. Each agent owns its own kernel and its own append-only log; the sequence counter, the context-hash chain, append atomicity, and replay are all per-agent guarantees. There is no global cross-agent sequence, and the system intentionally does not promise one. Because every guarantee is scoped to a single agent\u2019s kernel and log, replaying any one agent\u2019s history is deterministic regardless of which other agents were running concurrently.',
  },
  {
    kind: 'h',
    num: '6.2',
    title: 'Single Writer Per Agent',
    id: 'sec-6-2-single-writer-per-agent',
  },
  {
    kind: 'p',
    text: 'At most one task may process a given agent\u2019s transaction queue at any time. This is enforced by a store-backed compare-and-set on a persisted per-agent processing marker, not an in-memory lock. Concurrent calls for different agents never block each other; concurrent calls for the same agent are short-circuited at the claim step, so the second caller simply skips rather than waiting behind long model or tool work. The claim survives single-process restarts via the persisted marker. The HTTP-driven tool-permissions write acquires this same claim so it serializes correctly with the kernel\u2019s own writes for that agent.',
  },
  {
    kind: 'h',
    num: '6.3',
    title: 'Cross-Agent Parallelism',
    id: 'sec-6-3-cross-agent-parallelism',
  },
  {
    kind: 'p',
    text: 'Unrelated agents execute concurrently. The only intentional cross-agent serialization points are the per-agent processing claim and a per-parent lease that orders a single parent\u2019s subagent-spawn audit rows. Quota admission gates concurrency budgets but explicitly does not create record ordering, and there is deliberately no global writer mutex across agent kernels. This invariant promotes what is often an implementation footnote into a top-level contract: parallelism is a property of the system, and it is safe precisely because every other guarantee is per-agent.',
  },

  // 7.0 Policy & Authorization
  {
    kind: 'h',
    num: '7.0',
    title: 'Policy & Authorization',
    id: 'sec-7-0-policy-and-authorization',
  },
  {
    kind: 'h',
    num: '7.1',
    title: 'AgentMode Resolution',
    id: 'sec-7-1-agentmode-resolution',
  },
  {
    kind: 'p',
    text: 'The agent mode is the headline gate consulted before every external effect. It is resolved once at session start by a deterministic priority chain: a command-line flag takes precedence, then a terminal slash command, then an SDK field, then the daemon default, and finally a fallback to full Agent mode. The resolved mode is recorded on the session and propagated to every child agent through subagent derivation, where children may only narrow the mode, never widen it.',
  },
  {
    kind: 'h',
    num: '7.2',
    title: 'Full Policy Enforcement',
    id: 'sec-7-2-full-policy-enforcement',
  },
  {
    kind: 'p',
    text: 'Every tool call passes through the complete policy check before execution. The check evaluates orthogonal hard-denial layers first, namely whether the action kind is allowed, whether the caller holds every required capability, whether scoped arguments fall inside the caller\u2019s scope, and whether required integrations are installed, and then resolves the per-tool tri-state of allow, deny, or ask. A deny-only shortcut is explicitly insufficient: the full check must run. Tool execution guardrails remain orthogonal on top of policy, so even an allowed command tool still enforces binary allowlists, shell-script constraints, sandbox and working-directory checks, and timeout limits.',
  },
  {
    kind: 'h',
    num: '7.3',
    title: 'Session-Scoped Decisions',
    id: 'sec-7-3-session-scoped-decisions',
  },
  {
    kind: 'p',
    text: 'When a tool resolves to ask and an interactive prompter is attached, the runtime emits a structured live approval prompt; in headless contexts the same resolution denies with a clear reason. Decisions remembered for the duration of a session live in policy memory and are cleared at each session start. A choice to remember for the session does not persist across process restarts, while a choice to remember permanently is written into the user\u2019s durable tool defaults rather than session memory.',
  },

  // 8.0 The Fleet
  {
    kind: 'h',
    num: '8.0',
    title: 'The Fleet: Multi-Agent Runtime',
    id: 'sec-8-0-the-fleet-multi-agent-runtime',
  },
  {
    kind: 'h',
    num: '8.1',
    title: 'Registry, Quota & Mailbox',
    id: 'sec-8-1-registry-quota-and-mailbox',
  },
  {
    kind: 'p',
    text: 'Above the single-agent kernel sits the fleet, the multi-agent runtime. A registry holds an in-memory directory of live and recently-terminated agents. A quota pool enforces concurrency and resource budgets through tickets that release on drop. A bounded mailbox carries agent jobs with backpressure and typed send errors, and a dispatcher routes those jobs into the spawn pipeline. A daemon composition root wires these pieces together and hosts the mode-resolution helpers.',
  },
  {
    kind: 'h',
    num: '8.2',
    title: 'Subagents & Derivation',
    id: 'sec-8-2-subagents-and-derivation',
  },
  {
    kind: 'p',
    text: 'A parent agent delegates work by calling a task tool, which validates the spawn capability and hands a dispatch request to a subagent dispatch hook; the tool is fail-closed when no hook is present. Derivation produces a child specification that may only narrow the parent\u2019s mode, permissions, and model, never widen them. Subagent dispatch is deliberately split across layers so that every dependency edge stays downward: the exec layer declares the hook the tool consumes, the agent layer owns the pure derivation and data adapters, the fleet layer owns the concrete dispatcher, and the surface layer owns the runner that drives the scheduler. Child work re-enters the same scheduler lane and inherits the same per-agent claim and record pipeline as ordinary scheduled work.',
  },
  {
    kind: 'h',
    num: '8.3',
    title: 'Spawn Audit Lease & Orphan Handoff',
    id: 'sec-8-3-spawn-audit-lease-and-orphan-handoff',
  },
  {
    kind: 'p',
    text: 'Spawn composition uses a second serialization axis: a per-parent lease held across derivation, quota acquisition, audit-record write, and registry insert, so a single parent\u2019s spawn audit chain stays linearized while unrelated parents spawn in parallel. A dedupe window keyed by parent and tool-call identity makes retried spawns idempotent, returning the cached outcome with no new children and no new audit rows. If a parent dies, an orphan store handles handoff, recording the lifecycle transition rather than silently losing the child.',
  },

  // 9.0 Plugins & Extensibility
  {
    kind: 'h',
    num: '9.0',
    title: 'Plugins & Extensibility',
    id: 'sec-9-0-plugins-and-extensibility',
  },
  {
    kind: 'h',
    num: '9.1',
    title: 'The Plugin Sandbox',
    id: 'sec-9-1-the-plugin-sandbox',
  },
  {
    kind: 'p',
    text: 'Plugins extend the runtime through a sandboxed external-process surface and cannot bypass the kernel boundary for record writes, model calls, or domain mutations. Hook subprocesses spawn with a scrubbed environment that strips runtime credentials and host secrets, and the MCP client applies the same env-clearing discipline with per-request timeouts so a silent plugin server cannot pin the pool. No plugin crate touches the kernel\u2019s external surfaces: no record append, no model call, no mutating domain method, and no store handle appears anywhere in plugin code.',
  },
  {
    kind: 'h',
    num: '9.2',
    title: 'Hooks, MCP & Connectors',
    id: 'sec-9-2-hooks-mcp-and-connectors',
  },
  {
    kind: 'p',
    text: 'The plugin runtime offers three runtime surfaces. A hook engine fires at every documented agent-loop and spawn lifecycle point over a closed taxonomy of events. A stdio MCP client speaks JSON-RPC to external tool servers under a first-active-wins connection manager. A connector registry holds plugin-contributed external endpoints. The single seam where a plugin can influence a kernel decision is a permission-request hook fired when a tool resolves to ask: it may approve or deny that live prompt, but it cannot bypass the upstream deny, capability, scope, or integration layers that already ran before the verdict reached it.',
  },

  // 10.0 Architectural Invariants
  {
    kind: 'h',
    num: '10.0',
    title: 'Architectural Invariants',
    id: 'sec-10-0-architectural-invariants',
  },
  {
    kind: 'p',
    text: 'The runtime upholds fifteen architectural invariants, grouped into five parts. Each is guarded in continuous integration, either by a ripgrep-band script that pins sanctioned call sites, or by a dedicated test suite. Unless stated otherwise, every invariant is scoped to a single agent\u2019s kernel and that agent\u2019s record log; the cross-agent contracts live in the concurrency part.',
  },
  {
    kind: 'ul',
    items: [
      'Part A \u2014 Kernel boundary & mediation: the per-agent kernel is the sole external gateway, every state change and every model call passes through it and is recorded, gateways are transparent, and the agent loop is isolated from kernel-owned resources.',
      'Part B \u2014 Policy & authorization: every tool call passes the full policy check, and live ask decisions are session-scoped.',
      'Part C \u2014 Record, audit, determinism & replay: a complete audit trail per entry, a per-agent deterministic context hash, per-agent monotonic sequencing, and a per-agent append-only record behind the sealed write surface.',
      'Part D \u2014 Concurrency & cross-agent parallelism: a single writer per agent via a store-backed claim and a per-parent spawn-audit lease, with unrelated agents running in parallel.',
      'Part E \u2014 Workspace & plugin structure: a strict downward-only layer stack, and plugins that run sandboxed and cannot bypass the kernel boundary.',
    ],
  },
  {
    kind: 'p',
    text: 'The invariants are stable and numbered, so references resolve across revisions of the source. They are load-bearing in the literal sense: when a contributor relocates a sanctioned call site, both the enforcement script\u2019s allowlist and the invariant document must be updated in the same change. The architecture is defined as much by what it forbids as by what it permits.',
  },

  // 11.0 Interfaces & Deployment
  {
    kind: 'h',
    num: '11.0',
    title: 'Interfaces & Deployment',
    id: 'sec-11-0-interfaces-and-deployment',
  },
  {
    kind: 'h',
    num: '11.1',
    title: 'CLI & TUI',
    id: 'sec-11-1-cli-and-tui',
  },
  {
    kind: 'p',
    text: 'The canonical entry point is a thin root binary that defaults to an interactive terminal interface and can be run headless with a single flag. It also hosts authentication subcommands for proxy-mode login, plus plugin and agent management. The terminal interface is a themed, component-based rendering layer driven by the same agent loop as every other front-end: user input becomes a transaction, streaming turn events flow back, and the terminal renders text and tool cards as they arrive.',
  },
  {
    kind: 'h',
    num: '11.2',
    title: 'HTTP / WebSocket API',
    id: 'sec-11-2-http-websocket-api',
  },
  {
    kind: 'p',
    text: 'A headless node server exposes an HTTP and WebSocket gateway. A run, whether a chat session, a dev-loop, or a single-task automaton, is started by posting a runtime request to a single run endpoint, which synchronously returns a run identifier and the WebSocket path to open for events. The exchange is deliberately two-step: the client posts over HTTP, receives the identifier, then opens the per-run stream; the run is already live by the time the socket attaches, with no client init frame. Chat streams are bidirectional, while dev-loop and task-run streams are event-only. Additional routes cover transactions and record scans, tri-state tool permissions, per-agent memory, and skills.',
  },
  {
    kind: 'h',
    num: '11.3',
    title: 'SDK & the External-Consumer Invariant',
    id: 'sec-11-3-sdk-and-the-external-consumer-invariant',
  },
  {
    kind: 'p',
    text: 'A single gateway crate is the sole supported surface for any external consumer. External repositories interact with the harness exclusively over the wire, using the run endpoint for submission, the per-run stream for events, and the management endpoints for everything else, never by depending on the engine, the domain HTTP layer, or any lower crate directly. This rule is load-bearing: it lets the gateway\u2019s composition root evolve internally without dragging every external consumer through a coordinated migration. An SDK provides typed client and session shapes over the same wire protocol, with pluggable transport.',
  },

  // 12.0 Conclusion
  {
    kind: 'h',
    num: '12.0',
    title: 'Conclusion',
    id: 'sec-12-0-conclusion',
  },
  {
    kind: 'p',
    text: 'AURA Harness is an argument that the trustworthiness of autonomous agents is an architectural question, not a monitoring one. By making the append-only record the unit of truth, sealing the write surface to a deterministic per-agent kernel, routing every external effect through that kernel, and proving the resulting boundary with fifteen continuously-enforced invariants, the runtime turns auditability and determinism from aspirations into structural guarantees. The same design that makes a single agent replayable is what makes many agents safe to run in parallel: because every guarantee is per-agent, concurrency costs nothing in determinism.',
  },
  {
    kind: 'p',
    text: 'As agents take on more consequential work, the systems that host them will be judged less by what they make possible and more by what they make verifiable. AURA Harness is built for that standard: an open, auditable foundation on which autonomous intelligence can act with both capability and accountability.',
  },

  // Appendix A
  {
    kind: 'h',
    num: 'Appendix A',
    title: 'Invariant Index',
    id: 'sec-appendix-a-invariant-index',
  },
  {
    kind: 'p',
    text: 'The fifteen invariants, by stable number and title:',
  },
  {
    kind: 'ol',
    items: [
      'Each Agent\u2019s Kernel Is The Sole External Gateway.',
      'Every State Change For An Agent Passes Through That Agent\u2019s Kernel.',
      'Every Model Call Is Recorded.',
      'Full Policy Enforcement.',
      'Complete Audit Trail.',
      'Per-Agent Deterministic Context.',
      'Per-Agent Monotonic Sequencing.',
      'Gateway Transparency.',
      'AgentLoop Isolation.',
      'Per-Agent Append-Only Record.',
      'Session-Scoped Tool Decisions.',
      'Single Writer Per Agent.',
      'Layered Architecture.',
      'Plugin Sandbox.',
      'Cross-Agent Parallelism.',
    ],
  },
];
