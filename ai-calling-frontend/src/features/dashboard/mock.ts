import type { Appointment, ApptStatus, AppointmentHistoryItem, MockData } from './types';
import { dow } from './util';

// Demo data only. TODO(api): replace every array below with data from your backend.
const iso = '2026-10-20T09:00:00Z';
const ap = (id: string, cid: string, name: string, phone: string, date: string, time: string, service: string, status: ApptStatus, agent: string | undefined, staff: string | undefined, notes: string): Appointment => ({
  id, customer_id: cid, customer_name: name, customer_phone: phone, customer_email: name.split(' ')[0].toLowerCase() + '@mail.in',
  date, time, day_of_week: dow(date), service, status, agent_name: agent, staff_name: staff, notes, created_at: iso, updated_at: iso,
});
const h = (id: string, a: string, event: string, actor: string, type: 'staff' | 'ai_agent', old_value?: string, new_value?: string): AppointmentHistoryItem =>
  ({ id, appointment_id: a, event, old_value, new_value, actor, actor_type: type, timestamp: iso });

const cancelled = ap('a5', 'c5', 'Pooja Kale', '+91 98450 12345', '2026-10-23', '14:30:00', 'Hair spa', 'cancelled', 'Aria', undefined, 'Booked by phone.');
cancelled.cancel_reason = 'Caller asked to cancel.'; cancelled.cancelled_by = 'ai_agent';

export const MOCK: MockData = {
  appts: [
    ap('a1', 'c1', 'Ananya Deshmukh', '+91 98220 10001', '2026-10-26', '10:30:00', 'Dental check-up and cleaning', 'confirmed', 'Aria', undefined, 'Prefers a morning slot.'),
    ap('a2', 'c2', 'Rohan Patil', '+91 98220 10002', '2026-10-27', '16:00:00', 'Physiotherapy, first session', 'scheduled', undefined, 'Meera', 'Referred by Dr. Kulkarni.'),
    ap('a3', 'c3', 'Sneha Joshi', '+91 98220 10003', '2026-10-28', '11:15:00', 'Skin consultation', 'rescheduled', 'Aria', undefined, 'Moved from Oct 25 at her request.'),
    ap('a4', 'c4', 'Vikram Shinde', '+91 98220 10004', '2026-10-24', '09:00:00', 'Eye examination', 'completed', undefined, 'Ravi', 'Follow-up in 6 months.'),
    cancelled,
  ],
  history: {
    a1: [h('h1', 'a1', 'Booked by call', 'Aria', 'ai_agent'), h('h2', 'a1', 'Confirmed by SMS', 'Aria', 'ai_agent')],
    a2: [h('h3', 'a2', 'Booked by call', 'Aria', 'ai_agent')],
    a3: [h('h4', 'a3', 'Booked by call', 'Aria', 'ai_agent'), h('h5', 'a3', 'Rescheduled', 'Meera', 'staff', '2026-10-25', '2026-10-28')],
    a4: [h('h6', 'a4', 'Booked by call', 'Aria', 'ai_agent'), h('h7', 'a4', 'Marked completed', 'Ravi', 'staff')],
    a5: [h('h8', 'a5', 'Booked by call', 'Aria', 'ai_agent'), h('h9', 'a5', 'Cancelled', 'Aria', 'ai_agent')],
  },
  agents: [
    { id: 'g1', name: 'Aria', languages: 'English, Hindi', phone: '+91 20 4000 1101', online: true, calls_today: 42, business_id: 'b1' },
    { id: 'g2', name: 'Veda', languages: 'Marathi, Hindi', phone: '+91 20 4000 1102', online: true, calls_today: 31, business_id: 'b1' },
    { id: 'g3', name: 'Kiran', languages: 'English', phone: '+91 20 4000 1103', online: true, calls_today: 18, business_id: 'b1' },
    { id: 'g4', name: 'Nila', languages: 'English', phone: '+91 20 4000 2101', online: true, calls_today: 21, business_id: 'b2' },
    { id: 'g5', name: 'Arjun', languages: 'Marathi, Hindi', phone: '+91 20 4000 3101', online: true, calls_today: 17, business_id: 'b3' },
    { id: 'g6', name: 'Isha', languages: 'English, Hindi', phone: '+91 20 4000 4101', online: false, calls_today: 0, business_id: 'b4' },
  ],
  calls: [
    { id: 'k1', customer_name: 'Ananya Deshmukh', customer_phone: '+91 98220 10001', agent_name: 'Aria', duration_seconds: 134, status: 'completed', outcome: 'BOOKED', summary: 'Booked a dental check-up for Monday morning.', has_recording: true,
      transcript: [{ speaker: 'Aria', text: 'Namaste, Sunrise Dental, how can I help?', time: '0:00' }, { speaker: 'Caller', text: 'I need a check-up, Monday morning if possible.', time: '0:06' }, { speaker: 'Aria', text: 'Monday 10:30 is open. Shall I book it?', time: '0:12' }, { speaker: 'Caller', text: 'Yes please.', time: '0:16' }] },
    { id: 'k2', customer_name: 'Rahul Mane', customer_phone: '+91 98220 10010', agent_name: 'Veda', duration_seconds: 48, status: 'in_progress', summary: 'Caller is asking about root canal pricing.', has_recording: false,
      transcript: [{ speaker: 'Veda', text: 'Sunrise Dental, kasa madat karu?', time: '0:00' }, { speaker: 'Caller', text: 'Root canal cha kharcha kiti?', time: '0:05' }] },
    { id: 'k3', customer_name: 'Mahesh Pawar', customer_phone: '+91 98220 10011', agent_name: 'Veda', duration_seconds: 62, status: 'completed', outcome: 'INQUIRY', summary: 'Asked about clinic hours and parking.', has_recording: true,
      transcript: [{ speaker: 'Veda', text: 'Sunrise Dental, how can I help?', time: '0:00' }, { speaker: 'Caller', text: 'What time do you close, and is there parking?', time: '0:04' }] },
    { id: 'k4', customer_name: 'Unknown number', customer_phone: '+91 90000 00000', agent_name: 'Kiran', duration_seconds: 0, status: 'missed', summary: 'No answer: all agents were offline.', has_recording: false },
    { id: 'k5', customer_name: 'Sneha Joshi', customer_phone: '+91 98220 10003', agent_name: 'Aria', duration_seconds: 108, status: 'completed', outcome: 'BOOKED', summary: 'Rescheduled skin consultation to Wednesday.', has_recording: true,
      transcript: [{ speaker: 'Aria', text: 'Hello Sneha, calling about your Oct 25 slot?', time: '0:00' }, { speaker: 'Caller', text: 'Can we move it to Wednesday?', time: '0:05' }] },
  ],
  staff: [
    { id: 's1', name: 'Meera Kulkarni', title: 'Receptionist', days: [true, true, true, true, true, true, false] },
    { id: 's2', name: 'Ravi Jadhav', title: 'Dentist', days: [true, true, false, true, true, false, false] },
    { id: 's3', name: 'Neha Bhosale', title: 'Assistant', days: [false, true, true, true, true, true, false] },
  ],
  services: ['Check-up', 'Cleaning', 'Root canal', 'Whitening'],
  hours: [
    ...Array.from({ length: 5 }, () => ({ open: '09:00', close: '18:00', closed: false })),
    { open: '09:00', close: '14:00', closed: false }, { open: '00:00', close: '00:00', closed: true },
  ],
  businesses: [
    { id: 'b1', name: 'Sunrise Dental Care', plan: 'Growth', minutes_used: 186, minutes_limit: 300, status: 'Active', renews_on: '24 Nov 2026', last_login: 'Today 09:12', staff_pin: '1234' },
    { id: 'b2', name: 'Kale Wellness Studio', plan: 'Starter', minutes_used: 96, minutes_limit: 100, status: 'Active', renews_on: '02 Nov 2026', last_login: 'Yesterday', staff_pin: '2580' },
    { id: 'b3', name: 'Patil Auto Care', plan: 'Growth', minutes_used: 140, minutes_limit: 300, status: 'Active', renews_on: '30 Oct 2026', last_login: '2 days ago', staff_pin: '7391' },
    { id: 'b4', name: 'BrightPath Tuition', plan: 'Business', minutes_used: 640, minutes_limit: 700, status: 'Active', renews_on: '15 Nov 2026', last_login: 'Today 08:30', staff_pin: '' },
    { id: 'b5', name: 'Orbit Salon', plan: 'Starter', minutes_used: 12, minutes_limit: 100, status: 'Suspended', renews_on: '—', last_login: '9 days ago', staff_pin: '4410' },
  ],
  requests: [
    { id: 'r1', business: 'Sunrise Wellness', plan: 'Growth', billing: 'monthly', amount: 3499, status: 'Payment submitted' },
    { id: 'r2', business: 'Kale Yoga Studio', plan: 'Starter', billing: 'yearly', amount: 14990, status: 'Payment submitted' },
    { id: 'r3', business: 'BrightPath Coaching', plan: 'Business', billing: 'monthly', amount: 6999, status: 'Waiting for review' },
  ],
  messages: [
    { id: 'm1', name: 'Rahul Sharma', email: 'rahul@clinicmail.in', phone: '+91 98220 11002', message: 'Interested in the Growth plan for my two clinics. Can we get a demo this week?', received_at: '24 Oct, 09:40', read: false, handled: false },
    { id: 'm2', name: 'Priya Nair', email: 'priya@bloomsalon.in', phone: '+91 90110 55873', message: 'Does the agent speak Marathi? We get many local callers.', received_at: '23 Oct, 18:05', read: false, handled: false },
    { id: 'm3', name: 'Amit Gokhale', email: 'amit@gokhalelaw.in', phone: '+91 98500 77120', message: 'Please send the pricing for 700 minutes a month.', received_at: '22 Oct, 11:20', read: true, handled: true },
  ],
  logs: [
    { at: '24 Oct 15:58', text: 'Aria booked Ananya Deshmukh for Mon 10:30', level: 'info' },
    { at: '24 Oct 15:40', text: 'Kale Wellness Studio used 96% of its minutes', level: 'warn' },
    { at: '24 Oct 15:12', text: 'Calendar sync retry failed for Patil Auto Care', level: 'error' },
    { at: '24 Oct 14:50', text: 'Access request from BrightPath Coaching reviewed', level: 'info' },
    { at: '24 Oct 09:12', text: 'Sunrise Dental Care admin signed in', level: 'info' },
  ],
};
