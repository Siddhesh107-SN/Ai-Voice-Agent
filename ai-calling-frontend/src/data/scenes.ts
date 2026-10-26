// Scene microcopy and PLACEHOLDER data for the animated scenes.
// None of this is in the content PDF; replace freely.

export const dayScene = {
  captions: [
    "Calls come in while you're busy.",
    "talkaor answers every one.",
    "Each call lands on your calendar.",
    "No missed calls. A full day.",
  ],
  missedTotal: 7,
  bookedTotal: 6,
  missedLabel: "missed calls today",
  bookedLabel: "booked",
  pill: "talkaor answering",
  inProgress: "Booking in progress",
  slots: ["9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00"],
  // index of the slot that shows "booking in progress"
  progressIndex: 3,
  notifs: ["9:02", "9:48", "10:15", "11:30", "12:20", "1:05", "2:40"],
};

export const stubScene = {
  caption: "Booked, one call at a time.",
  stubs: [
    { time: "10:00 AM", name: "Aarav", service: "Consultation" },
    { time: "11:30 AM", name: "Meera", service: "Check-up" },
    { time: "2:00 PM", name: "Rohan", service: "Service visit" },
    { time: "4:30 PM", name: "Sana", service: "Counselling" },
  ],
  bookedLabel: "Booked",
  // PLACEHOLDER numbers: replace from this one file.
  results: {
    tag: "Placeholder figures",
    title: "This month",
    stats: [
      { value: "248", label: "calls answered" },
      { value: "186", label: "appointments booked" },
      { value: "0", label: "missed calls" },
    ],
  },
};

export const heroExamples = [
  {
    caller: "Priya",
    parts: [
      { t: "Hi, I'd like a " },
      { t: "dental check-up", k: "service" },
      { t: " on " },
      { t: "Friday", k: "day" },
      { t: " at " },
      { t: "4 PM", k: "time" },
      { t: "." },
    ],
  },
  {
    caller: "Rahul",
    parts: [
      { t: "Can I get a " },
      { t: "haircut", k: "service" },
      { t: " this " },
      { t: "Saturday", k: "day" },
      { t: " around " },
      { t: "11 AM", k: "time" },
      { t: "?" },
    ],
  },
  {
    caller: "Ananya",
    parts: [
      { t: "Please book a " },
      { t: "course counselling", k: "service" },
      { t: " slot on " },
      { t: "Monday", k: "day" },
      { t: " at " },
      { t: "10 AM", k: "time" },
      { t: "." },
    ],
  },
] as const;

export const heroCard = {
  labels: { service: "Service", day: "Day", time: "Time" },
  confirmed: "Booked",
};

export const howCard = {
  rows: [
    { k: "Call", v: "Incoming call answered" },
    { k: "Details", v: "Name, service, day and time" },
    { k: "Confirm", v: "Appointment confirmed" },
    { k: "Reminder", v: "Reminder scheduled" },
  ],
};

export const demo = {
  hint: "Pick a caller",
  scenarios: [
    {
      id: "book", label: "Book a visit",
      caller: "Hi, I'd like to book a visit on Friday at 4 PM.",
      agent: "Sure. Friday at 4 PM is open. I've booked it for you.",
      card: { day: "Friday", time: "4:00 PM", status: "Booked" },
    },
    {
      id: "resched", label: "Reschedule",
      caller: "Can you move my appointment to Monday morning?",
      agent: "Done. Your appointment is now Monday at 10 AM.",
      card: { day: "Monday", time: "10:00 AM", status: "Rescheduled" },
    },
    {
      id: "hours", label: "Ask a question",
      caller: "What are your opening hours?",
      agent: "We're open from 9 AM to 6 PM, Monday to Saturday.",
      card: { day: "Mon to Sat", time: "9 AM to 6 PM", status: "Answered" },
    },
  ],
};

export const audienceCalendars: Record<string, { slot: number; label: string }[]> = {
  "Healthcare Providers": [{ slot: 0, label: "Check-up" }, { slot: 2, label: "Follow-up" }, { slot: 3, label: "Consultation" }, { slot: 5, label: "Lab visit" }],
  "Educational Institutions": [{ slot: 1, label: "Admission enquiry" }, { slot: 2, label: "Campus visit" }, { slot: 4, label: "Parent call" }],
  "Small and Medium Businesses": [{ slot: 0, label: "Product demo" }, { slot: 1, label: "Quote request" }, { slot: 3, label: "Pickup slot" }, { slot: 5, label: "Support call" }],
  "Service-Based Businesses": [{ slot: 0, label: "Site visit" }, { slot: 2, label: "Service slot" }, { slot: 3, label: "Estimate" }, { slot: 4, label: "Repair visit" }],
  "Growing Companies": [{ slot: 1, label: "Onboarding" }, { slot: 2, label: "Sales call" }, { slot: 4, label: "Partner call" }, { slot: 5, label: "Review" }],
};
export const audienceSlots = ["9 AM", "10 AM", "11 AM", "12 PM", "2 PM", "3 PM"];

// Chips floating around each person in "Who it's for" (wording taken from the content PDF).
export const audienceChips: Record<string, string[]> = {
  "Healthcare Providers": ["Services", "Visiting hours", "Appointments"],
  "Educational Institutions": ["Admission enquiries", "Course information", "Parent questions"],
  "Small and Medium Businesses": ["Repetitive enquiries", "Efficient communication", "Always available"],
  "Service-Based Businesses": ["Customer questions", "Appointment conversations", "Consistent handling"],
  "Growing Companies": ["Growing communication needs", "Configurable automation", "Scales with you"],
};

// ILLUSTRATIVE review card (not a real customer). Placeholder copy: edit freely.
export const reviewScene = {
  tag: "Example review",
  initial: "A",
  name: "Aarav",
  when: "2 weeks ago",
  updated: "Updated review",
  before: "Booking an appointment was long and frustrating. I could not get through.",
  after: "Booked in seconds. Super easy.",
  reply: { from: "Response from the owner", text: "Thank you for the update!" },
  replay: "Replay",
};
