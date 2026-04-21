'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

/**
 * Admin UI for sending FCM push notifications.
 *
 * This page ONLY talks to /api/push/send; it never touches FCM directly.
 * The shared secret stays client-entered (not baked into the bundle) so a
 * screenshot or cached page can't leak it.
 *
 * Two audiences:
 *   - Broadcast  → every farmer on the "all_farmers" topic
 *   - Farmers    → paste one or more farmerIds (comma/newline separated)
 */
type Audience = 'broadcast' | 'farmers'
type PushType = 'generic' | 'whatsapp_notice' | 'payment_released' | 'rate_alert'

type SendResult =
  | { ok: true; messageId: string }
  | { ok: true; sent: number; failed: number; tokens: number; note?: string; failures?: Array<{ token: string; error: string }> }
  | { error: string }

const TYPE_OPTIONS: Array<{ value: PushType; label: string; hint: string }> = [
  { value: 'generic',          label: 'Generic',            hint: 'Default channel' },
  { value: 'whatsapp_notice',  label: 'New notice',         hint: 'Manager posted a new notice' },
  { value: 'payment_released', label: 'Payment released',   hint: 'High importance · pops up' },
  { value: 'rate_alert',       label: 'Rate alert',         hint: 'High importance · pops up' },
]

export default function SendPage() {
  const [secret, setSecret]       = useState('')
  const [audience, setAudience]   = useState<Audience>('broadcast')
  const [farmerIds, setFarmerIds] = useState('')
  const [type, setType]           = useState<PushType>('generic')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState<SendResult | null>(null)

  const parsedFarmerIds = useMemo(
    () =>
      farmerIds
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [farmerIds]
  )

  const canSubmit =
    !sending &&
    secret.trim().length > 0 &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience === 'broadcast' || parsedFarmerIds.length > 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': secret,
        },
        body: JSON.stringify({
          audience,
          farmerIds: audience === 'farmers' ? parsedFarmerIds : undefined,
          title,
          body,
          type,
        }),
      })
      const data = (await res.json()) as SendResult
      setResult(data)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link href="/" style={styles.link}>← Back to map</Link>
        <h1 style={styles.h1}>Send push notification</h1>
      </header>

      <form onSubmit={submit} style={styles.form}>
        <Field label="Admin secret" hint="Matches PUSH_ADMIN_SECRET env var">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
            autoComplete="off"
          />
        </Field>

        <Field label="Audience">
          <div style={styles.radioRow}>
            <RadioOption
              checked={audience === 'broadcast'}
              onChange={() => setAudience('broadcast')}
              label="Broadcast"
              hint="Every farmer (via topic)"
            />
            <RadioOption
              checked={audience === 'farmers'}
              onChange={() => setAudience('farmers')}
              label="Specific farmers"
              hint="Paste farmerIds below"
            />
          </div>
        </Field>

        {audience === 'farmers' && (
          <Field
            label="Farmer IDs"
            hint={`Comma or newline separated · parsed: ${parsedFarmerIds.length}`}
          >
            <textarea
              value={farmerIds}
              onChange={(e) => setFarmerIds(e.target.value)}
              placeholder={'12345\n67890\nor 12345, 67890'}
              style={{ ...styles.input, height: 100, fontFamily: 'monospace' }}
            />
          </Field>
        )}

        <Field label="Channel">
          <select value={type} onChange={(e) => setType(e.target.value as PushType)} style={styles.input}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. पेमेंट जमा झाले"
            style={styles.input}
            maxLength={120}
          />
        </Field>

        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. तुमच्या २१ एप्रिलच्या पट्टीचे ₹12,340 जमा केले आहेत."
            style={{ ...styles.input, height: 100 }}
            maxLength={500}
          />
        </Field>

        <button type="submit" disabled={!canSubmit} style={styles.btn(canSubmit)}>
          {sending ? 'Sending…' : audience === 'broadcast' ? 'Broadcast to all' : `Send to ${parsedFarmerIds.length} farmer(s)`}
        </button>
      </form>

      {result && <ResultPanel result={result} />}

      <details style={styles.details}>
        <summary style={styles.summary}>curl equivalents</summary>
        <pre style={styles.pre}>
{`# Broadcast
curl -X POST \\
  -H 'Content-Type: application/json' \\
  -H "X-Admin-Secret: $PUSH_ADMIN_SECRET" \\
  "$DASHBOARD_URL/api/push/send" \\
  -d '{"audience":"broadcast","title":"नवीन सूचना","body":"उद्या बाजार बंद","type":"whatsapp_notice"}'

# Targeted
curl -X POST \\
  -H 'Content-Type: application/json' \\
  -H "X-Admin-Secret: $PUSH_ADMIN_SECRET" \\
  "$DASHBOARD_URL/api/push/send" \\
  -d '{"audience":"farmers","farmerIds":["12345","67890"],"title":"पेमेंट जमा","body":"₹12,340 credited","type":"payment_released"}'`}
        </pre>
      </details>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      <div style={styles.labelRow}>
        <span style={styles.labelText}>{label}</span>
        {hint && <span style={styles.hint}>{hint}</span>}
      </div>
      {children}
    </label>
  )
}

function RadioOption({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: () => void
  label: string
  hint: string
}) {
  return (
    <label
      style={{
        ...styles.radioCard,
        borderColor: checked ? '#f97316' : '#334155',
        background: checked ? '#431407' : '#1e293b',
      }}
    >
      <input type="radio" checked={checked} onChange={onChange} style={{ marginRight: 8 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>
      </div>
    </label>
  )
}

function ResultPanel({ result }: { result: SendResult }) {
  const isError = 'error' in result
  return (
    <div
      style={{
        ...styles.result,
        borderColor: isError ? '#b91c1c' : '#16a34a',
        background: isError ? '#450a0a' : '#052e16',
      }}
    >
      <div style={{ fontWeight: 700, color: isError ? '#fca5a5' : '#86efac', marginBottom: 8 }}>
        {isError ? 'Failed' : 'Sent'}
      </div>
      <pre style={{ ...styles.pre, background: 'transparent', padding: 0 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

const styles = {
  page: { maxWidth: 680, margin: '0 auto', padding: '24px 20px 80px', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' } as React.CSSProperties,
  header: { marginBottom: 24 } as React.CSSProperties,
  h1: { margin: '4px 0 0', fontSize: 22 } as React.CSSProperties,
  link: { color: '#94a3b8', fontSize: 13, textDecoration: 'none' } as React.CSSProperties,
  form: { display: 'flex', flexDirection: 'column', gap: 18 } as React.CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties,
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 } as React.CSSProperties,
  labelText: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' } as React.CSSProperties,
  hint: { fontSize: 11, color: '#94a3b8' } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f1f5f9',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  radioRow: { display: 'flex', gap: 10 } as React.CSSProperties,
  radioCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid',
    cursor: 'pointer',
  } as React.CSSProperties,
  btn: (enabled: boolean): React.CSSProperties => ({
    marginTop: 4,
    padding: '12px 20px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    fontSize: 14,
    cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? '#f97316' : '#475569',
    color: '#fff',
  }),
  result: { marginTop: 20, padding: 16, borderRadius: 10, border: '1px solid' } as React.CSSProperties,
  details: { marginTop: 30, color: '#94a3b8' } as React.CSSProperties,
  summary: { fontSize: 13, cursor: 'pointer', userSelect: 'none' } as React.CSSProperties,
  pre: {
    marginTop: 10,
    padding: 14,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 8,
    fontSize: 12,
    color: '#cbd5e1',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  } as React.CSSProperties,
}
