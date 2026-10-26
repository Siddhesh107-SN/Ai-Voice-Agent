'use client';
import { useEffect, useRef, useState } from 'react';
import { useDash } from './store';
import { BotMark } from './icons';
import { Dialog, PageHead } from './ui';
import { dow, fmtTime, pad, TODAY } from './util';
import type { Appointment, AppointmentHistoryItem, ApptStatus } from './types';
import {
  createAppointment,
  updateAppointment,
  rescheduleAppointment,
  cancelAppointment,
  fetchAppointmentHistory,
} from './api';

const PANEL = ['linear-gradient(135deg,#285CCC,#0F1F4A)', 'linear-gradient(135deg,#F26B2A,#a63a0f)', 'linear-gradient(135deg,#2f9e75,#12503a)', 'linear-gradient(135deg,#7a5cd6,#2d1f6b)', 'linear-gradient(135deg,#d6486b,#6b1f33)'];
const STATUSES: ApptStatus[] = ['scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled'];
const handledBy = (a: Appointment) => (a.agent_name ? `AI Agent ${a.agent_name}` : `Staff ${a.staff_name ?? ''}`);

export function ApptForm({ id }: { id?: string }) {
  const { s, set, closeModal, toast, actor, reload } = useDash();
  const cur = s.appts.find((a) => a.id === id);
  const customers = Array.from(new Map(s.appts.map((a) => [a.customer_id, a])).values());
  const [cid, setCid] = useState(cur?.customer_id ?? customers[0]?.customer_id ?? 'c1');
  const [date, setDate] = useState(cur?.date ?? TODAY);
  const [time, setTime] = useState(cur?.time.slice(0, 5) ?? '10:00');
  const [service, setService] = useState(cur?.service ?? '');
  const [notes, setNotes] = useState(cur?.notes ?? '');
  const [status, setStatus] = useState<ApptStatus>(cur?.status ?? 'scheduled');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!service.trim()) { toast('Enter the service to book'); return; }
    const c = customers.find((x) => x.customer_id === cid) || { customer_id: cid, customer_name: 'Customer', customer_phone: '+91 90000 00000', customer_email: 'customer@mail.in' };
    setBusy(true);
    try {
      if (cur) {
        await updateAppointment(cur.id, {
          customer_id: c.customer_id,
          customer_name: c.customer_name,
          customer_phone: c.customer_phone,
          customer_email: c.customer_email,
          date,
          time,
          service,
          notes,
          status,
          actor,
        });
      } else {
        await createAppointment({
          customer_id: c.customer_id,
          customer_name: c.customer_name,
          customer_phone: c.customer_phone,
          customer_email: c.customer_email,
          date,
          time,
          service,
          notes,
          status,
          actor,
        });
      }
      await reload();
      closeModal();
      toast('Appointment saved');
    } catch (err: any) {
      toast(err.message || 'Error saving appointment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={cur ? 'Edit appointment' : 'New appointment'} actions={<><button onClick={closeModal}>Close</button><button className="pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save appointment'}</button></>}>
      <label>Customer<select value={cid} onChange={(e) => setCid(e.target.value)}>{customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>)}</select></label>
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label>Service<input value={service} onChange={(e) => setService(e.target.value)} /></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as ApptStatus)}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    </Dialog>
  );
}

function RescheduleForm({ a }: { a: Appointment }) {
  const { closeModal, toast, actor, reload } = useDash();
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState(a.time.slice(0, 5));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await rescheduleAppointment(a.id, { date, time, reason, actor });
      await reload();
      closeModal();
      toast('Appointment rescheduled');
    } catch (err: any) {
      toast(err.message || 'Error rescheduling');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Reschedule" actions={<><button onClick={closeModal}>Close</button><button className="pri" disabled={busy} onClick={go}>{busy ? 'Rescheduling…' : 'Reschedule'}</button></>}>
      <div className="note">{a.customer_name}, {a.date} at {fmtTime(a.time)}</div>
      <label>New date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>New time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is it moving?" /></label>
    </Dialog>
  );
}

function CancelForm({ a }: { a: Appointment }) {
  const { closeModal, toast, actor, reload } = useDash();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await cancelAppointment(a.id, { reason, source: 'staff', actor });
      await reload();
      closeModal();
      toast('Appointment cancelled');
    } catch (err: any) {
      toast(err.message || 'Error cancelling');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Cancel appointment" actions={<><button onClick={closeModal}>Keep it</button><button className="dng" disabled={busy} onClick={go}>{busy ? 'Cancelling…' : 'Cancel appointment'}</button></>}>
      <div className="note">{a.customer_name}, {a.date} at {fmtTime(a.time)}</div>
      <label>Reason (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
    </Dialog>
  );
}

function HistoryModal({ a }: { a: Appointment }) {
  const { s, closeModal } = useDash();
  const [items, setItems] = useState<AppointmentHistoryItem[]>(s.history[a.id] ?? []);

  useEffect(() => {
    fetchAppointmentHistory(a.id).then((res) => {
      if (res && res.length) setItems(res);
    }).catch(() => {});
  }, [a.id]);

  return (
    <Dialog title={`History: ${a.customer_name}`} actions={<button onClick={closeModal}>Close</button>}>
      <div className="tl">
        {items.map((h) => (
          <div key={h.id}><b>{h.event}</b><br />
            {h.old_value && <small className="mono">{h.old_value} → {h.new_value}<br /></small>}
            <span className="st">{h.actor_type === 'ai_agent' ? 'AI agent' : 'Staff'}</span> <small className="mut">{h.actor}</small></div>
        ))}
        {items.length === 0 && <p className="mut">No history recorded yet.</p>}
      </div>
    </Dialog>
  );
}

function FlipCard({ a, i, idx }: { a: Appointment; i: number; idx: number }) {
  const { can, openModal } = useDash();
  const o = i - idx;
  const editable = can && a.status !== 'completed' && a.status !== 'cancelled';
  return (
    <div className="fc" aria-hidden={o !== 0}
      ref={(el) => { if (el) { if (o !== 0) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }}
      style={{ transform: o < 0 ? 'translateY(-40px) rotateX(75deg)' : `translateY(${o * 14}px) scale(${1 - o * 0.04})`, opacity: o < 0 ? 0 : o > 3 ? 0 : 1 - o * 0.25, zIndex: 50 - i, pointerEvents: o === 0 ? 'auto' : 'none' }}>
      <div className="l">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mono">{pad(i + 1)}</span><span className={`st ${a.status}`}>{a.status}</span></div>
        <small className="mut">Customer appointment</small>
        <h2>{a.customer_name}</h2>
        <div className="meta">
          <div><small>Date</small>{a.day_of_week}, {a.date}</div>
          <div><small>Time</small><span className="mono">{fmtTime(a.time)}</span></div>
          <div style={{ gridColumn: '1/-1' }}><small>Service</small>{a.service}</div>
        </div>
        {a.notes && <div className="note">{a.notes}</div>}
        <div className="acts">
          <button onClick={() => openModal(<HistoryModal a={a} />)}>History</button>
          {editable && <>
            <button onClick={() => openModal(<RescheduleForm a={a} />)}>Reschedule</button>
            <button onClick={() => openModal(<ApptForm id={a.id} />)}>Edit</button>
            <button className="dng" onClick={() => openModal(<CancelForm a={a} />)}>Cancel</button>
          </>}
        </div>
      </div>
      <div className="r" style={{ background: a.image ? undefined : PANEL[i % PANEL.length] }}>
        <BotMark /><div className="by">Handled by: {handledBy(a)}</div>
      </div>
    </div>
  );
}

export function AppointmentsView() {
  const { s, can, openModal } = useDash();
  const [mode, setMode] = useState<'stack' | 'table'>('stack');
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState(''); const [sf, setSf] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const last = s.appts.length - 1;
  const step = (d: number) => setIdx((i) => Math.max(0, Math.min(last, i + d)));
  useEffect(() => {
    const el = ref.current; if (!el || mode !== 'stack') return;
    let lock = 0;
    const wheel = (e: WheelEvent) => { e.preventDefault(); if (Date.now() - lock < 500) return; lock = Date.now(); step(e.deltaY > 0 ? 1 : -1); };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, [mode, last]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = s.appts.filter((a) => (a.customer_name + a.service).toLowerCase().includes(q.toLowerCase()) && (!sf || a.status === sf));
  return (
    <>
      <PageHead title="Appointments" right={
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="seg"><button className={mode === 'stack' ? 'on' : ''} onClick={() => setMode('stack')}>Card stack</button><button className={mode === 'table' ? 'on' : ''} onClick={() => setMode('table')}>Table</button></div>
          {can && <button className="pri" onClick={() => openModal(<ApptForm />)}>New appointment</button>}
        </div>} />
      {mode === 'table' ? (
        <div className="card" style={{ overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input style={{ flex: 1 }} placeholder="Search customer or service" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={sf} onChange={(e) => setSf(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <table><thead><tr><th>Customer</th><th>Date</th><th>Time</th><th>Service</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((a) => <tr key={a.id}><td>{a.customer_name}</td><td className="mono">{a.date}</td><td className="mono">{fmtTime(a.time)}</td><td>{a.service}</td><td><span className={`st ${a.status}`}>{a.status}</span></td><td><button onClick={() => openModal(<HistoryModal a={a} />)}>History</button></td></tr>)}</tbody></table>
        </div>
      ) : (
        <>
          <div className="stackwrap" ref={ref} tabIndex={0} aria-label="Appointment cards"
            onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}>
            {s.appts.map((a, i) => <FlipCard key={a.id} a={a} i={i} idx={idx} />)}
          </div>
          <div className="ctl">
            <button aria-label="Previous" onClick={() => step(-1)}>←</button>
            {s.appts.map((a, i) => <button key={a.id} className={`dot ${i === idx ? 'on' : ''}`} aria-label={`Card ${i + 1}`} onClick={() => setIdx(i)} />)}
            <button aria-label="Next" onClick={() => step(1)}>→</button>
          </div>
        </>
      )}
    </>
  );
}
