import { MockStorage, simulateLatency } from './storage';
import { DashboardSummary } from '@/lib/types';

export const mockDashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    await simulateLatency(250);

    const appointments = MockStorage.getAppointments();
    const customers = MockStorage.getCustomers();
    const agents = MockStorage.getAgents();
    const calls = MockStorage.getCalls();

    const todayStr = '2026-10-05'; // Current system simulated date or today
    const nowIso = new Date().toISOString().slice(0, 10);

    const todayAppointments = appointments.filter(
      (a) => a.date === todayStr || a.date === nowIso
    ).length;

    const scheduled = appointments.filter((a) => a.status === 'scheduled').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const completed = appointments.filter((a) => a.status === 'completed').length;

    const activeAgents = agents.filter((a) => a.status === 'active').length;

    const callsToday = calls.filter(
      (c) => c.date_time.startsWith(todayStr) || c.date_time.startsWith(nowIso)
    ).length;

    const weekly_stats = [
      { day: 'Mon', calls: 38, appointments: 8, completion_rate: 94 },
      { day: 'Tue', calls: 42, appointments: 11, completion_rate: 91 },
      { day: 'Wed', calls: 50, appointments: 14, completion_rate: 96 },
      { day: 'Thu', calls: 47, appointments: 9, completion_rate: 89 },
      { day: 'Fri', calls: 62, appointments: 16, completion_rate: 98 },
      { day: 'Sat', calls: 35, appointments: 12, completion_rate: 92 },
      { day: 'Sun', calls: 18, appointments: 4, completion_rate: 100 },
    ];

    const upcoming = appointments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
      .slice(0, 4);

    const recentCalls = calls.slice(0, 4);

    return {
      total_appointments: appointments.length,
      today_appointments: todayAppointments || 2,
      scheduled_appointments: scheduled,
      cancelled_appointments: cancelled,
      completed_appointments: completed,
      total_customers: customers.length,
      total_agents: agents.length,
      active_agents: activeAgents,
      total_calls: calls.length + 284, // Realistic scale
      calls_today: callsToday || 14,
      weekly_stats,
      recent_calls: recentCalls,
      upcoming_appointments: upcoming,
    };
  },
};
