import { MockStorage, simulateLatency } from './storage';
import {
  Appointment,
  AppointmentCancelInput,
  AppointmentCreateInput,
  AppointmentHistoryItem,
  AppointmentRescheduleInput,
  AppointmentUpdateInput,
  Cancellation,
  PaginatedResponse,
} from '@/lib/types';

const APPOINTMENT_IMAGES = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&auto=format&fit=crop',
];

const CARD_THEMES = [
  { bg: '#1c1917', fg: '#fafaf9' }, // Stone
  { bg: '#0c4a6e', fg: '#f0f9ff' }, // Sky
  { bg: '#831843', fg: '#fdf2f8' }, // Pink
  { bg: '#14532d', fg: '#f0fdf4' }, // Emerald
  { bg: '#312e81', fg: '#eef2ff' }, // Indigo
  { bg: '#7c2d12', fg: '#fff7ed' }, // Orange/Rust
];

function getDayOfWeek(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'Monday';
  }
}

export const mockAppointmentsService = {
  async getAppointments(params?: {
    status?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    customer?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    await simulateLatency(250);
    let items = [...MockStorage.getAppointments()];

    if (params?.status && params.status !== 'all') {
      items = items.filter((a) => a.status.toLowerCase() === params.status?.toLowerCase());
    }

    if (params?.date) {
      items = items.filter((a) => a.date === params.date);
    }

    if (params?.date_from) {
      items = items.filter((a) => a.date >= params.date_from!);
    }

    if (params?.date_to) {
      items = items.filter((a) => a.date <= params.date_to!);
    }

    if (params?.customer) {
      const q = params.customer.toLowerCase();
      items = items.filter(
        (a) =>
          a.customer_name.toLowerCase().includes(q) ||
          a.customer_phone.includes(q) ||
          (a.customer_email && a.customer_email.toLowerCase().includes(q))
      );
    }

    // Sort by date and time ascending for scheduled/confirmed, or newest updated
    items.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));

    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getAppointmentById(id: string): Promise<Appointment> {
    await simulateLatency(150);
    const item = MockStorage.getAppointments().find((a) => a.id === id);
    if (!item) {
      throw {
        success: false,
        message: `Appointment with ID ${id} was not found.`,
        error_code: 'APPOINTMENT_NOT_FOUND',
      };
    }
    return item;
  },

  async createAppointment(input: AppointmentCreateInput): Promise<Appointment> {
    await simulateLatency(300);

    const apts = MockStorage.getAppointments();
    const id = `apt-${Date.now().toString().slice(-5)}`;
    const theme = CARD_THEMES[apts.length % CARD_THEMES.length];
    const image = APPOINTMENT_IMAGES[apts.length % APPOINTMENT_IMAGES.length];
    const day_of_week = getDayOfWeek(input.date);

    const currentUser = MockStorage.getCurrentUser();
    const actorName = currentUser ? `${currentUser.name} (${currentUser.role === 'CLIENT_ADMIN' ? 'Admin' : 'Staff'})` : 'TalkAor Voice Agent';

    const newAppointment: Appointment = {
      id,
      customer_id: input.customer_id || `cust-${Date.now().toString().slice(-4)}`,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      date: input.date,
      time: input.time,
      day_of_week,
      service: input.service,
      status: 'scheduled',
      agent_id: input.agent_id || 'agent-1',
      agent_name: 'Aria (Front Desk AI)',
      notes: input.notes || 'Created via dashboard booking manager.',
      image,
      background: theme.bg,
      foreground: theme.fg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    apts.unshift(newAppointment);
    MockStorage.setAppointments(apts);

    // Record initial history
    const history = MockStorage.getHistory();
    history[id] = [
      {
        id: `hist-${Date.now()}`,
        appointment_id: id,
        event: 'Appointment Created',
        new_value: `${day_of_week}, ${input.date} at ${input.time} (${input.service})`,
        actor: actorName,
        actor_type: currentUser ? 'staff' : 'ai_agent',
        timestamp: new Date().toISOString(),
      },
    ];
    MockStorage.setHistory(history);

    // Also update customer record if customer exists
    const customers = MockStorage.getCustomers();
    const existingCust = customers.find(
      (c) => c.phone === input.customer_phone || (input.customer_email && c.email === input.customer_email)
    );
    if (existingCust) {
      existingCust.total_appointments = (existingCust.total_appointments || 0) + 1;
      MockStorage.setCustomers(customers);
    } else {
      // Create new customer record automatically
      customers.unshift({
        id: newAppointment.customer_id,
        name: input.customer_name,
        phone: input.customer_phone,
        email: input.customer_email || `${input.customer_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        created_at: new Date().toISOString(),
        total_appointments: 1,
        notes: `Auto-registered via appointment booking for ${input.service}.`,
      });
      MockStorage.setCustomers(customers);
    }

    return newAppointment;
  },

  async updateAppointment(id: string, input: AppointmentUpdateInput): Promise<Appointment> {
    await simulateLatency(250);

    const apts = MockStorage.getAppointments();
    const index = apts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Appointment with ID ${id} was not found.`,
        error_code: 'APPOINTMENT_NOT_FOUND',
      };
    }

    const current = apts[index];
    const currentUser = MockStorage.getCurrentUser();
    const actorName = currentUser ? `${currentUser.name} (${currentUser.role === 'CLIENT_ADMIN' ? 'Admin' : 'Staff'})` : 'TalkAor Voice Agent';

    // Track status change in history
    if (input.status && input.status !== current.status) {
      const history = MockStorage.getHistory();
      if (!history[id]) history[id] = [];
      history[id].unshift({
        id: `hist-${Date.now()}`,
        appointment_id: id,
        event: 'Status Changed',
        old_value: current.status,
        new_value: input.status,
        actor: actorName,
        actor_type: 'staff',
        timestamp: new Date().toISOString(),
      });
      MockStorage.setHistory(history);
    }

    const updated: Appointment = {
      ...current,
      customer_name: input.customer_name ?? current.customer_name,
      customer_phone: input.customer_phone ?? current.customer_phone,
      customer_email: input.customer_email ?? current.customer_email,
      service: input.service ?? current.service,
      status: input.status ?? current.status,
      notes: input.notes ?? current.notes,
      updated_at: new Date().toISOString(),
    };

    apts[index] = updated;
    MockStorage.setAppointments(apts);

    return updated;
  },

  async cancelAppointment(id: string, input?: AppointmentCancelInput): Promise<{ message: string; appointment: Appointment }> {
    await simulateLatency(300);

    const apts = MockStorage.getAppointments();
    const index = apts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Appointment with ID ${id} was not found.`,
        error_code: 'APPOINTMENT_NOT_FOUND',
      };
    }

    const current = apts[index];
    if (current.status === 'cancelled') {
      throw {
        success: false,
        message: 'This appointment is already cancelled.',
        error_code: 'ALREADY_CANCELLED',
      };
    }

    const reason = input?.reason?.trim() || 'Cancelled by client request';
    const currentUser = MockStorage.getCurrentUser();
    const actorName = currentUser ? currentUser.name : 'Aria (Front Desk AI)';

    // Update appointment status
    current.status = 'cancelled';
    current.updated_at = new Date().toISOString();
    apts[index] = current;
    MockStorage.setAppointments(apts);

    // Record in history
    const history = MockStorage.getHistory();
    if (!history[id]) history[id] = [];
    history[id].unshift({
      id: `hist-${Date.now()}`,
      appointment_id: id,
      event: 'Appointment Cancelled',
      old_value: 'confirmed/scheduled',
      new_value: reason,
      actor: actorName,
      actor_type: currentUser ? 'staff' : 'ai_agent',
      timestamp: new Date().toISOString(),
    });
    MockStorage.setHistory(history);

    // Record in cancellations table
    const cancellations = MockStorage.getCancellations();
    const newCancellation: Cancellation = {
      id: `canc-${Date.now().toString().slice(-4)}`,
      appointment_id: id,
      original_date: current.date,
      original_time: current.time,
      customer_id: current.customer_id,
      customer_name: current.customer_name,
      customer_phone: current.customer_phone,
      reason,
      cancelled_by: currentUser ? 'user' : 'ai_agent',
      cancelled_by_name: actorName,
      timestamp: new Date().toISOString(),
    };
    cancellations.unshift(newCancellation);
    MockStorage.setCancellations(cancellations);

    const msg = `Appointment for ${current.customer_name} has been successfully cancelled.`;
    return { message: msg, appointment: current };
  },

  async rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput
  ): Promise<{ message: string; appointment: Appointment }> {
    await simulateLatency(300);

    const apts = MockStorage.getAppointments();
    const index = apts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Appointment with ID ${id} was not found.`,
        error_code: 'APPOINTMENT_NOT_FOUND',
      };
    }

    const current = apts[index];
    const oldDateStr = `${current.day_of_week}, ${current.date} at ${current.time}`;
    const newDayOfWeek = getDayOfWeek(input.new_date);
    const reason = input.reason?.trim() ? ` (Reason: ${input.reason.trim()})` : '';

    current.date = input.new_date;
    current.time = input.new_time;
    current.day_of_week = newDayOfWeek;
    current.status = 'rescheduled';
    current.updated_at = new Date().toISOString();
    apts[index] = current;
    MockStorage.setAppointments(apts);

    const currentUser = MockStorage.getCurrentUser();
    const actorName = currentUser ? currentUser.name : 'Leo (After-Hours Assistant)';

    // Record in history
    const history = MockStorage.getHistory();
    if (!history[id]) history[id] = [];
    history[id].unshift({
      id: `hist-${Date.now()}`,
      appointment_id: id,
      event: 'Rescheduled',
      old_value: oldDateStr,
      new_value: `${newDayOfWeek}, ${input.new_date} at ${input.new_time}${reason}`,
      actor: actorName,
      actor_type: currentUser ? 'staff' : 'ai_agent',
      timestamp: new Date().toISOString(),
    });
    MockStorage.setHistory(history);

    const msg = `Appointment successfully rescheduled to ${newDayOfWeek}, ${input.new_date} at ${input.new_time}.`;
    return { message: msg, appointment: current };
  },

  async getAppointmentHistory(id: string): Promise<AppointmentHistoryItem[]> {
    await simulateLatency(150);
    const history = MockStorage.getHistory();
    return history[id] || [];
  },
};
