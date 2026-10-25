'use client';
import { useState } from 'react';
import { useDash } from './store';
import { TODAY, dow, fmtTime, pad } from './util';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarCard() {
  const { s, set } = useDash();
  const [ym, setYm] = useState({
    y: Number(TODAY.slice(0, 4)),
    m: Number(TODAY.slice(5, 7)) - 1,
  });

  const first = new Date(ym.y, ym.m, 1).getDay();
  const count = new Date(ym.y, ym.m + 1, 0).getDate();
  const booked = new Set(
    s.appts.filter((a) => a.status !== 'cancelled').map((a) => a.date)
  );

  const move = (d: number) =>
    setYm((p) => {
      const n = new Date(p.y, p.m + d, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <b>
          {MONTHS[ym.m]} {ym.y}
        </b>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" aria-label="Previous month" onClick={() => move(-1)}>
            ←
          </button>
          <button type="button" aria-label="Next month" onClick={() => move(1)}>
            →
          </button>
        </span>
      </div>
      <div className="calp">
        <div className="cal">
          {'SMTWTFS'.split('').map((d, i) => (
            <b key={i} className="mut">
              {d}
            </b>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <span key={'empty-' + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const n = i + 1;
            const d = `${ym.y}-${pad(ym.m + 1)}-${pad(n)}`;
            const wd = (new Date(ym.y, ym.m, n).getDay() + 6) % 7; // Mon=0 .. Sun=6
            const isPast = d < TODAY;
            const isClosed = Boolean(s.hours && s.hours[wd]?.closed);
            const closed = isPast || isClosed;
            const has = booked.has(d);

            return (
              <button
                key={d}
                type="button"
                disabled={closed}
                className={`dy ${closed ? 'cl' : 'av'} ${d === TODAY ? 't' : ''} ${
                  d === s.day ? 's' : ''
                }`}
                onClick={() => set((p) => ({ ...p, day: d }))}
                aria-label={`${d}${closed ? ', closed' : has ? ', has bookings' : ', available'}`}
              >
                {n}
                {has && <i />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="leg">
        <span>
          <i style={{ background: '#3d74f0' }} />
          Available
        </span>
        <span>
          <i style={{ background: '#F26B2A' }} />
          Has bookings
        </span>
        <span>
          <i style={{ background: 'var(--line)' }} />
          Closed or past
        </span>
      </div>
    </div>
  );
}

export function DayRoster() {
  const { s } = useDash();
  const list = s.appts.filter((a) => a.date === s.day && a.status !== 'cancelled');

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <b className="mono" style={{ fontSize: 12 }}>DAY SCHEDULE</b>
          <small className="mut" style={{ display: 'block', fontSize: 11 }}>
            {dow(s.day)}
          </small>
        </div>
        <span className="mono mut">{s.day}</span>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        {list.map((a) => (
          <div className="ro" key={a.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{a.customer_name}</b>
              <span className={`st ${a.status}`}>{fmtTime(a.time)}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{a.service}</div>
            <small className="mut">
              Handled by {a.agent_name ? `AI Agent ${a.agent_name}` : `Staff ${a.staff_name || 'Staff'}`}
            </small>
          </div>
        ))}
        {list.length === 0 && (
          <p className="mut" style={{ margin: '6px 0' }}>
            Nothing booked for this day.
          </p>
        )}
      </div>
    </div>
  );
}
