# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *


class AuditLens(gl.Contract):
    audits: TreeMap[str, str]
    audit_count: u256

    def __init__(self):
        self.audit_count = u256(0)

    @gl.public.write
    def submit_audit(self, code: str, language: str) -> str:
        code = str(code).strip()
        if not code or len(code) < 20:
            raise Exception("code too short")
        language = str(language).strip() if language else "solidity"

        verdict = self._analyze(code, language)
        key = str(int(self.audit_count))
        record = {
            "submitter": str(gl.message.sender_address),
            "language": language,
            "code_preview": code[:200],
            "findings": verdict["findings"],
            "risk_score": verdict["risk_score"],
            "summary": verdict["summary"],
        }
        self.audits[key] = json.dumps(record)
        self.audit_count += u256(1)
        return key

    def _analyze(self, code: str, language: str) -> dict:
        def leader_fn() -> str:
            prompt = f"""You are a smart contract security auditor.

LANGUAGE: {language}
CODE TO AUDIT:
{code[:4000]}

Find vulnerabilities. For each finding report:
- severity: critical/high/medium/low/info
- title: short name
- description: what's wrong and how to exploit it

Reply ONLY valid JSON:
{{"findings": [{{"severity": "...", "title": "...", "description": "..."}}], "risk_score": <0-100>, "summary": "<one line>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, dict):
                return json.dumps(raw)
            return str(raw).strip()

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
                if not isinstance(data.get("findings"), list):
                    return False
                if not isinstance(data.get("risk_score"), int):
                    return False
                return True
            except Exception:
                return False

        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_audit(self, key: str) -> dict:
        key = str(key)
        if key not in self.audits:
            return {"exists": False}
        return json.loads(self.audits[key])

    @gl.public.view
    def stats(self) -> dict:
        return {"total_audits": int(self.audit_count)}
