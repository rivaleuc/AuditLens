import { useState } from 'react'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('solidity')
  const [findings, setFindings] = useState(null)
  const [loading, setLoading] = useState(false)

  const submitAudit = async () => {
    setLoading(true)
    try {
      // Calls GenLayer contract via JSON-RPC
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      })
      const data = await res.json()
      setFindings(data.findings || [])
    } catch (e) {
      setFindings([{ severity: 'info', title: 'Error', description: e.message, line_hint: null }])
    }
    setLoading(false)
  }

  const severityColor = (s) => ({ critical: '#ff1744', high: '#ff5722', medium: '#ff9800', low: '#ffc107', info: '#2196f3' }[s] || '#999')

  return (
    <div className="app">
      <h1>🔍 AuditLens</h1>
      <p>AI-powered smart contract vulnerability scanner</p>
      <div className="editor">
        <select value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="solidity">Solidity</option>
          <option value="vyper">Vyper</option>
          <option value="rust">Rust</option>
        </select>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Paste your smart contract code here..."
          rows={16}
        />
        <button onClick={submitAudit} disabled={loading || !code}>
          {loading ? 'Analyzing...' : 'Run Audit'}
        </button>
      </div>
      {findings && (
        <div className="findings">
          <h2>Findings ({findings.length})</h2>
          {findings.map((f, i) => (
            <div key={i} className="finding" style={{ borderLeft: `4px solid ${severityColor(f.severity)}` }}>
              <span className="severity" style={{ color: severityColor(f.severity) }}>{f.severity.toUpperCase()}</span>
              <strong>{f.title}</strong>
              {f.line_hint && <span className="line">Line ~{f.line_hint}</span>}
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
