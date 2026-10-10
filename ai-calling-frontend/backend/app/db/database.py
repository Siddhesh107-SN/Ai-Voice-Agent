import sqlite3
import json
import datetime
try:
    from backend.app.core.config import settings
except ImportError:
    from app.core.config import settings

def get_db_connection():
    conn = sqlite3.connect(settings.DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Businesses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
        status TEXT NOT NULL DEFAULT 'active',
        plan TEXT NOT NULL DEFAULT 'PRO',
        logo TEXT,
        description TEXT,
        working_hours TEXT DEFAULT 'Mon - Fri: 9:00 AM - 7:00 PM',
        services_json TEXT,
        appointment_settings_json TEXT,
        ai_agent_settings_json TEXT,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL
    );
    """)

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # Customers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # Appointments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        day_of_week TEXT NOT NULL,
        service TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        staff_id TEXT,
        staff_name TEXT,
        agent_id TEXT,
        agent_name TEXT,
        notes TEXT,
        image TEXT,
        background TEXT,
        foreground TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # Appointment history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointment_history (
        id TEXT PRIMARY KEY,
        appointment_id TEXT NOT NULL,
        event TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        actor TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
    );
    """)

    # Calls table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        has_recording INTEGER NOT NULL DEFAULT 0,
        recording_url TEXT,
        has_transcript INTEGER NOT NULL DEFAULT 0,
        transcript_json TEXT,
        summary TEXT,
        date_time TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # Cancellations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cancellations (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        appointment_id TEXT NOT NULL,
        original_date TEXT NOT NULL,
        original_time TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        reason TEXT,
        cancelled_by TEXT NOT NULL,
        cancelled_by_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # AI Agents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        phone_number TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        voice_id TEXT,
        accent TEXT,
        configuration_json TEXT,
        language TEXT DEFAULT 'English',
        health TEXT DEFAULT 'HEALTHY',
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    # Audit logs table (for platform and business administrative events)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO',
        service TEXT NOT NULL,
        business_id TEXT,
        business_name TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        event TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        details TEXT NOT NULL,
        request_id TEXT,
        endpoint TEXT,
        http_method TEXT,
        status_code INTEGER,
        error_message TEXT,
        stack_trace TEXT,
        metadata_json TEXT
    );
    """)

    # Transactions / Revenue table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PAID',
        plan TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES businesses (id)
    );
    """)

    conn.commit()

    # Seed initial data if businesses table is empty
    cursor.execute("SELECT COUNT(*) as count FROM businesses")
    row = cursor.fetchone()
    if row["count"] == 0:
        seed_db(conn)

    conn.close()

def seed_db(conn):
    cursor = conn.cursor()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Businesses
    businesses = [
        (
            "client-talkaor-01",
            "TalkAor Voice Wellness & Salon Studio",
            "Sarah Jenkins",
            "admin@talkaor.com",
            "+1 (555) 234-8900",
            "742 Evergreen Terrace, Suite 300, San Francisco, CA 94107",
            "America/Los_Angeles",
            "active",
            "PRO",
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80",
            "Luxury hair styling, spa consultations and neural voice booking reception.",
            "Mon - Sat: 8:00 AM - 8:00 PM",
            json.dumps(["Hair Consultation", "Premium Styling", "Color Treatment", "Facial Glow Therapy"]),
            json.dumps({"slot_duration": 45, "advance_booking_days": 30, "cancellation_notice_hours": 24}),
            json.dumps({"default_agent": "agent-1", "voice_confirmation": True}),
            "2026-01-01T08:00:00Z",
            "2026-10-06T15:20:00Z"
        ),
        (
            "client-grooming-02",
            "The Grooming Factory",
            "John Doe",
            "john@groomingfactory.com",
            "+91 98765 43210",
            "45 Commercial Street, Bandra West, Mumbai, MH 400050",
            "Asia/Kolkata",
            "active",
            "PRO",
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&q=80",
            "Premier gentlemen barbershop & beard sculpting salon with multi-lingual AI concierge.",
            "Daily: 9:00 AM - 9:00 PM",
            json.dumps(["Signature Haircut", "Beard Sculpting", "Executive Shave", "Charcoal Detan"]),
            json.dumps({"slot_duration": 30, "advance_booking_days": 14, "cancellation_notice_hours": 4}),
            json.dumps({"default_agent": "agent-zoya", "voice_confirmation": True}),
            "2026-02-15T10:00:00Z",
            "2026-10-06T17:15:00Z"
        ),
        (
            "client-apex-03",
            "Apex Dental Care & Orthodontics",
            "Dr. Marcus Vance",
            "marcus@apexdental.com",
            "+1 (555) 781-9022",
            "1200 Market Street, Suite 500, Philadelphia, PA 19107",
            "America/New_York",
            "active",
            "ENTERPRISE",
            "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200&q=80",
            "Modern cosmetic dentistry and clear aligner specialist practice.",
            "Mon - Fri: 8:00 AM - 5:00 PM",
            json.dumps(["Orthodontic Consultation", "Teeth Whitening", "Comprehensive Dental Exam", "Emergency Pain Relief"]),
            json.dumps({"slot_duration": 60, "advance_booking_days": 60, "cancellation_notice_hours": 48}),
            json.dumps({"default_agent": "agent-leo", "voice_confirmation": True}),
            "2026-03-01T09:30:00Z",
            "2026-10-06T16:45:00Z"
        )
    ]
    cursor.executemany("""
    INSERT INTO businesses (id, business_name, owner_name, email, phone, address, timezone, status, plan, logo, description, working_hours, services_json, appointment_settings_json, ai_agent_settings_json, created_at, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, businesses)

    # 2. Users
    users = [
        # SUPER ADMIN (Platform Owner)
        ("user-super-1", "platform-system", "Alexander Wright", "superadmin@talkaor.com", "super123", "SUPER_ADMIN", 1, "2026-01-01T00:00:00Z"),
        
        # Business 1 (TalkAor Wellness)
        ("user-admin-1", "client-talkaor-01", "Sarah Jenkins", "admin@talkaor.com", "admin123", "BUSINESS_ADMIN", 1, "2026-01-15T09:00:00Z"),
        ("user-staff-1", "client-talkaor-01", "David Miller", "staff@talkaor.com", "staff123", "STAFF", 1, "2026-02-10T11:30:00Z"),
        ("user-staff-2", "client-talkaor-01", "Elena Rostova", "elena@talkaor.com", "staff123", "STAFF", 1, "2026-03-01T14:15:00Z"),
        
        # Business 2 (The Grooming Factory)
        ("user-grooming-admin", "client-grooming-02", "John Doe", "john@groomingfactory.com", "john123", "BUSINESS_ADMIN", 1, "2026-02-15T10:00:00Z"),
        
        # Business 3 (Apex Dental)
        ("user-apex-admin", "client-apex-03", "Dr. Marcus Vance", "marcus@apexdental.com", "vance123", "BUSINESS_ADMIN", 1, "2026-03-01T09:30:00Z")
    ]
    cursor.executemany("""
    INSERT INTO users (id, client_id, name, email, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # 3. AI Agents
    agents = [
        (
            "agent-1",
            "client-talkaor-01",
            "Aria (Front Desk AI)",
            "Handles incoming appointment bookings, rescheduling, and service inquiries with friendly tone.",
            "+1 (555) 019-2831",
            "TalkAor Neural Voice",
            "active",
            "en-US-AriaNeural",
            "American (Warm & Professional)",
            json.dumps({"temperature": 0.3, "interrupt_threshold": 0.6, "recording_enabled": True}),
            "English",
            "HEALTHY",
            "2026-01-10T10:00:00Z",
            "2026-10-06T17:50:00Z"
        ),
        (
            "agent-2",
            "client-talkaor-01",
            "Leo (After-Hours Assistant)",
            "24/7 night concierge for urgent rescheduling and customer FAQs.",
            "+1 (555) 019-7462",
            "TalkAor DeepFlow AI",
            "active",
            "en-US-LeoNeural",
            "Neutral English",
            json.dumps({"temperature": 0.2, "interrupt_threshold": 0.7, "recording_enabled": True}),
            "English",
            "HEALTHY",
            "2026-02-05T12:00:00Z",
            "2026-10-06T17:40:00Z"
        ),
        (
            "agent-3",
            "client-talkaor-01",
            "Maya (Follow-Up & Retention)",
            "Outbound voice bot checking in post-appointment and gathering feedback.",
            "+1 (555) 019-3389",
            "TalkAor Retell Core",
            "inactive",
            "en-US-MayaExpressive",
            "American (Empathetic)",
            json.dumps({"temperature": 0.4, "interrupt_threshold": 0.5, "recording_enabled": False}),
            "English",
            "OFFLINE",
            "2026-03-20T16:00:00Z",
            "2026-10-05T14:30:00Z"
        ),
        (
            "agent-zoya",
            "client-grooming-02",
            "Zoya",
            "Multi-lingual barber concierge fluent in Hindi, English, and Marathi for salon bookings.",
            "+91 98765 00112",
            "TalkAor Multilingual Core",
            "active",
            "hi-IN-SwaraNeural",
            "Hindi / English / Marathi",
            json.dumps({"temperature": 0.3, "interrupt_threshold": 0.5, "recording_enabled": True}),
            "Hindi / English / Marathi",
            "HEALTHY",
            "2026-02-20T11:00:00Z",
            "2026-10-06T17:45:00Z"
        ),
        (
            "agent-dental-iris",
            "client-apex-03",
            "Iris (Clinical Reception AI)",
            "Triage emergency dental questions and schedule orthodontic scans.",
            "+1 (555) 781-0099",
            "TalkAor Neural Voice",
            "active",
            "en-US-JennyNeural",
            "Professional Medical",
            json.dumps({"temperature": 0.1, "interrupt_threshold": 0.8, "recording_enabled": True}),
            "English / Spanish",
            "HEALTHY",
            "2026-03-05T09:00:00Z",
            "2026-10-06T17:35:00Z"
        )
    ]
    cursor.executemany("""
    INSERT INTO agents (id, client_id, name, description, phone_number, provider, status, voice_id, accent, configuration_json, language, health, created_at, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, agents)

    # 4. Customers
    customers = [
        ("cust-1", "client-talkaor-01", "John Smith", "+1 (555) 342-9811", "john.smith@gmail.com", "Prefers morning slots. VIP customer since 2025.", "2026-08-10T14:20:00Z"),
        ("cust-2", "client-talkaor-01", "Sophia Patel", "+1 (555) 876-1243", "sophia.patel@horizon.io", "Requested quiet sessions during consultations.", "2026-08-15T09:15:00Z"),
        ("cust-3", "client-talkaor-01", "Michael Rodriguez", "+1 (555) 432-8765", "m.rodriguez@techfirm.co", "Referred by Dr. Bradley.", "2026-08-22T11:45:00Z"),
        ("cust-4", "client-talkaor-01", "Emily Chen", "+1 (555) 901-2345", "emily.chen@designstudio.net", "Allergic to specific aerosol products.", "2026-09-02T16:30:00Z"),
        ("cust-5", "client-talkaor-01", "Alexander Hayes", "+1 (555) 654-7890", "alex.hayes@ventures.org", "Prospect signed up via voice inquiry.", "2026-09-12T10:10:00Z"),
        ("cust-6", "client-talkaor-01", "Olivia Martinez", "+1 (555) 789-0123", "olivia.m@creativeworks.com", "Follows up promptly on reminders.", "2026-09-18T13:40:00Z"),
        ("cust-7", "client-talkaor-01", "William Taylor", "+1 (555) 234-5678", "will.taylor@northstar.com", "Executive calendar.", "2026-09-25T15:00:00Z"),
        # Customer for Business 2
        ("cust-g1", "client-grooming-02", "Rohan Sharma", "+91 98111 22334", "rohan.sharma@example.in", "Regular weekend haircut client.", "2026-09-01T10:00:00Z")
    ]
    cursor.executemany("""
    INSERT INTO customers (id, client_id, name, phone, email, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, customers)

    # 5. Appointments
    appointments = [
        (
            "apt-101", "client-talkaor-01", "cust-1", "John Smith", "+1 (555) 342-9811", "john.smith@gmail.com",
            "2026-10-12", "10:30:00", "Monday", "Hair Consultation & Scalp Assessment", "confirmed",
            "user-staff-1", "David Miller", "agent-1", "Aria (Front Desk AI)",
            "Booked via TalkAor Voice Agent. Client requested private consultation room.",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80", "#1c1917", "#fafaf9",
            "2026-10-01T10:30:00Z", "2026-10-02T11:00:00Z"
        ),
        (
            "apt-102", "client-talkaor-01", "cust-2", "Sophia Patel", "+1 (555) 876-1243", "sophia.patel@horizon.io",
            "2026-10-12", "13:00:00", "Monday", "Signature Facial Treatment & Glow Therapy", "scheduled",
            "user-staff-2", "Elena Rostova", "agent-1", "Aria (Front Desk AI)",
            "First time visit. Needs gentle organic product line.",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80", "#0c4a6e", "#f0f9ff",
            "2026-10-02T14:10:00Z", "2026-10-02T14:10:00Z"
        ),
        (
            "apt-103", "client-talkaor-01", "cust-3", "Michael Rodriguez", "+1 (555) 432-8765", "m.rodriguez@techfirm.co",
            "2026-10-13", "09:00:00", "Tuesday", "Executive Grooming & Beard Sculpting", "rescheduled",
            "user-staff-1", "David Miller", "agent-2", "Leo (After-Hours Assistant)",
            "Rescheduled from Friday Oct 10 due to business travel.",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", "#064e3b", "#ecfdf5",
            "2026-10-03T09:20:00Z", "2026-10-04T16:05:00Z"
        ),
        (
            "apt-104", "client-talkaor-01", "cust-4", "Emily Chen", "+1 (555) 901-2345", "emily.chen@designstudio.net",
            "2026-10-13", "15:30:00", "Tuesday", "Custom Color Styling & Botanical Rinse", "scheduled",
            "user-staff-2", "Elena Rostova", "agent-1", "Aria (Front Desk AI)",
            "Confirmed allergen-free dye batch ready.",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80", "#4c1d95", "#f5f3ff",
            "2026-10-03T11:00:00Z", "2026-10-03T11:00:00Z"
        ),
        (
            "apt-105", "client-talkaor-01", "cust-6", "Olivia Martinez", "+1 (555) 789-0123", "olivia.m@creativeworks.com",
            "2026-10-14", "11:15:00", "Wednesday", "Facial Treatment", "cancelled",
            "user-staff-1", "David Miller", "agent-1", "Aria (Front Desk AI)",
            "Client called stating sudden flu symptoms. Cancelled without penalty.",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80", "#7f1d1d", "#fef2f2",
            "2026-10-04T08:45:00Z", "2026-10-05T09:30:00Z"
        ),
        # Appointment for Business 2 (The Grooming Factory)
        (
            "apt-g1", "client-grooming-02", "cust-g1", "Rohan Sharma", "+91 98111 22334", "rohan.sharma@example.in",
            "2026-10-15", "11:00:00", "Thursday", "Beard Sculpting", "confirmed",
            "user-grooming-admin", "John Doe", "agent-zoya", "Zoya",
            "Booked through Zoya AI agent in Hindi.",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80", "#18181b", "#f4f4f5",
            "2026-10-04T12:00:00Z", "2026-10-04T12:00:00Z"
        )
    ]
    cursor.executemany("""
    INSERT INTO appointments (id, client_id, customer_id, customer_name, customer_phone, customer_email, date, time, day_of_week, service, status, staff_id, staff_name, agent_id, agent_name, notes, image, background, foreground, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, appointments)

    # 6. Appointment History
    histories = [
        ("hist-1", "apt-101", "Appointment Created", None, "Monday, Oct 12 at 10:30 AM", "Aria (Front Desk AI)", "ai_agent", "2026-10-01T10:30:00Z"),
        ("hist-2", "apt-101", "Status Confirmed", "scheduled", "confirmed", "Sarah Jenkins", "staff", "2026-10-02T11:00:00Z"),
        ("hist-3", "apt-103", "Appointment Created", None, "Friday, Oct 10 at 16:00 PM", "Aria (Front Desk AI)", "ai_agent", "2026-10-03T09:20:00Z"),
        ("hist-4", "apt-103", "Rescheduled", "Oct 10, 16:00:00", "Oct 13, 09:00:00 (Client out of town)", "Leo (After-Hours Assistant)", "ai_agent", "2026-10-04T16:05:00Z"),
        ("hist-5", "apt-105", "Appointment Created", None, "Wednesday, Oct 14 at 11:15 AM", "David Miller", "staff", "2026-10-04T08:45:00Z"),
        ("hist-6", "apt-105", "Cancelled", "scheduled", "Client ill with fever (Free cancellation granted)", "Aria (Front Desk AI)", "ai_agent", "2026-10-05T09:30:00Z")
    ]
    cursor.executemany("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, histories)

    # 7. Cancellations
    cancellations = [
        ("canc-1", "client-talkaor-01", "apt-105", "2026-10-14", "11:15:00", "cust-6", "Olivia Martinez", "+1 (555) 789-0123", "Client called stating sudden flu symptoms.", "ai_agent", "Aria (Front Desk AI)", "2026-10-05T09:30:00Z"),
        ("canc-2", "client-talkaor-01", "apt-099", "2026-10-02", "14:00:00", "cust-4", "Emily Chen", "+1 (555) 901-2345", "Schedule conflict with client board meeting.", "user", "Sarah Jenkins", "2026-10-01T16:20:00Z")
    ]
    cursor.executemany("""
    INSERT INTO cancellations (id, client_id, appointment_id, original_date, original_time, customer_id, customer_name, customer_phone, reason, cancelled_by, cancelled_by_name, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, cancellations)

    # 8. Calls
    calls = [
        (
            "call-1001", "client-talkaor-01", "agent-1", "Aria (Front Desk AI)", "cust-1", "John Smith", "+1 (555) 342-9811",
            "inbound", "completed", 142, 1, "https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg", 1,
            json.dumps([
                {"speaker": "Aria (AI)", "text": "Thank you for calling TalkAor Wellness Studio! This is Aria. How may I assist you today?", "time": "0:02"},
                {"speaker": "John Smith", "text": "Hi Aria! I have an appointment on Monday at 10:30 AM. Can I request a private consultation room?", "time": "0:14"},
                {"speaker": "Aria (AI)", "text": "Certainly, Mr. Smith! I have added that note to your booking on Monday, October 12 at 10:30 AM. We also have complimentary parking in rear lot B.", "time": "0:31"},
                {"speaker": "John Smith", "text": "That sounds perfect. Thank you so much!", "time": "0:45"},
                {"speaker": "Aria (AI)", "text": "My pleasure! We look forward to seeing you Monday. Have a wonderful day!", "time": "0:55"}
            ]),
            "Customer called to verify parking instructions and booked private room preference for upcoming consultation on Monday.",
            "2026-10-05T14:22:10Z"
        ),
        (
            "call-1002", "client-talkaor-01", "agent-1", "Aria (Front Desk AI)", "cust-6", "Olivia Martinez", "+1 (555) 789-0123",
            "inbound", "completed", 98, 1, "https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg", 1,
            json.dumps([
                {"speaker": "Aria (AI)", "text": "Hello! You have reached TalkAor Studio, Aria speaking. How can I help you?", "time": "0:01"},
                {"speaker": "Olivia Martinez", "text": "Hi Aria, unfortunately I woke up feeling very sick today. I need to cancel my Wednesday 11:15 AM facial.", "time": "0:12"},
                {"speaker": "Aria (AI)", "text": "I am so sorry to hear you are feeling unwell, Olivia! I have cancelled your appointment for Wednesday, October 14th without penalty. Would you like me to send a booking link when you feel better?", "time": "0:29"},
                {"speaker": "Olivia Martinez", "text": "Yes please text it to me. Thank you Aria.", "time": "0:42"},
                {"speaker": "Aria (AI)", "text": "Sent! Get plenty of rest and feel better soon!", "time": "0:48"}
            ]),
            "Client Olivia Martinez requested cancellation of Wednesday facial appointment due to health reasons.",
            "2026-10-05T11:05:40Z"
        ),
        (
            "call-1003", "client-talkaor-01", "agent-1", "Aria (Front Desk AI)", "cust-7", "William Taylor", "+1 (555) 234-5678",
            "outbound", "completed", 64, 1, "https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg", 1,
            json.dumps([
                {"speaker": "Aria (AI)", "text": "Good morning William! This is Aria from TalkAor calling to confirm your 3:00 PM session today with David.", "time": "0:03"},
                {"speaker": "William Taylor", "text": "Good morning! Yes, confirmed, I will be there on time.", "time": "0:15"},
                {"speaker": "Aria (AI)", "text": "Awesome! We are ready for you. See you at 3:00 PM.", "time": "0:22"}
            ]),
            "Automated appointment confirmation call for today at 3:00 PM. Confirmed by client.",
            "2026-10-05T08:15:22Z"
        ),
        # Call for Business 2 (The Grooming Factory)
        (
            "call-2001", "client-grooming-02", "agent-zoya", "Zoya", "cust-g1", "Rohan Sharma", "+91 98111 22334",
            "inbound", "completed", 120, 1, "https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg", 1,
            json.dumps([
                {"speaker": "Zoya (AI)", "text": "Namaste! Welcome to The Grooming Factory, Zoya bol rahi hoon. Main aapki kya madad kar sakti hoon?", "time": "0:02"},
                {"speaker": "Rohan Sharma", "text": "Hi Zoya, Thursday 11 baje beard trimming slot book karna tha.", "time": "0:15"},
                {"speaker": "Zoya (AI)", "text": "Bilkul Rohan ji! Aapka slot Thursday, 15 October subah 11:00 AM ke liye confirm kar diya gaya hai.", "time": "0:30"}
            ]),
            "Client booked beard trim slot for Thursday at 11 AM via Zoya AI agent.",
            "2026-10-04T12:00:00Z"
        )
    ]
    cursor.executemany("""
    INSERT INTO calls (id, client_id, agent_id, agent_name, customer_id, customer_name, customer_phone, direction, status, duration_seconds, has_recording, recording_url, has_transcript, transcript_json, summary, date_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, calls)

    # 9. Audit Logs (Rich historical audit logs)
    audit_logs = [
        ("log-1", "2026-10-06T17:40:00Z", "INFO", "Auth Service", "client-talkaor-01", "TalkAor Voice Wellness", "user-admin-1", "Sarah Jenkins", "BUSINESS_ADMIN", "Admin Access Unlocked", "SUCCESS", "Administrator unlocked Admin Control Center using access code verification.", "req-8910", "/api/v1/auth/verify-admin-code", "POST", 200, None, None, json.dumps({"ip": "192.168.1.101"})),
        ("log-2", "2026-10-06T17:32:15Z", "WARNING", "Voice Agent Service", "client-grooming-02", "The Grooming Factory", "system", "Agent Zoya", "AI_AGENT", "Agent latency spike", "SUCCESS", "Call audio latency increased to 380ms on neural stream.", "req-8909", "/api/v1/telephony/stream", "POST", 200, None, None, json.dumps({"latency_ms": 380})),
        ("log-3", "2026-10-06T16:55:00Z", "INFO", "Appointment Service", "client-talkaor-01", "TalkAor Voice Wellness", "user-admin-1", "Sarah Jenkins", "BUSINESS_ADMIN", "Appointment Rescheduled", "SUCCESS", "Rescheduled appointment apt-103 from Friday Oct 10 to Tuesday Oct 13 09:00 AM.", "req-8908", "/api/v1/admin/appointments/apt-103/reschedule", "POST", 200, None, None, json.dumps({"appointment_id": "apt-103"})),
        ("log-4", "2026-10-06T16:10:00Z", "INFO", "Agent Service", "client-talkaor-01", "TalkAor Voice Wellness", "user-admin-1", "Sarah Jenkins", "BUSINESS_ADMIN", "Agent Status Toggled", "SUCCESS", "Toggled AI Agent Maya (agent-3) to INACTIVE status.", "req-8907", "/api/v1/admin/agents/agent-3/status", "PATCH", 200, None, None, json.dumps({"agent_id": "agent-3", "new_status": "inactive"})),
        ("log-5", "2026-10-06T15:00:00Z", "INFO", "Platform Core", "platform-system", "TalkAor Platform", "user-super-1", "Alexander Wright", "SUPER_ADMIN", "Super Admin Login", "SUCCESS", "Platform Super Administrator authenticated successfully.", "req-8906", "/api/v1/auth/login", "POST", 200, None, None, json.dumps({"ip": "10.0.0.1"})),
        ("log-6", "2026-10-06T14:20:00Z", "ERROR", "Voice Agent", "client-grooming-02", "The Grooming Factory", "user-grooming-admin", "Admin", "BUSINESS_ADMIN", "Agent connection failed", "FAILED", "Temporary SIP handshake timeout on provider node.", "req-8905", "/api/v1/telephony/sip-connect", "POST", 504, "SIP Gateway Timeout", "GatewayTimeoutException: upstream server did not respond in 5000ms", json.dumps({"provider": "TalkAor Multilingual Core"}))
    ]
    cursor.executemany("""
    INSERT INTO audit_logs (id, timestamp, level, service, business_id, business_name, user_id, user_name, role, event, status, details, request_id, endpoint, http_method, status_code, error_message, stack_trace, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, audit_logs)

    # 10. Transactions / Platform Revenue
    transactions = [
        ("txn-1", "client-talkaor-01", 14900, "PAID", "PRO", "2026-10-01T00:00:00Z"),
        ("txn-2", "client-grooming-02", 24500, "PAID", "PRO", "2026-10-02T00:00:00Z"),
        ("txn-3", "client-apex-03", 49000, "PAID", "ENTERPRISE", "2026-10-03T00:00:00Z"),
        ("txn-4", "client-talkaor-01", 14900, "PAID", "PRO", "2026-09-01T00:00:00Z"),
        ("txn-5", "client-grooming-02", 24500, "PAID", "PRO", "2026-09-02T00:00:00Z"),
        ("txn-6", "client-apex-03", 49000, "PAID", "ENTERPRISE", "2026-09-03T00:00:00Z")
    ]
    cursor.executemany("""
    INSERT INTO transactions (id, client_id, amount, status, plan, date)
    VALUES (?, ?, ?, ?, ?, ?)
    """, transactions)

    conn.commit()
