const P: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14.5c2.2.6 3.5 2.4 3.5 5.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 8V4M9 14h.01M15 14h.01"/>',
  biz: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 10h2a2 2 0 012 2v9M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
  code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a3 3 0 00-5 1.5c0 3 5 1.5 5 4.5a3 3 0 01-5 1.5M12 6v2M12 16v2"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14a8 8 0 11-10-10 6.5 6.5 0 0010 10z"/>',
  logout: '<path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3M16 17l5-5-5-5M21 12H9"/>',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />;
}

/** Real TalkAor bot mascot from signup and login pages */
export function BotMark({ size = 120 }: { size?: number }) {
  return (
    <svg
      className="bot"
      width={size}
      height={Math.round((size * 150) / 130)}
      viewBox="0 0 130 150"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="tk-bot-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A7BC0" />
          <stop offset="1" stopColor="#1E3D6B" />
        </linearGradient>
      </defs>
      <g>
        <ellipse cx="65" cy="143" rx="30" ry="4.5" fill="#000" fillOpacity="0.25" />
        <rect x="46" y="122" width="15" height="19" rx="7.5" fill="url(#tk-bot-grad)" />
        <rect x="69" y="122" width="15" height="19" rx="7.5" fill="url(#tk-bot-grad)" />
        <rect x="40" y="84" width="50" height="46" rx="20" fill="url(#tk-bot-grad)" />
        <rect x="29" y="92" width="14" height="30" rx="7" fill="url(#tk-bot-grad)" transform="rotate(8 36 96)" />
        <g style={{ transformOrigin: '91px 98px' }}>
          <rect x="84" y="92" width="14" height="30" rx="7" fill="url(#tk-bot-grad)" />
        </g>
        <g style={{ transformOrigin: '63px 88px' }}>
          <path d="M104 46L121 29Q127 54 108 66Z" fill="#F26B2A" />
          <circle cx="106" cy="58" r="5.5" fill="#183257" />
          <rect x="17" y="20" width="92" height="68" rx="30" fill="url(#tk-bot-grad)" />
          <rect x="25" y="28" width="76" height="50" rx="22" fill="#05050B" />
          <ellipse cx="42" cy="26" rx="16" ry="4.5" fill="#fff" fillOpacity="0.14" />
          <g>
            <path d="M41 60a9 10 0 0 1 18 0Z" fill="#fff" />
            <path d="M67 60a9 10 0 0 1 18 0Z" fill="#fff" />
            <line x1="41" y1="60" x2="85" y2="60" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
