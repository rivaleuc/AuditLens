# AuditLens

AI-powered smart contract security auditing on GenLayer. Submit code, validators detect vulnerabilities and rate severity by consensus.

## Why This Exists

Smart contract exploits cost billions annually. Traditional static analysis tools catch known patterns but miss novel attack vectors. AuditLens uses GenLayer's AI validators to reason about code like a human auditor — understanding context, intent, and exploitability.

## Why GenLayer

- **Interpretation over pattern-matching** — Security auditing isn't a lookup table. Novel vulnerabilities require understanding what code *does*, not just what it looks like.
- **Severity requires judgment** — Is a reentrancy bug critical or low-risk? It depends on context: what funds are at stake, what access controls exist, how likely exploitation is. AI validators assess real-world impact.
- **Attack vector reasoning** — Deterministic VMs can flag `call.value()` but can't reason about whether the surrounding logic actually enables an attack.
- **Consensus eliminates false positives** — Multiple validators independently audit the code. A vulnerability only gets reported if validators agree it's real and exploitable.
- **Novel vulnerability discovery** — New exploit patterns emerge constantly. AI validators can identify vulnerabilities that no existing rule covers.

## Structure

```
AuditLens/
├── audit/          # GenLayer contract (.py) + Solidity integration (.sol)
├── web-ui/         # React frontend for code submission + results
├── config/         # Network and deployment configuration
└── README.md
```

## Test Results

```
Input:  Solidity withdraw() function with unchecked external call
Output: 
  ├── Reentrancy vulnerability — CRITICAL
  └── Unprotected function (missing access control) — HIGH
```

## Deployment

- **Network:** GenLayer Testnet
- **Contract:** `0x8736Ee89DC78E57d541B92c59a9c7F48089ce9fB`

## Quick Start

```bash
cd web-ui && npm install && npm run dev
# Submit any Solidity code through the UI
# Validators return vulnerability report with severity ratings
```
