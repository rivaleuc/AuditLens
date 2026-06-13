import json
import hashlib
from genlayer import *


@gl.contract
class AuditLens:
    audits: TreeMap[str, str]
    audit_count: u256

    def __init__(self):
        self.audit_count = u256(0)

    @gl.public.write
    def submit_audit(self, code: str, language: str) -> str:
        key = hashlib.sha256(code.encode()).hexdigest()[:16]

        prompt = (
            f"You are a smart contract security auditor. Analyze the following {language} code for vulnerabilities.\n"
            "Look for: reentrancy, integer overflow/underflow, access control issues, front-running, "
            "unchecked return values, denial of service, and any other security issues.\n"
            "Return ONLY valid JSON with this structure:\n"
            '{"findings": [{"severity": "critical|high|medium|low|info", "title": "...", "description": "...", "line_hint": <int or null>}]}\n\n'
            f"Code:\n```{language}\n{code}\n```"
        )

        result = gl.exec_prompt(prompt)
        self.audits[key] = result
        self.audit_count += u256(1)
        return key

    @gl.public.view
    def get_audit(self, key: str) -> str:
        return self.audits[key]

    @gl.public.view
    def stats(self) -> str:
        return json.dumps({"total_audits": int(self.audit_count)})
