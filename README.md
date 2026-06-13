# AuditLens

AI-powered smart contract vulnerability scanner using GenLayer intelligent contracts.

## Structure

- `audit/` — GenLayer contract + Solidity registry + test fixtures
- `web-ui/` — React (Vite) frontend
- `config/` — Configuration

## Deploy

```bash
genlayer deploy --contract audit/audit_lens.py
```

## Test

Submit `audit/test_vulnerable.sol` — it contains a known reentrancy bug.

## Web UI

```bash
cd web-ui && npm run dev
```
