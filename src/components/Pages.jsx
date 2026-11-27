// Full-width pages: Studies, Learn, Portfolio, Path, Memory.

import { useState } from "react";
import {
  ASK,
  COURSES,
  TOPICS,
  blankForm,
  standing,
  verdict,
} from "../desk/data.js";

const safeLink = (u) => {
  try {
    return new URL(u).protocol === "https:" ? u : null;
  } catch {
    return null;
  }
};

const humanSize = (n) => {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

export default function Pages({
  view,
  s,
  onBegin,
  onViewWork,
  onNotes,
  onTogglePause,
  onWipe,
  onForget,
  onPortfolio,
  onLearn,
  onProve,
  onAllCourses,
  onAnswer,
  onSubmit,
  onNote,
  onLink,
  onFile,
  onDownload,
}) {
  if (view === "study")
    return <Studies s={s} onBegin={onBegin} onViewWork={onViewWork} onNotes={onNotes} />;
  if (view === "learn")
    return (
      <LearnPage
        s={s}
        onProve={onProve}
        onAllCourses={onAllCourses}
        onAnswer={onAnswer}
        onSubmit={onSubmit}
        onNote={onNote}
        onLink={onLink}
        onFile={onFile}
        onPortfolio={onPortfolio}
        onBegin={onBegin}
      />
    );
  if (view === "folio")
    return <PortfolioPage s={s} onLearn={onLearn} onDownload={onDownload} />;
  if (view === "path") return <PathPage s={s} onPortfolio={onPortfolio} />;
  return (
    <MemoryPage s={s} onTogglePause={onTogglePause} onWipe={onWipe} onForget={onForget} />
  );
}

function Page({ children }) {
  return (
    <main className="page">
      <div>{children}</div>
    </main>
  );
}

function Studies({ s, onBegin, onViewWork, onNotes }) {
  const [notes, setNotes] = useState("");
  return (
    <Page>
      <h1>This semester</h1>
      <p className="muted">Tell me what was taught and I will turn it into practice.</p>
      <p className="muted">
        Practice briefs are realistic but not real companies — you practise safely on
        scenarios modelled after real work.
      </p>

      <div className="grid">
        {Object.entries(TOPICS).map(([k, t]) => {
          const w = s.work[k];
          const done = w && w.done;
          const inPractice = s.lessons.includes(k);
          return (
            <div className="card" key={k}>
              <h2>{t.course}</h2>
              <p>{t.extract.join(", ")}.</p>
              <p className="muted">
                {done ? "Practised" : inPractice ? "In practice" : "Not practised yet"}
              </p>
              <button
                type="button"
                className="go"
                onClick={() => (done ? onViewWork(k) : onBegin(k))}
              >
                {done ? "View work" : "Practise this"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <label htmlFor="notes">
          <b>Paste a topic or lecture notes</b>
        </label>
        <p>
          <textarea
            id="notes"
            className="field"
            rows={3}
            style={{ width: "100%" }}
            placeholder="e.g. Today we covered SQL joins"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </p>
        <button
          type="button"
          onClick={() => {
            const value = notes.trim();
            if (!value) return;
            setNotes("");
            onNotes(value);
          }}
        >
          Send to my agent
        </button>
      </div>
    </Page>
  );
}

function LearnPage({
  s,
  onProve,
  onAllCourses,
  onAnswer,
  onSubmit,
  onNote,
  onLink,
  onFile,
  onPortfolio,
  onBegin,
}) {
  if (!s.course) {
    return (
      <Page>
        <h1>Learn, then prove it</h1>
        <p className="muted">
          Study a resource, answer questions and add your proof. Prices and availability can
          change.
        </p>

        {Object.keys(COURSES).map((k) => (
          <section key={k}>
            <h2>{TOPICS[k].name}</h2>
            <div className="grid">
              {COURSES[k].map(([name, by, url, len], i) => {
                const id = `${k}:${i}`;
                const saved = !!s.learned[id];
                return (
                  <div className="card" key={id}>
                    <h3>{name}</h3>
                    <p className="muted">
                      {by}. {len}.
                    </p>
                    {saved && (
                      <p style={{ color: "var(--ok)" }}>
                        <b>In your portfolio</b>
                      </p>
                    )}
                    <div className="row">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Open course
                      </a>
                      <button
                        type="button"
                        className={saved ? "" : "go"}
                        onClick={() => onProve(id)}
                      >
                        {saved ? "View proof" : "Prove what I learned"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </Page>
    );
  }

  const id = s.course;
  const [k, i] = id.split(":");
  const course = COURSES[k] && COURSES[k][Number(i)];
  if (!course) {
    return (
      <Page>
        <button type="button" onClick={onAllCourses}>
          All courses
        </button>
        <p>That course is no longer available.</p>
      </Page>
    );
  }

  const [name, by, url] = course;
  const saved = s.learned[id];
  const f = s.forms[id] || blankForm();

  if (saved) {
    const worked = s.work[k] && s.work[k].done;
    return (
      <Page>
        <button type="button" onClick={onAllCourses}>
          All courses
        </button>
        <h1 style={{ marginTop: "1rem" }}>Added to your portfolio</h1>
        <div className="card">
          <h3>{name}</h3>
          <p>You answered all three questions correctly.</p>
          <div className="row">
            <button type="button" className="go" onClick={onPortfolio}>
              View portfolio
            </button>
            {worked ? null : (
              <button type="button" onClick={() => onBegin(k)}>
                Apply it in a ticket
              </button>
            )}
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <button type="button" onClick={onAllCourses}>
        All courses
      </button>
      <h1 style={{ marginTop: "1rem" }}>Show what you learned</h1>
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {name}
        </a>{" "}
        <span className="muted">{by}</span>
      </p>

      {ASK[k].map(([q, options], n) => (
        <fieldset className="card" key={n}>
          <legend className="sr">Question {n + 1}</legend>
          <p>
            <b>
              {n + 1}. {q}
            </b>
          </p>
          <div className="choices">
            {options.map((option, j) => (
              <button
                type="button"
                key={option}
                aria-pressed={f.ans[n] === j}
                onClick={() => onAnswer(`${n}:${j}`)}
              >
                {option}
              </button>
            ))}
          </div>
          {f.result && !f.result[n] && (
            <p style={{ color: "var(--rose)" }}>
              Not correct yet. Review this part and try again.
            </p>
          )}
          {f.result && f.result[n] && <p style={{ color: "var(--ok)" }}>Correct.</p>}
        </fieldset>
      ))}

      <div className="card">
        <label htmlFor="pnote">
          <b>What did you learn or build?</b>
        </label>
        <p>
          <textarea
            id="pnote"
            className="field"
            rows={4}
            style={{ width: "100%" }}
            value={f.note}
            onChange={(e) => onNote(e.target.value)}
          />
        </p>
        <label htmlFor="plink">
          <b>Link to your work or certificate (optional)</b>
        </label>
        <p>
          <input
            id="plink"
            className="field"
            style={{ width: "100%" }}
            placeholder="https://"
            value={f.link}
            onChange={(e) => onLink(e.target.value)}
          />
        </p>
        <label htmlFor="pfile">
          <b>Attach a screenshot or certificate (optional)</b>
        </label>
        <p>
          <input
            type="file"
            id="pfile"
            accept="image/*,.pdf"
            onChange={(e) => onFile(e.target.files[0] || null)}
          />{" "}
          <span className="small muted">
            {f.file
              ? `Attached: ${f.file.name} · stored on this device, not uploaded.`
              : "Stored on this device — nothing is uploaded."}
          </span>
        </p>
        <p role="alert" style={{ color: "var(--rose)" }}>
          {f.error}
        </p>
        <button type="button" className="go" onClick={onSubmit}>
          Submit proof
        </button>
      </div>
    </Page>
  );
}

function PortfolioPage({ s, onLearn, onDownload }) {
  const done = Object.keys(TOPICS).filter((k) => s.work[k] && s.work[k].done);
  const learned = Object.values(s.learned || {});
  const title = s.name.trim() ? `${s.name.trim()}'s portfolio` : "Your portfolio";

  return (
    <Page>
      <h1>{title}</h1>
      <p className="muted">Each item says how it was checked.</p>
      {done.length + learned.length > 0 && (
        <p>
          <button type="button" className="go" onClick={onDownload}>
            Download portfolio
          </button>
        </p>
      )}

      <h2>Practical tasks</h2>
      {done.length ? (
        done.map((k) => (
          <div className="card" key={k}>
            <span className="tag">Passed automated checks</span>
            <h3>{TOPICS[k].title}</h3>
            <p>{s.work[k].why}</p>
            <details>
              <summary>View the work</summary>
              <pre>{s.work[k].code}</pre>
            </details>
          </div>
        ))
      ) : (
        <div className="card">
          <p>No completed tasks yet.</p>
        </div>
      )}

      <h2>Courses and learning</h2>
      {learned.length ? (
        learned.map((x) => {
          const link = safeLink(x.link);
          return (
            <div className="card" key={`${x.k}:${x.name}`}>
              <span className="tag">
                3 of 3 questions correct. Study is self-reported
              </span>
              <h3>{x.name}</h3>
              <p className="muted">
                {TOPICS[x.k].name}. {x.by}.
              </p>
              <p>{x.note}</p>
              {link && (
                <p>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    Student's proof link (not verified)
                  </a>
                </p>
              )}
              {x.file && typeof x.file === "object" && x.file.dataUrl && (
                <img
                  src={x.file.dataUrl}
                  alt={x.file.name}
                  style={{ maxWidth: "100%", borderRadius: 10, margin: "0.4rem 0" }}
                />
              )}
              {x.file && typeof x.file === "object" && (
                <p className="small muted">
                  Attached: {x.file.name} ({humanSize(x.file.size)}) · stored on this
                  device, not uploaded.
                </p>
              )}
            </div>
          );
        })
      ) : (
        <div className="card">
          <p>No course proof yet.</p>
          <button type="button" onClick={onLearn}>
            Find a course
          </button>
        </div>
      )}
    </Page>
  );
}

function PathPage({ s, onPortfolio }) {
  const [v, why] = verdict(s.mem);
  const goal = s.mem.find((m) => m.kind === "goal");

  return (
    <Page>
      <h1>{v}</h1>
      <p className="muted">{why}</p>
      <p>{goal ? goal.text : "No career goal recorded yet."}</p>

      <div className="grid">
        {standing(s.mem).map((r) => (
          <div className="card" key={r.id}>
            <h3>{r.name}</h3>
            <span className="small">
              Proof from your work: {Math.round(r.proof * 100)}% of practice areas
            </span>
            <div className="bar">
              <i style={{ width: `${r.proof * 100}%` }} />
            </div>
            <span className="small">
              Interest:{" "}
              {r.interest > 0
                ? "positive"
                : r.interest < 0
                  ? "low"
                  : "not known or neutral"}
            </span>
            <div className="bar" style={{ "--c": "var(--violet)" }}>
              <i style={{ width: `${Math.max(0, r.interest) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p>
        <button type="button" onClick={onPortfolio}>
          Open portfolio
        </button>
      </p>
    </Page>
  );
}

function MemoryPage({ s, onTogglePause, onWipe, onForget }) {
  const runs = [...s.runs].slice(-12).reverse();
  return (
    <Page>
      <h1>What your agent remembers</h1>
      <p className="muted">
        Forget anything that is wrong. Your path updates immediately. Memory stays on this
        device.
      </p>

      <div className="row" style={{ marginBottom: "1rem" }}>
        <button type="button" onClick={onTogglePause}>
          {s.paused ? "Resume memory" : "Pause memory"}
        </button>
        <button type="button" onClick={onWipe}>
          Forget everything
        </button>
        <span>{s.paused ? "Memory is paused." : ""}</span>
      </div>

      {s.mem.length ? (
        s.mem.map((m) => (
          <div className="card mem" key={m.id}>
            <div>
              <b>{m.text}</b>
              <br />
              <span className="muted small">Source: {m.source}</span>
            </div>
            <button type="button" onClick={() => onForget(m.id)}>
              Forget
            </button>
          </div>
        ))
      ) : (
        <div className="card">
          <p>Nothing remembered yet.</p>
        </div>
      )}

      <h2>Where it runs</h2>
      <p className="muted">
        Every agent turn is stamped with the brain that actually answered. Deterministic checks
        never leave this device.
      </p>
      {runs.length ? (
        runs.map((r) => (
          <div className="card mem" key={r.id}>
            <div>
              <b>{r.action}</b>
              <br />
              <span className="muted small">{r.detail}</span>
            </div>
            <span className={`badge ${r.brain.toLowerCase()}`}>{r.brain}</span>
          </div>
        ))
      ) : (
        <div className="card">
          <p className="muted">No agent turns yet.</p>
        </div>
      )}
    </Page>
  );
}
