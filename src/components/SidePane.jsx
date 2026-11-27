// The right column: what the agent knows, or the open workspace.

import { TOPICS, checksFor, verdict } from "../desk/data.js";

export default function SidePane({
  s,
  onClose,
  onCheck,
  onHint,
  onSample,
  onCode,
  onManage,
  sampleArmed,
}) {
  const [v, why] = verdict(s.mem);

  if (!s.cur) {
    return (
      <>
        <h2>What I am learning about you</h2>
        <div className="card">
          <h3>{v}</h3>
          <p className="muted">{why}</p>
        </div>

        <div className="card">
          <h3>Recent memory</h3>
          {s.mem.length ? (
            s.mem
              .slice(-5)
              .reverse()
              .map((m) => <p key={m.id}>{m.text}</p>)
          ) : (
            <p className="muted">
              Nothing yet. I add to this as you work and tell me what you enjoy.
            </p>
          )}
          <button type="button" onClick={onManage}>
            Manage memory
          </button>
        </div>
      </>
    );
  }

  const k = s.cur;
  const t = TOPICS[k];
  const w = s.work[k];
  const list = checksFor(k, w);
  const good = w.result ? w.result.filter((r) => r.ok).length : 0;

  return (
    <>
      <div className="row spread">
        <h2>Workspace</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="card">
        <h3>{t.title}</h3>
        <p>{t.story}</p>
        {w.change && (
          <p style={{ color: "var(--rose)" }}>
            <b>New request:</b> {t.change[0]}.
          </p>
        )}
        <div className="bar">
          <i style={{ width: `${(good / list.length) * 100}%` }} />
        </div>
        <ul className="checks">
          {list.map(([label], i) => {
            const r = w.result && w.result[i];
            return (
              <li key={label} className={r ? (r.ok ? "ok" : "no") : ""}>
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      <label htmlFor="code">
        <b>Your work</b>
      </label>
      <textarea
        className="code"
        id="code"
        spellCheck={false}
        value={w.code}
        readOnly={w.done}
        onChange={(e) => onCode(k, e.target.value)}
      />

      {w.done ? (
        <p style={{ color: "var(--ok)" }}>
          <b>Completed and saved to your portfolio.</b>
        </p>
      ) : (
        <>
          {w.result && good < list.length && (
            <p>
              <b>Improve next:</b> {w.result.find((r) => !r.ok).tip}
            </p>
          )}
          <div className="row">
            <button type="button" className="go" onClick={() => onCheck(k)}>
              Check my work
            </button>
            <button type="button" onClick={() => onHint(k)}>
              Hint
            </button>
            <button type="button" onClick={() => onSample(k)}>
              {sampleArmed ? "Press again" : "Load unfinished example"}
            </button>
          </div>
        </>
      )}

      {t.hints.slice(0, w.hints).map((h, i) => (
        <div className="card" style={{ marginTop: ".6rem" }} key={h}>
          <b>Hint {i + 1}</b>
          {i === 2 ? <pre>{h}</pre> : <p>{h}</p>}
        </div>
      ))}

      <p className="muted small">Checked on this device. Your code is not sent for grading.</p>
    </>
  );
}
