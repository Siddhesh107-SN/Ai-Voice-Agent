from fastapi import APIRouter, Depends
from backend.app.api.deps import get_current_user, get_tenant_business_id
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total appointments for this business
    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE client_id = ?", (client_id,))
    total_appointments = cursor.fetchone()["c"]

    # Appointments by status
    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE client_id = ? AND status = 'scheduled'", (client_id,))
    scheduled_appointments = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE client_id = ? AND status = 'cancelled'", (client_id,))
    cancelled_appointments = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE client_id = ? AND status = 'completed'", (client_id,))
    completed_appointments = cursor.fetchone()["c"]

    # Today's appointments (for mock/demo date 2026-10-12 or similar)
    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE client_id = ? AND date = '2026-10-12'", (client_id,))
    today_appointments = cursor.fetchone()["c"]

    # Customers
    cursor.execute("SELECT COUNT(*) as c FROM customers WHERE client_id = ?", (client_id,))
    total_customers = cursor.fetchone()["c"]

    # Agents
    cursor.execute("SELECT COUNT(*) as c FROM agents WHERE client_id = ?", (client_id,))
    total_agents = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM agents WHERE client_id = ? AND status = 'active'", (client_id,))
    active_agents = cursor.fetchone()["c"]

    # Calls
    cursor.execute("SELECT COUNT(*) as c FROM calls WHERE client_id = ?", (client_id,))
    total_calls = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM calls WHERE client_id = ? AND date_time LIKE '2026-10-05%'", (client_id,))
    calls_today = cursor.fetchone()["c"]

    # Recent calls
    cursor.execute("SELECT * FROM calls WHERE client_id = ? ORDER BY date_time DESC LIMIT 5", (client_id,))
    recent_calls = [dict(r) for r in cursor.fetchall()]

    # Upcoming appointments
    cursor.execute("SELECT * FROM appointments WHERE client_id = ? AND status != 'cancelled' ORDER BY date ASC, time ASC LIMIT 5", (client_id,))
    upcoming_appointments = [dict(r) for r in cursor.fetchall()]

    conn.close()

    weekly_stats = [
        {"day": "Mon", "calls": 42, "appointments": 8, "completion_rate": 92},
        {"day": "Tue", "calls": 38, "appointments": 6, "completion_rate": 88},
        {"day": "Wed", "calls": 45, "appointments": 9, "completion_rate": 95},
        {"day": "Thu", "calls": 52, "appointments": 11, "completion_rate": 91},
        {"day": "Fri", "calls": 60, "appointments": 14, "completion_rate": 96},
        {"day": "Sat", "calls": 34, "appointments": 7, "completion_rate": 89},
        {"day": "Sun", "calls": 18, "appointments": 3, "completion_rate": 85},
    ]

    return {
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "scheduled_appointments": scheduled_appointments,
        "cancelled_appointments": cancelled_appointments,
        "completed_appointments": completed_appointments,
        "total_customers": total_customers,
        "total_agents": total_agents,
        "active_agents": active_agents,
        "total_calls": total_calls,
        "calls_today": calls_today,
        "weekly_stats": weekly_stats,
        "recent_calls": recent_calls,
        "upcoming_appointments": upcoming_appointments,
    }
