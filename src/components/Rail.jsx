// The left rail — sections, theme, restart.

const ICON = {
  chat: "M4 5h16v11H9l-5 4z",
  study:
    "M4 4h6a2 2 0 012 2v14a3 3 0 00-3-2H4zM20 4h-6a2 2 0 00-2 2v14a3 3 0 013-2h5z",
  learn: "M12 3a9 9 0 100 18 9 9 0 000-18zM10 8l6 4-6 4z",
  folio: "M3 8h18v12H3zM9 8V4h6v4M3 13h18",
  path: "M12 3a9 9 0 100 18 9 9 0 000-18zM16 8l-2 6-6 2 2-6z",
  memory:
    "M12 4a4 4 0 00-4 4 4 4 0 000 8 4 4 0 008 0 4 4 0 000-8 4 4 0 00-4-4zM12 4v16",
  theme: "M20 14A8 8 0 0110 4a8 8 0 1010 10z",
  reset: "M4 12a8 8 0 108-8H5m3-3L5 4l3 3",
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON[name]} />
    </svg>
  );
}

const SECTIONS = [
  ["chat", "Agent"],
  ["study", "Studies"],
  ["learn", "Learn"],
  ["folio", "Portfolio"],
  ["path", "Path"],
  ["memory", "Memory"],
];

export default function Rail({ view, onView, theme, onTheme, armed, onReset }) {
  return (
    <nav className="rail" aria-label="Main">
      <div className="logo" aria-hidden="true">
        P
      </div>
      {SECTIONS.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onView(k)}
          aria-current={view === k ? "page" : undefined}
        >
          <Icon name={k} />
          {label}
        </button>
      ))}
      <button type="button" className="end" onClick={onTheme}>
        <Icon name="theme" />
        Theme
      </button>
      <button type="button" onClick={onReset} title="Start over">
        <Icon name="reset" />
        {armed ? "Press again" : "Restart"}
      </button>
    </nav>
  );
}
