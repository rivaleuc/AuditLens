import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

const CONTRACT = "0x8736Ee89DC78E57d541B92c59a9c7F48089ce9fB";

const SAMPLE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Vault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }
}`;

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  id: string;
  title: string;
  severity: Severity;
  line: number;
  swc: string;
  detail: string;
}

const SAMPLE_FINDINGS: Finding[] = [
  {
    id: "RE-01",
    title: "Reentrancy in withdraw()",
    severity: "critical",
    line: 14,
    swc: "SWC-107",
    detail:
      "External call to msg.sender occurs before the balance is decremented, allowing a malicious contract to recursively drain funds. Apply checks-effects-interactions or a reentrancy guard.",
  },
  {
    id: "AC-02",
    title: "Missing revert message on require",
    severity: "medium",
    line: 13,
    swc: "SWC-123",
    detail:
      "The balance check on line 13 omits a descriptive error string, making failed transactions harder to debug and audit on-chain.",
  },
  {
    id: "OF-03",
    title: "Unchecked low-level call value",
    severity: "high",
    line: 15,
    swc: "SWC-104",
    detail:
      "Funds are forwarded with a raw call. Without gas stipend control and pull-payment patterns, this widens the attack surface for griefing and reentry.",
  },
];

const SEVERITY_STYLES: Record<
  Severity,
  { ring: string; text: string; bg: string; label: string }
> = {
  critical: {
    ring: "border-red-500/60",
    text: "text-red-400",
    bg: "bg-red-500/10",
    label: "CRITICAL",
  },
  high: {
    ring: "border-amber-500/60",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "HIGH",
  },
  medium: {
    ring: "border-yellow-500/50",
    text: "text-yellow-300",
    bg: "bg-yellow-500/10",
    label: "MEDIUM",
  },
  low: {
    ring: "border-sky-500/50",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    label: "LOW",
  },
};

const STEPS = [
  {
    n: "01",
    title: "Paste your contract",
    body: "Drop in Solidity source or a verified address. No setup, no compiler config, no waiting.",
  },
  {
    n: "02",
    title: "AI static + symbolic analysis",
    body: "Our models trace data flow, model state transitions, and cross-reference the SWC registry.",
  },
  {
    n: "03",
    title: "Triaged severity report",
    body: "Findings ranked critical → low with exact line numbers, SWC IDs, and remediation guidance.",
  },
];

const FEATURES = [
  {
    icon: "↩",
    title: "Reentrancy detection",
    body: "Flags state-after-call patterns and cross-function reentry across the full call graph.",
  },
  {
    icon: "∑",
    title: "Integer overflow / underflow",
    body: "Catches unchecked arithmetic and unsafe casts even inside unchecked blocks.",
  },
  {
    icon: "🔑",
    title: "Access control",
    body: "Detects missing modifiers, unprotected initializers, and privilege escalation paths.",
  },
  {
    icon: "⛽",
    title: "Gas & DoS",
    body: "Surfaces unbounded loops, griefing vectors, and storage layout inefficiencies.",
  },
  {
    icon: "🔮",
    title: "Oracle & price manipulation",
    body: "Identifies spot-price reliance and flash-loan exploitable dependencies.",
  },
  {
    icon: "✓",
    title: "SWC-mapped findings",
    body: "Every issue links to the Smart Contract Weakness registry for auditable provenance.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split("\n").length;

  const runAudit = () => {
    if (!code.trim()) {
      toast.error("Paste some contract source first.");
      return;
    }
    setScanning(true);
    setFindings(null);
    toast.loading("Running static + symbolic analysis…", { id: "audit" });
    setTimeout(() => {
      setScanning(false);
      setFindings(SAMPLE_FINDINGS);
      toast.success("Audit complete — 3 findings (1 critical)", { id: "audit" });
    }, 3000);
  };

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const counts = {
    critical: SAMPLE_FINDINGS.filter((f) => f.severity === "critical").length,
    high: SAMPLE_FINDINGS.filter((f) => f.severity === "high").length,
    medium: SAMPLE_FINDINGS.filter((f) => f.severity === "medium").length,
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-300 font-mono selection:bg-amber-500/30">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0D1117]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-400">
              ◎
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-100">
              Audit<span className="text-amber-400">Lens</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#how" className="transition hover:text-amber-400">
              How it works
            </a>
            <a href="#features" className="transition hover:text-amber-400">
              Features
            </a>
            <a href="#demo" className="transition hover:text-amber-400">
              Live audit
            </a>
          </div>
          <button
            onClick={scrollToDemo}
            className="rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            Run audit
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/40 px-4 py-1.5 text-xs text-slate-400"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            AI-native security analysis · SWC-aligned
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-6xl"
          >
            Ship contracts that
            <br />
            <span className="text-amber-400">don't get drained.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg"
          >
            AuditLens reads your Solidity like a senior security researcher —
            tracing reentrancy, overflow, and access-control bugs, then ranking
            every finding by severity with line-level precision.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              onClick={scrollToDemo}
              className="w-full rounded-md bg-amber-500 px-7 py-3 font-semibold text-[#0D1117] transition hover:bg-amber-400 sm:w-auto"
            >
              $ audit my contract
            </button>
            <a
              href="#how"
              className="w-full rounded-md border border-slate-700 px-7 py-3 font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300 sm:w-auto"
            >
              How it works
            </a>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-xs text-slate-600"
          >
            On-chain registry:{" "}
            <span className="text-amber-500/80">{CONTRACT}</span>
          </motion.p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-slate-800/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-500/70">
              // pipeline
            </p>
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
              How it works
            </h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-7"
              >
                <div className="mb-4 text-3xl font-bold text-amber-400/80">
                  {s.n}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-100">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-slate-800/60 bg-slate-950/30 py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-500/70">
              // detectors
            </p>
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
              What AuditLens catches
            </h2>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
                className="group rounded-lg border border-slate-800 bg-[#0D1117] p-6 transition hover:border-amber-500/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800/50 text-lg text-amber-400 transition group-hover:border-amber-500/50">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold text-slate-100">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section
        id="demo"
        ref={demoRef}
        className="border-t border-slate-800/60 py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-500/70">
              // live audit
            </p>
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
              Audit a contract now
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Edit the sample below or paste your own Solidity, then run the
              analyzer.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Code editor */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b0e14]"
            >
              <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-slate-500">Vault.sol</span>
              </div>
              <div className="flex max-h-[420px] overflow-auto">
                <div className="select-none border-r border-slate-800/60 bg-slate-900/30 px-3 py-3 text-right text-xs leading-6 text-slate-600">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full resize-none bg-transparent px-4 py-3 text-xs leading-6 text-amber-100/90 outline-none"
                  rows={lineCount}
                />
              </div>
              <div className="border-t border-slate-800 p-3">
                <button
                  onClick={runAudit}
                  disabled={scanning}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scanning ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0D1117]/40 border-t-[#0D1117]" />
                      analyzing…
                    </>
                  ) : (
                    "▸ run audit"
                  )}
                </button>
              </div>
            </motion.div>

            {/* Results */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-lg border border-slate-800 bg-slate-900/30 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Findings
                </h3>
                {findings && (
                  <div className="flex gap-2 text-[10px]">
                    <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-400">
                      {counts.critical} critical
                    </span>
                    <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                      {counts.high} high
                    </span>
                    <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-yellow-300">
                      {counts.medium} medium
                    </span>
                  </div>
                )}
              </div>

              {!findings && !scanning && (
                <div className="flex h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-800 text-center text-sm text-slate-600">
                  <span className="mb-2 text-2xl text-slate-700">▢</span>
                  No audit run yet.
                  <br />
                  Hit{" "}
                  <span className="text-amber-500/80">run audit</span> to scan.
                </div>
              )}

              {scanning && (
                <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                  Tracing call graph & state transitions…
                </div>
              )}

              {findings && (
                <div className="space-y-3">
                  {findings.map((f, i) => {
                    const st = SEVERITY_STYLES[f.severity];
                    return (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.1 }}
                        className={`rounded-md border ${st.ring} ${st.bg} p-4`}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ${st.text} ${st.bg} border ${st.ring}`}
                          >
                            {st.label}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {f.swc} · L{f.line}
                          </span>
                        </div>
                        <h4 className={`text-sm font-semibold ${st.text}`}>
                          {f.title}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {f.detail}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-[#0b0e14]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400">
              ◎
            </span>
            <span className="font-bold text-slate-300">
              Audit<span className="text-amber-400">Lens</span>
            </span>
          </div>
          <p className="text-center text-xs">
            © {new Date().getFullYear()} AuditLens · AI smart-contract security
            · Not financial advice.
          </p>
          <div className="flex gap-5 text-xs">
            <a href="#how" className="transition hover:text-amber-400">
              Docs
            </a>
            <a href="#features" className="transition hover:text-amber-400">
              Detectors
            </a>
            <a href="#demo" className="transition hover:text-amber-400">
              Audit
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
