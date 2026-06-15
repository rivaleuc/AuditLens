# AuditLens

**AI smart-contract security auditing, with findings produced by validator consensus.**

AuditLens takes a snippet of contract code, has an LLM act as a security auditor, and returns structured vulnerability findings plus a risk score — agreed on by GenLayer validators rather than a single opinionated model. Auditing is a judgment task, so the verdict is a living interpretation of the code, not a static lint rule.

- **Contract (Bradbury, chain 4221):** `0x8736Ee89DC78E57d541B92c59a9c7F48089ce9fB`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0x8736Ee89DC78E57d541B92c59a9c7F48089ce9fB
- **Live app:** https://auditlens-cj5.pages.dev

## What it does

A user calls `submit_audit(code, language)` (code must be at least 20 chars; language defaults to `solidity`). The contract runs an audit round and stores a record under an integer key (returned as a string): `{submitter, language, code_preview, findings, risk_score, summary}`, then increments `audit_count`.

Each round runs in `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`. The leader builds a prompt casting the model as a smart-contract security auditor, embeds the code (clamped to 4000 chars), and calls `gl.nondet.exec_prompt(..., response_format="json")` asking for a list of findings — each `{severity, title, description}` with severity in critical/high/medium/low/info — plus a `risk_score` (0–100) and a one-line `summary`. The `validator_fn` re-parses the leader's calldata and accepts only if `findings` is a list and `risk_score` is an int, so validators that surface differently-worded findings still converge on a structurally valid audit.

State lives in a `TreeMap[str, str]` (`audits`). The frontend reads individual audits with `get_audit(key)` and the aggregate `stats()` (total audits). The optional EVM `AuditRegistry.sol` anchors an immutable on-chain record — `recordAudit(key, codeHash, findingsHash)` — so an audit can be proven to have existed without storing the full report on the EVM chain.

## Why GenLayer

Security auditing is interpretive: spotting reentrancy, unchecked external calls, or bad access control requires reasoning about intent and exploitability, not pattern-matching. A deterministic VM can run a fixed linter, but it can't read novel code and reason "this could be drained because…". Different honest auditors (and different validators) phrase findings differently while agreeing on the substance — exactly what `validator_fn` is for: it accepts any structurally valid audit so consensus forms on the semantic result, not identical prose. Use GenLayer when the task is open-ended judgment over arbitrary input; use a plain static analyzer when you only need a fixed, deterministic ruleset.

## Architecture

| Layer | Responsibility |
|---|---|
| Intelligent contract (`audit/audit_lens.py`) | Runs LLM audit rounds via `run_nondet_unsafe`, stores structured findings + risk score in a `TreeMap` |
| Frontend (`web-ui/`) | Reads live audits/stats with no wallet; submits `submit_audit` writes via MetaMask |
| EVM / off-chain (`audit/AuditRegistry.sol`) | Optional immutable anchor: `recordAudit` stores `codeHash`/`findingsHash` + auditor + timestamp for tamper-evident proof |

## Tech

- **Contract:** GenVM Python runner, pinned (`py-genlayer:1jb45aa8…jpz09h6`). `audit_count` as `u256`, audits stored as a `TreeMap[str, str]` of JSON. Judgment via `gl.nondet.exec_prompt`, consensus via `gl.vm.run_nondet_unsafe` + structural `validator_fn`. `risk_score` is an integer (no floats).
- **Frontend:** Vite + React 19 + TypeScript, genlayer-js for reads (CORS-open RPC) and writes (MetaMask wallet on chain 4221, no snap — the client is created with the address as a string so writes route to `eth_sendTransaction`). UI uses Tailwind CSS v4, framer-motion animations, and sonner toasts.

## Project structure

```
AuditLens/
├── audit/
│   ├── audit_lens.py        # intelligent contract (gl.Contract)
│   ├── AuditRegistry.sol    # optional immutable on-chain anchor
│   └── test_vulnerable.sol  # sample contract to audit
├── config/
│   └── settings.json
├── web-ui/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── genlayer.ts      # client, connectWallet, read/write helpers
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

## Develop

```
cd web-ui
npm install
npm run dev
npm run build
```

The frontend reads contract state with no wallet. Writes require MetaMask on GenLayer Bradbury (chain 4221) with some GEN — the app auto-switches the network.

## Deploy the frontend (Cloudflare Pages)

- **Root directory:** web-ui
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

- **No floats — `risk_score` is an int.** The risk score and `audit_count` (`u256`) are integers; nothing fractional is serialized into storage or calldata.
- **Validate structure, not exact text.** Two validators will list findings in different words, so `validator_fn` only requires `findings` to be a list and `risk_score` to be an int — consensus forms on a valid audit shape, not identical wording.
- **Evidence/code is untrusted.** The submitted code is data the auditor reasons about; the role and instructions live in the prompt body, so a contract that embeds "ignore previous instructions" in a comment is judged, not obeyed (greybox against prompt injection).
- **ACCEPTED ≠ verified safe.** A finalized audit stores an opinion, not a guarantee; `AuditRegistry` only anchors that the report existed, it does not certify the code.
- **Optimistic finality paces writes.** The frontend waits for `FINALIZED` receipts, so audits settle on the appeal-window cadence rather than instantly.

## License

MIT
