import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { read, write, CONTRACT, connectWallet, isWalletConnected } from './genlayer'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

type Finding = {
  id: string
  severity: Severity
  title: string
  line: number
  detail: string
  swc: string
}

const SEVERITY_META: Record<Severity, { color: string; bg: string; icon: string; weight: number }> = {
  critical: { color: '#F85149', bg: 'rgba(248,81,73,0.12)', icon: '✖', weight: 40 },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '▲', weight: 25 },
  medium: { color: '#D29922', bg: 'rgba(210,153,34,0.12)', icon: '◆', weight: 12 },
  low: { color: '#3FB950', bg: 'rgba(63,185,80,0.12)', icon: '○', weight: 5 },
  info: { color: '#58A6FF', bg: 'rgba(88,166,255,0.12)', icon: 'ⓘ', weight: 1 },
}

const SAMPLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint amount) public {
        require(balances[msg.sender] >= amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] -= amount;
    }

    function setOwner(address newOwner) public {
        owner = newOwner;
    }

    function drain() public {
        payable(owner).transfer(address(this).balance);
    }
}
`

const FILES = [
  { name: 'Vault.sol', icon: '◈', active: true, dirty: true },
  { name: 'IERC20.sol', icon: '◈', active: false, dirty: false },
  { name: 'SafeMath.sol', icon: '◈', active: false, dirty: false },
  { name: 'Ownable.sol', icon: '◈', active: false, dirty: false },
]

function normSev(s: any): Severity {
  const x = String(s ?? '').toLowerCase()
  if (x.includes('crit')) return 'critical'
  if (x.includes('high')) return 'high'
  if (x.includes('med')) return 'medium'
  if (x.includes('low')) return 'low'
  return 'info'
}

export default function App() {
  const [code, setCode] = useState(SAMPLE)
  const [findings, setFindings] = useState<Finding[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [riskScore, setRiskScore] = useState(0)
  const [auditCount, setAuditCount] = useState<number | null>(null)
  const [walletAddr, setWalletAddr] = useState<string | null>(null)

  async function handleConnect() {
    try {
      const a = await connectWallet()
      setWalletAddr(a.slice(0, 6) + '…' + a.slice(-4))
      toast.success('Wallet connected')
    } catch (e: any) {
      toast.error(e.message || 'Connect failed')
    }
  }

  const lineCount = useMemo(() => code.split('\n').length, [code])

  useEffect(() => {
    read('stats')
      .then((s: any) => setAuditCount(Number(s?.total_audits ?? s?.[0] ?? 0)))
      .catch(() => {
        /* keep toolbar fallback on read failure */
      })
  }, [])

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    findings.forEach((f) => (c[f.severity] += 1))
    return c
  }, [findings])

  async function runAudit() {
    setBusy(true)
    setFindings([])
    setScanned(false)
    toast('Submitting audit on-chain…', { icon: '⚙️' })
    try {
      await write('submit_audit', [code, 'solidity'])
      const s: any = await read('stats')
      const totalAudits = Number(s?.total_audits ?? s?.[0] ?? 0)
      setAuditCount(totalAudits)

      const audit: any = await read('get_audit', [String(totalAudits - 1)])
      const rawFindings = audit?.findings ?? audit?.[0] ?? []
      const mapped: Finding[] = (Array.isArray(rawFindings) ? rawFindings : []).map((f: any, i: number) => ({
        id: `F${i}`,
        severity: normSev(f?.severity ?? f?.[0]),
        title: String(f?.title ?? f?.[1] ?? 'Finding'),
        line: Number(f?.line ?? f?.[3] ?? 0) || 1,
        detail: String(f?.description ?? f?.[2] ?? ''),
        swc: String(f?.swc ?? f?.[4] ?? 'SWC-000'),
      }))
      const rs = Number(audit?.risk_score ?? audit?.[1] ?? 0)
      setRiskScore(Math.max(0, Math.min(100, Math.round(rs <= 1 ? rs * 100 : rs))))
      setFindings(mapped)
      setScanned(true)

      const summary = String(audit?.summary ?? audit?.[2] ?? '')
      const crit = mapped.filter((f) => f.severity === 'critical').length
      if (crit) toast.error(`${crit} critical issue(s) found`, { description: summary || undefined })
      else toast.success('Audit complete', { description: summary || undefined })
    } catch (e: any) {
      toast.error('Audit failed', { description: e?.message ?? String(e) })
    } finally {
      setBusy(false)
    }
  }

  const riskColor = riskScore >= 60 ? '#F85149' : riskScore >= 30 ? '#F59E0B' : '#3FB950'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0D1117] font-mono text-[#C9D1D9]">
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-[#21262D] bg-[#161B22] px-3 py-1.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-[#F59E0B]">◎ AUDITLENS</span>
          <span className="text-[#6E7681]">File</span>
          <span className="text-[#6E7681]">Edit</span>
          <span className="text-[#6E7681]">Selection</span>
          <span className="text-[#6E7681]">Run</span>
          <span className="text-[#6E7681]">Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          {auditCount != null && <span className="hidden text-[#6E7681] sm:inline">audits {auditCount}</span>}
          <span className="hidden text-[#6E7681] sm:inline">{CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)}</span>
          <button
            onClick={handleConnect}
            className={`flex items-center gap-1.5 rounded border px-3 py-1 font-bold transition ${
              isWalletConnected()
                ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'border-[#30363D] text-[#C9D1D9] hover:border-[#F59E0B]/60 hover:text-[#F59E0B]'
            }`}
          >
            {walletAddr ? `● ${walletAddr}` : 'Connect Wallet'}
          </button>
          <button
            onClick={runAudit}
            disabled={busy}
            className="flex items-center gap-1.5 rounded bg-[#F59E0B] px-3 py-1 font-bold text-[#0D1117] transition hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {busy ? '◷ Scanning…' : '▶ Run Audit'}
          </button>
        </div>
      </div>

      {/* Body: sidebar | editor | problems */}
      <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr_340px]">
        {/* File tree sidebar */}
        <aside className="flex flex-col border-r border-[#21262D] bg-[#0D1117]">
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#6E7681]">Explorer</div>
          <div className="px-2 text-xs">
            <div className="flex items-center gap-1 px-1 py-1 text-[#C9D1D9]">
              <span className="text-[#6E7681]">▾</span> CONTRACTS
            </div>
            {FILES.map((f) => (
              <div
                key={f.name}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 ${
                  f.active ? 'bg-[#161B22] text-[#F59E0B]' : 'text-[#8B949E] hover:bg-[#161B22]/60'
                }`}
              >
                <span>{f.icon}</span>
                <span className="flex-1 truncate">{f.name}</span>
                {f.dirty && <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-[#21262D] p-3 text-[10px] leading-relaxed text-[#6E7681]">
            <div className="mb-1 uppercase tracking-widest">Engine</div>
            Slither-like static pass + heuristic SWC matcher. Paste a contract and run.
          </div>
        </aside>

        {/* Editor */}
        <main className="flex min-h-0 flex-col bg-[#0D1117]">
          {/* Tab bar */}
          <div className="flex items-center border-b border-[#21262D] bg-[#161B22] text-xs">
            <div className="flex items-center gap-2 border-r border-[#21262D] border-t-2 border-t-[#F59E0B] bg-[#0D1117] px-3 py-2 text-[#C9D1D9]">
              <span className="text-[#F59E0B]">◈</span> Vault.sol
              <span className="text-[#6E7681]">●</span>
            </div>
            <span className="px-3 text-[10px] text-[#6E7681]">solidity · utf-8</span>
          </div>

          {/* Code area with line numbers */}
          <div className="relative flex min-h-0 flex-1 overflow-auto">
            <div className="select-none border-r border-[#21262D] bg-[#0D1117] px-2 py-3 text-right text-xs leading-6 text-[#484F58]">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent px-3 py-3 text-xs leading-6 text-[#C9D1D9] outline-none"
              style={{ tabSize: 4 }}
            />
          </div>
        </main>

        {/* Problems panel */}
        <aside className="flex min-h-0 flex-col border-l border-[#21262D] bg-[#0D1117]">
          <div className="flex items-center justify-between border-b border-[#21262D] bg-[#161B22] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#8B949E]">
            <span>Problems</span>
            <span className="rounded bg-[#21262D] px-1.5 text-[#C9D1D9]">{findings.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {!scanned && !busy && (
              <div className="p-6 text-center text-xs text-[#6E7681]">
                No problems detected yet.
                <br />
                Hit <span className="text-[#F59E0B]">▶ Run Audit</span> to analyze.
              </div>
            )}
            {busy && (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-10 rounded bg-[#161B22]"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            )}
            <AnimatePresence>
              {findings.map((f, i) => {
                const m = SEVERITY_META[f.severity]
                const isOpen = open === f.id
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-[#21262D]"
                  >
                    <button
                      onClick={() => setOpen(isOpen ? null : f.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-[#161B22]"
                    >
                      <span style={{ color: m.color }} className="mt-0.5">
                        {m.icon}
                      </span>
                      <span className="flex-1">
                        <span className="text-[#C9D1D9]">{f.title}</span>
                        <span className="ml-1 text-[#6E7681]">[{f.swc}]</span>
                      </span>
                      <span className="whitespace-nowrap text-[#6E7681]">Ln {f.line}</span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                          style={{ background: m.bg }}
                        >
                          <p className="px-9 py-2 text-[11px] leading-relaxed text-[#8B949E]">{f.detail}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Severity legend */}
          {scanned && (
            <div className="flex flex-wrap gap-2 border-t border-[#21262D] px-3 py-2 text-[10px]">
              {(Object.keys(counts) as Severity[]).map((s) => (
                <span key={s} style={{ color: SEVERITY_META[s].color }}>
                  {SEVERITY_META[s].icon} {counts[s]} {s}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-[#F59E0B] px-3 py-1 text-[11px] font-medium text-[#0D1117]">
        <div className="flex items-center gap-4">
          <span>⎇ main</span>
          <span>Solidity</span>
          <span>Ln {lineCount}, Col 1</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            ✖ {counts.critical} ▲ {counts.high} ◆ {counts.medium}
          </span>
          <span className="flex items-center gap-1.5">
            RISK
            <span className="font-bold" style={{ color: riskColor === '#3FB950' ? '#0D1117' : riskColor }}>
              {scanned ? riskScore : '--'}/100
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
