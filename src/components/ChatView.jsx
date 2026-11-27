// The chat side of the desk: the agent team, the thread, chips and composer.

import { useEffect, useRef } from "react";
import { AG, AGENT_ORDER, TOPICS } from "../desk/data.js";
import Rich from "./Rich.jsx";

function Avatar({ agent }) {
  return (
    <span className="av" style={{ "--c": AG[agent].color }} aria-hidden="true">
      {AG[agent].name[0]}
    </span>
  );
}

function Plan({ m }) {
  return (
    <>
      <b>{m.at >= m.plan.length ? "Ticket planned" : "Planning your ticket"}</b>
      <ol className="plan">
        {m.plan.map((p, i) => (
          <li key={p} className={i < m.at ? "done" : i === m.at ? "on" : ""}>
            {p}
          </li>
        ))}
      </ol>
    </>
  );
}

function Ticket({ k, exam, onOpen }) {
  const t = TOPICS[k];
  return (
    <div className="ticket">
      <b>{t.title}</b>
      <p className="small muted">
        {t.from}. About {exam ? "15 minutes in exam mode" : `${t.mins} minutes`}.
      </p>
      <button type="button" className="go" onClick={() => onOpen(k)}>
        Open workspace
      </button>
    </div>
  );
}

function Message({ m, exam, onOpen, onProve }) {
  if (m.memo) return <div className="memo">Memory updated: {m.memo}</div>;

  if (m.me) {
    return (
      <div className="msg me">
        <div className="body">
          <div className="bubble">{m.me}</div>
        </div>
      </div>
    );
  }

  const agent = AG[m.agent];
  return (
    <div className="msg" style={{ "--c": agent.color }}>
      <Avatar agent={m.agent} />
      <div className="body">
        <span className="who">{agent.name}</span>
        <div className="bubble">
          {m.brain && (
            <span className={`msg-badge ${m.brain.toLowerCase()}`}>
              {m.brain === "LOCAL" ? "on device" : m.brain === "CLOUD" ? "cloud" : "offline"}
            </span>
          )}
          {m.plan && <Plan m={m} />}
          {(m.text || m.streaming) &&
            (m.pre ? (
              <pre>
                <Rich text={m.text} />
              </pre>
            ) : (
              <p>
                <Rich text={m.text} />
                {m.streaming && <span className="caret">▍</span>}
              </p>
            ))}
          {m.ticket && <Ticket k={m.ticket} exam={exam} onOpen={onOpen} />}
          {m.courses &&
            m.courses.map(([name, by, url, len], i) => (
              <div className="course" key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {name}
                </a>
                <span className="small muted">
                  {by}. {len}.
                </span>
                <button type="button" onClick={() => onProve(`${m.topic}:${i}`)}>
                  I studied this, test me
                </button>
              </div>
            ))}
          {m.link && (
            <p>
              <a href={m.link.url} target="_blank" rel="noopener noreferrer">
                {m.link.name}
              </a>
            </p>
          )}
        </div>
        {m.why && (
          <details>
            <summary>Why this?</summary>
            <span className="small muted">{m.why}</span>
          </details>
        )}
      </div>
    </div>
  );
}

export default function ChatView({
  s,
  onOpen,
  onSend,
  onChip,
  onLater,
  onPane,
  onProve,
  side,
}) {
  const logRef = useRef(null);
  const streaming = s.msgs.some((m) => m.streaming);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.msgs, s.busy]);

  return (
    <div id="chatview" className={s.cur ? "working" : ""} data-pane={s.pane}>
      <div className="tabs">
        <button
          type="button"
          aria-pressed={s.pane === "chat"}
          onClick={() => onPane("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          aria-pressed={s.pane === "side"}
          onClick={() => onPane("side")}
        >
          {s.cur ? "Workspace" : "What I know"}
        </button>
      </div>

      <aside className="col team" aria-label="Agent team">
        <h3>Agent team</h3>
        {AGENT_ORDER.map((k) => (
          <div key={k} className={`agent ${s.busy === k ? "busy" : ""}`}>
            <Avatar agent={k} />
            <div>
              <b>{AG[k].name}</b>
              <span className="muted small">
                {s.busy === k ? "Working now" : AG[k].role}
              </span>
            </div>
          </div>
        ))}
      </aside>

      <main className="chat">
        <div className="top">
          <div>
            <h2>Your practice room</h2>
            <span className="muted small">
              Agents think in the cloud · checks stay on this device.
            </span>
          </div>
          <button type="button" onClick={onLater} disabled={!!s.busy}>
            Skip ahead 3 days
          </button>
        </div>

        <div id="log" role="log" aria-live="polite" ref={logRef}>
          {s.msgs.map((m) => (
            <Message key={m.id} m={m} exam={s.exam} onOpen={onOpen} onProve={onProve} />
          ))}
          {s.busy && !streaming && (
            <p className="muted small working">{AG[s.busy].name} is working…</p>
          )}
        </div>

        <div className="chips">
          {!s.busy &&
            s.chips.map((c) => (
              <button
                key={`${c.action}:${c.value}:${c.label}`}
                type="button"
                onClick={() => onChip(c)}
              >
                {c.label}
              </button>
            ))}
        </div>

        <Composer awaitExplain={!!s.await} onSend={onSend} busy={!!s.busy} />
      </main>

      <aside className="col side">{side}</aside>
    </div>
  );
}

function Composer({ awaitExplain, onSend, busy }) {
  const inputRef = useRef(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = inputRef.current.value.trim();
        if (!value || busy) return;
        inputRef.current.value = "";
        onSend(value);
      }}
    >
      <input
        ref={inputRef}
        id="say"
        autoComplete="off"
        aria-label="Message your agent"
        placeholder={awaitExplain ? "Explain your choice here" : "Try: I enjoy databases"}
        disabled={busy}
      />
      <button className="go" disabled={busy}>
        Send
      </button>
    </form>
  );
}
