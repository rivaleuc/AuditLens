# AuditLens

AI-powered smart contract security auditing. Submit code, GenLayer validators detect vulnerabilities and rate severity by consensus.

## Why GenLayer

Security auditing requires interpretation, not pattern matching:

- **Novel vulnerabilities can't be caught by regex.** A deterministic VM can flag known patterns, but can't reason about how two innocent-looking functions interact to create an exploit.
- **Severity classification is judgment.** Is this reentrancy critical or low? Depends on context — who calls it, what's at stake, is there a guard elsewhere. AI validators assess real-world exploitability.
- **Multiple models catch more.** One model might spot the reentrancy, another catches the front-running risk. Consensus across diverse validators produces more comprehensive audits than any single tool.
- **No single auditor to trust.** Centralized audit firms are expensive and have conflicts of interest. Decentralized consensus removes the trust assumption.

## Deployed

**GenLayer (Bradbury):** `0x8736Ee89DC78E57d541B92c59a9c7F48089ce9fB`

## Test result

Submitted a classic reentrancy-vulnerable `withdraw()` function:
- ✅ **Critical:** Reentrancy Vulnerability detected
- ✅ **High:** Unprotected Function flagged

## Structure

```
AuditLens/
├── audit/
│   ├── audit_lens.py       ← GenLayer contract
│   └── AuditRegistry.sol   ← On-chain proof-of-audit
├── web-ui/                  ← React + Vite frontend
├── config/
└── README.md
```
