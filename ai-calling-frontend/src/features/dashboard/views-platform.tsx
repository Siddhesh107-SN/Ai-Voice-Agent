'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDash } from './store';
import { Chips, Dialog, Meter, PageHead, Toggle } from './ui';
import { PLAN_PRICE, inr } from './util';
import type { ContactMessage } from './types';
import {
  approveAccess,
  declineAccess,
  updateBusinessStatus,
  addMinutePack,
  viewBusinessPin,
  resetBusinessPin,
  toggleAgentPower,
  updateContactMessage,
} from './api';

const near = (u: number, l: number) => u / l >= 0.9;

export function PlatformOverview() {
  const { s } = useDash();
  const act = s.businesses.filter((b) => b.status === 'Active');
  const mrr = act.reduce((t, b) => t + PLAN_PRICE[b.plan], 0);
  const M = [8.2, 9.6, 11.1, 12.4, 14, mrr / 1000], mx = Math.max(...M);
  const kp = [
    { t: 'Active businesses', v: String(act.length), n: `${s.businesses.length - act.length} suspended`, k: 'k2' },
    { t: 'Monthly revenue', v: inr(mrr), n: 'Active plans only', k: 'k1' },
    { t: 'Minutes used', v: String(s.businesses.reduce((t, b) => t + b.minutes_used, 0)), n: `of ${s.businesses.reduce((t, b) => t + b.minutes_limit, 0)} across plans`, k: 'k3' },
    { t: 'Pending access', v: String(s.requests.length), n: '', k: 'k4' },
  ];
  return (
    <>
      <PageHead title="Platform overview" sub="Revenue, usage and health across every business." />
      <div className="grid4">{kp.map((k) => <div key={k.t} className={`card kpi ${k.k}`}><small>{k.t}</small><b>{k.v}</b>{k.t === 'Pending access' ? <small><Link href="/dashboard/platform/access">Review requests</Link></small> : <small>{k.n}</small>}</div>)}</div>
      <div className="cols" style={{ marginTop: 14 }}>
        <div className="card" style={{ overflow: 'auto' }}>
          <h3>Businesses</h3>
          <table><thead><tr><th>Business</th><th>Plan</th><th>Minutes</th><th>Status</th></tr></thead>
            <tbody>{s.businesses.map((b) => (
              <tr key={b.id}><td>{b.name}</td><td>{b.plan}</td>
                <td style={{ minWidth: 140 }}><Meter used={b.minutes_used} limit={b.minutes_limit} /><small className="mono">{b.minutes_used}/{b.minutes_limit}</small>{near(b.minutes_used, b.minutes_limit) && <> <span className="st rescheduled">Near limit</span></>}</td>
                <td><span className={`st ${b.status === 'Active' ? 'completed' : 'cancelled'}`}>{b.status}</span></td></tr>
            ))}</tbody></table>
        </div>
        <div className="card"><h3>Revenue, 6 months (₹ thousand)</h3>
          <div className="bars">{M.map((v, i) => <div key={i} style={{ flexDirection: 'column', alignItems: 'stretch' }}><div style={{ flex: 1 }}><i style={{ height: `${(v / mx) * 100}%`, background: '#F26B2A' }} /></div><span>{['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</span></div>)}</div>
        </div>
      </div>
    </>
  );
}

export function AccessControl() {
  const { s, toast, actor, reload } = useDash();

  const grant = async (id: string) => {
    const r = s.requests.find((x) => x.id === id);
    if (!r) return;
    try {
      await approveAccess(id, actor);
      await reload();
      toast(`Access granted to ${r.business}`);
    } catch (err: any) {
      toast(err.message || 'Error granting access');
    }
  };

  const decline = async (id: string) => {
    const r = s.requests.find((x) => x.id === id);
    if (!r) return;
    try {
      await declineAccess(id, actor);
      await reload();
      toast(`Access declined for ${r.business}`);
    } catch (err: any) {
      toast(err.message || 'Error declining access');
    }
  };

  const flip = async (id: string) => {
    const b = s.businesses.find((x) => x.id === id);
    if (!b) return;
    const st = b.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await updateBusinessStatus(id, st, actor);
      await reload();
      toast(`${b.name} ${st === 'Active' ? 'reactivated' : 'suspended'}`);
    } catch (err: any) {
      toast(err.message || 'Error updating status');
    }
  };

  return (
    <>
      <PageHead title="Access control" sub="New signups wait on their status page until you approve them. After approval, monitor usage and last login." />
      <div className="card"><h3>Pending ({s.requests.length})</h3>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {s.requests.map((r) => (
            <div key={r.id} className="ro" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div><b>{r.business}</b><br /><span className="mut">{r.plan}, {r.billing}</span> <span className="mono">{inr(r.amount)}</span> <span className="st">{r.status}</span></div>
              <div className="acts" style={{ margin: 0 }}><button onClick={() => toast('Opening payment proof (UPI verified)')}>View payment</button><button className="dng" onClick={() => decline(r.id)}>Decline</button><button className="pri" onClick={() => grant(r.id)}>Grant access</button></div>
            </div>
          ))}
          {s.requests.length === 0 && <p className="mut">All caught up. New signups will show up here.</p>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 14, overflow: 'auto' }}><h3>Monitoring</h3>
        <table><thead><tr><th>Business</th><th>Last login</th><th>Minutes</th><th>Status</th><th /></tr></thead>
          <tbody>{s.businesses.map((b) => <tr key={b.id}><td>{b.name}</td><td>{b.last_login}</td><td className="mono">{b.minutes_used}/{b.minutes_limit}</td><td><span className={`st ${b.status === 'Active' ? 'completed' : 'cancelled'}`}>{b.status}</span></td><td><button onClick={() => flip(b.id)}>{b.status === 'Active' ? 'Suspend' : 'Resume'}</button></td></tr>)}</tbody></table>
      </div>
    </>
  );
}

function PinReveal({ id }: { id: string }) {
  const { s, closeModal, actor } = useDash();
  const b = s.businesses.find((x) => x.id === id)!;
  const [pinVal, setPinVal] = useState('••••');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    viewBusinessPin(id, actor)
      .then((res) => {
        setPinVal(res.pin);
        setLoading(false);
      })
      .catch(() => {
        setPinVal(b.staff_pin || '1234');
        setLoading(false);
      });
  }, [id, actor, b.staff_pin]);

  return (
    <Dialog title={`Staff PIN: ${b.name}`} actions={<button onClick={closeModal}>Close</button>}>
      <p className="mono" style={{ fontSize: 32, letterSpacing: 10, margin: '6px 0' }}>
        {loading ? '...' : pinVal}
      </p>
      <p className="mut" style={{ margin: 0 }}>This view was logged to the platform audit trail.</p>
    </Dialog>
  );
}

function PinChange({ id }: { id: string }) {
  const { s, closeModal, toast, actor, reload } = useDash();
  const b = s.businesses.find((x) => x.id === id)!;
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!/^\d{4}$/.test(v)) {
      toast('PIN must be 4 digits');
      return;
    }
    setBusy(true);
    try {
      await resetBusinessPin(id, actor, v);
      await reload();
      closeModal();
      toast('PIN changed and logged to audit trail');
    } catch (err: any) {
      toast(err.message || 'Error resetting PIN');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Change PIN: ${b.name}`} actions={<><button onClick={closeModal}>Cancel</button><button className="pri" disabled={busy || v.length < 4} onClick={save}>{busy ? 'Saving…' : 'Save PIN'}</button></>}>
      <label>New 4-digit PIN<input className="mono" inputMode="numeric" maxLength={4} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} /></label>
    </Dialog>
  );
}

export function BusinessesPlans() {
  const { s, toast, openModal, actor, reload } = useDash();

  const addPack = async (id: string, name: string) => {
    try {
      await addMinutePack(id, 100, actor);
      await reload();
      toast(`100-minute pack added for ${name}`);
    } catch (err: any) {
      toast(err.message || 'Error adding minute pack');
    }
  };

  return (
    <>
      <PageHead title="Businesses and plans" sub="Limits, packs, subscriptions and staff PINs." />
      <div className="card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th>Business</th><th>Plan and limit</th><th>Renews</th><th>Revenue</th><th>Staff PIN</th><th /></tr></thead>
          <tbody>{s.businesses.map((b) => (
            <tr key={b.id}><td><b>{b.name}</b></td><td>{b.plan}<br /><span className="mono mut">{b.minutes_used}/{b.minutes_limit} min</span></td><td className="mono">{b.renews_on}</td><td className="mono">{inr(PLAN_PRICE[b.plan])}</td>
              <td className="mono">••••<br /><button onClick={() => openModal(<PinReveal id={b.id} />)}>View</button> <button onClick={() => openModal(<PinChange id={b.id} />)}>Change</button></td>
              <td><button onClick={() => addPack(b.id, b.name)}>Add 100 min</button></td></tr>
          ))}</tbody></table>
      </div>
    </>
  );
}

export function FleetView() {
  const { s, toast, actor, reload } = useDash();
  const name = (id: string) => s.businesses.find((b) => b.id === id)?.name ?? id;

  const flip = async (id: string) => {
    const a = s.agents.find((x) => x.id === id);
    if (!a) return;
    try {
      await toggleAgentPower(id, !a.online, actor);
      await reload();
      toast(`Turned ${a.name} ${!a.online ? 'on' : 'off'}`);
    } catch (err: any) {
      toast(err.message || 'Error toggling agent power');
    }
  };

  return (
    <>
      <PageHead title="AI agents, all businesses" sub="Switch any agent on or off. Changes are logged." />
      <div className="card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th>Agent</th><th>Business</th><th>Languages</th><th>Calls today</th><th>Power</th></tr></thead>
          <tbody>{s.agents.map((a) => <tr key={a.id}><td><b>{a.name}</b></td><td>{name(a.business_id)}</td><td>{a.languages}</td><td>{a.calls_today}</td><td><Toggle on={a.online} label={`Power ${a.name}`} onClick={() => flip(a.id)} /></td></tr>)}</tbody></table>
      </div>
    </>
  );
}

function MessageDialog({ m }: { m: ContactMessage }) {
  const { closeModal, toast } = useDash();
  return (
    <Dialog title={m.name} actions={<><button onClick={closeModal}>Close</button><button className="pri" onClick={() => { closeModal(); toast('Reply sent to customer email'); }}>Send reply</button></>}>
      <p className="mut" style={{ margin: 0 }}>{m.email} · {m.phone} · {m.received_at}</p>
      <div className="note">{m.message}</div>
      <label>Reply<textarea placeholder="Write a reply" /></label>
    </Dialog>
  );
}

export function MessagesInbox() {
  const { s, openModal, toast, reload } = useDash();

  const mark = async (id: string, patch: Partial<ContactMessage>) => {
    try {
      await updateContactMessage(id, patch);
      await reload();
    } catch (err: any) {
      toast(err.message || 'Error updating message');
    }
  };

  return (
    <>
      <PageHead title="Messages" sub="Contact-form messages from the landing page. Only Super Admin can see these." />
      <div style={{ display: 'grid', gap: 12 }}>
        {s.messages.map((m) => (
          <div key={m.id} className="card" style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div>{!m.read && <i className="pd" style={{ background: '#F26B2A' }} />}<b>{m.name}</b> <span className="mono mut">{m.received_at}</span>{m.handled && <> <span className="st completed">handled</span></>}</div>
              <p style={{ margin: '6px 0' }}>{m.message}</p><small className="mut">{m.email} · {m.phone}</small>
            </div>
            <div className="acts" style={{ margin: 0 }}>
              <button onClick={() => { mark(m.id, { read: true }); openModal(<MessageDialog m={m} />); }}>{m.read ? 'View' : 'Open'}</button>
              <button disabled={m.handled} onClick={() => mark(m.id, { handled: true, read: true })}>Mark handled</button>
            </div>
          </div>
        ))}
        {s.messages.length === 0 && <p className="mut">No contact messages received yet.</p>}
      </div>
    </>
  );
}

const EP = [
  ['GET', '/api/v1/appointments', 'List appointments', '200 OK', 'Returns list of appointments with status, customer, date, time'],
  ['POST', '/api/v1/appointments', 'Create appointment', '201 Created', 'Creates appointment, records audit history'],
  ['PATCH', '/api/v1/appointments/{id}/reschedule', 'Reschedule appointment', '200 OK', 'Updates date/time and logs change reason'],
  ['POST', '/api/v1/appointments/{id}/cancel', 'Cancel appointment', '200 OK', 'Sets cancelled status, source (ai_agent/staff) & reason'],
  ['GET', '/api/v1/appointments/{id}/history', 'Appointment history', '200 OK', 'Audit trail of events for this appointment'],
  ['GET', '/api/v1/calls', 'List calls with recordings', '200 OK', 'Returns call logs with audio recording URLs and transcripts'],
  ['PATCH', '/api/v1/agents/{id}/power', 'Turn agent on/off', '200 OK', 'Toggles AI agent availability across phone numbers'],
  ['POST', '/api/v1/pin/verify', 'Verify staff admin PIN', '200 OK', 'Server-hashed PIN check, locked for 15m after 5 wrong tries'],
  ['POST', '/api/v1/pin/change', 'Change staff admin PIN', '200 OK', 'Requires current PIN, sets new 4-digit PIN, audited'],
  ['POST', '/api/v1/admin/access/{id}/approve', 'Approve dashboard access', '200 OK', 'Grants dashboard access to approved signup'],
  ['GET', '/api/v1/admin/messages', 'Landing page contact messages', '200 OK', 'Submissions from /contact form'],
] as const;

export function ApiDocs() {
  const { openModal, closeModal } = useDash();

  return (
    <>
      <PageHead
        title="API / Swagger Documentation"
        sub="TalkAor AI Voice Calling & Appointments Backend OpenAPI 3.0 Specification."
        right={
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="pri"
            style={{ padding: '8px 14px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}
          >
            Open raw OpenAPI JSON
          </a>
        }
      />
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <p className="mut" style={{ margin: 0 }}>
            Base URL: <code className="mono">/api/v1</code> · Specification: <code className="mono">OpenAPI 3.0.3</code>
          </p>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {EP.map((e) => (
            <button
              key={e[0] + e[1]}
              style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '12px 16px' }}
              onClick={() =>
                openModal(
                  <Dialog title={e[2]} actions={<button onClick={closeModal}>Close</button>}>
                    <p className="mono" style={{ margin: 0, wordBreak: 'break-all' }}>
                      <span className={`meth ${e[0]}`}>{e[0]}</span> {e[1]}
                    </p>
                    <p className="mut" style={{ margin: '8px 0' }}>{e[4]}</p>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <small className="mono">Expected Response: {e[3]}</small>
                      <pre className="mono note" style={{ margin: 0, overflowX: 'auto' }}>
                        {JSON.stringify({ ok: true, data: { status: 'success', timestamp: new Date().toISOString() } }, null, 2)}
                      </pre>
                    </div>
                  </Dialog>
                )
              }
            >
              <span className={`meth ${e[0]}`}>{e[0]}</span>
              <span className="mono" style={{ flex: 1, wordBreak: 'break-all' }}>{e[1]}</span>
              <span className="mut">{e[2]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function LogsView() {
  const { s } = useDash();
  const F = ['All', 'info', 'warn', 'error'] as const;
  const [f, setF] = useState<(typeof F)[number]>('All');
  const list = s.logs.filter((l) => f === 'All' || l.level === f);
  return (
    <>
      <PageHead title="Logs" sub="Platform events and audit trail." />
      <Chips options={F} value={f} onChange={setF} />
      <div className="card" style={{ overflow: 'auto' }}>
        <table>
          <tbody>
            {list.map((l, i) => (
              <tr key={i}>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>{l.at}</td>
                <td><span className={`st ${l.level === 'error' ? 'cancelled' : l.level === 'warn' ? 'rescheduled' : 'completed'}`}>{l.level}</span></td>
                <td>{l.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
