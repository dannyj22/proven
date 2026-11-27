// The landing page — opened first. It explains what Proven does, shows an
// illustrative example session, and hands off to the app (or the intro form).

import { useEffect, useState } from "react";
import { AG } from "../desk/data.js";

const SAMPLE = {
  mentor: "Based on your recent work and feedback, here is a next step to try.",
  reader: "I found the key skills in your lesson. Please confirm they look right.",
  client: "Here is a problem to solve. Ask questions if any requirement is unclear.",
  reviewer: "Some requirements are met. Here is the one thing to improve next.",
  scout: "Here is a resource for that skill. When you finish, show what you learned.",
};

// [agent key or null (the student), message text]
const DEMO = [
  [null, "This is what I studied this week."],
  ["reader", "I picked out the key skills in your lesson."],
  ["client", "Here is a work request that uses those skills."],
  [null, "Here is my first attempt."],
  ["reviewer", "Good start. One requirement still needs work."],
  ["scout", "This resource can help you close that gap."],
  ["mentor", "How did that kind of work feel?"],
];

const STEPS = [
  ["Share", "Tell the agent what you studied and what you want to try.", "#ffc53d"],
  ["Practise", "Solve a task framed as a request from a client.", "#ff8a65"],
  ["Improve", "Get checks and hints, then try again.", "#ff5c7a"],
  ["Learn", "Study a recommended course and answer questions on the topic.", "#8a3ff0"],
  ["Show", "Keep completed work and course proof in your portfolio.", "#0fbf93"],
];

function Avatar({ agent }) {
  return (
    <span className="av" style={{ "--c": AG[agent].color }} aria-hidden="true">
      {AG[agent].name[0]}
    </span>
  );
}

export default function Landing({ s, onLaunch, onTheme }) {
  const [shown, setShown] = useState(0);
  const [runId, setRunId] = useState(0);
  const [agent, setAgent] = useState("mentor");

  useEffect(() => {
    setShown(0);
    const timers = DEMO.map((_, i) =>
      setTimeout(() => setShown(i + 1), 1100 * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, [runId]);

  const go = s.ready ? "Return to my agent" : "Try the demo";
  const cta = (cls = "") => (
    <button type="button" className={`lp-cta ${cls}`} onClick={onLaunch}>
      {go}
    </button>
  );
  const jump = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div id="landing">
      <div className="lp-hero">
        <nav className="lp-w lp-nav" aria-label="Landing page">
          <span className="logo" aria-hidden="true">
            P
          </span>
          <strong>Proven</strong>
          <button type="button" className="lp-links" onClick={() => jump("how")}>
            How it works
          </button>
          <button type="button" className="lp-links" onClick={() => jump("agents")}>
            Agents
          </button>
          <button type="button" className="lp-links" onClick={() => jump("data")}>
            Your data
          </button>
          <button type="button" onClick={onTheme} aria-label="Light or dark theme">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z" />
            </svg>
          </button>
          {cta()}
        </nav>

        <div className="lp-w lp-split">
          <div>
            <h1>Turn this week's lecture into real work</h1>
            <p className="lp-lead">
              Proven turns what a computer-science student studies into realistic, checked
              practice — and proof of what they can actually do.
            </p>
            <div className="row">
              {cta("lp-big")}
              <button type="button" className="lp-big" onClick={() => jump("how")}>
                See how it works
              </button>
            </div>
          </div>

          <div className="lp-demo" aria-label="Example conversation">
            <header>
              <b>Example session</b>
              <button type="button" onClick={() => setRunId((r) => r + 1)}>
                Replay
              </button>
            </header>
            <div id="lp-log">
              {DEMO.slice(0, shown).map(([a, text], i) =>
                a ? (
                  <div className="msg new" style={{ "--c": AG[a].color }} key={i}>
                    <Avatar agent={a} />
                    <div className="body">
                      <span className="who">{AG[a].name}</span>
                      <div className="bubble">{text}</div>
                    </div>
                  </div>
                ) : (
                  <div className="msg me new" key={i}>
                    <div className="body">
                      <div className="bubble">{text}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <main>
        <section className="lp-w lp-sec">
          <h2>Knowing the theory is only the start</h2>
          <p>
            Class exercises often name the method to use. Work usually starts with a
            problem, and you decide which method fits.
          </p>
          <div className="lp-two" style={{ marginTop: "1.4rem" }}>
            <div className="lp-box">
              <p className="muted">In class</p>
              <p className="lp-quote">
                Apply the concept you have just been taught to a set exercise.
              </p>
            </div>
            <div className="lp-box warm">
              <p>In practice</p>
              <p className="lp-quote">
                Understand a need, choose an approach, deliver a solution and explain your
                decisions.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-w lp-sec" id="how">
          <h2>From lecture to portfolio</h2>
          <ol className="lp-steps">
            {STEPS.map(([h, t, c]) => (
              <li key={h} style={{ "--c": c }}>
                <h3>{h}</h3>
                <p>{t}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-w lp-sec" id="agents">
          <h2>One student, five kinds of help</h2>
          <p>The right agent steps in as you work. Select one to see an example.</p>
          <div className="lp-pick">
            {Object.entries(AG).map(([k, a]) => (
              <button
                type="button"
                key={k}
                aria-pressed={k === agent}
                onClick={() => setAgent(k)}
              >
                <Avatar agent={k} />
                {a.name}
              </button>
            ))}
          </div>
          <div className="lp-box lp-sample" aria-live="polite">
            <p>
              <b>{AG[agent].role}.</b>
            </p>
            <div className="msg" style={{ "--c": AG[agent].color }}>
              <Avatar agent={agent} />
              <div className="body">
                <span className="who">{AG[agent].name}</span>
                <div className="bubble">{SAMPLE[agent]}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-w lp-sec">
          <h2>A path that grows with you</h2>
          <div className="lp-two">
            <div className="lp-box">
              <h3>No early labels</h3>
              <p>
                The agent looks at completed work and what you say you like. With little
                evidence, it says it is too early to say.
              </p>
            </div>
            <div className="lp-box">
              <h3>Proof you can explain</h3>
              <p>
                Portfolio items show how each was checked, so a self-reported course is
                never presented as verified.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-w lp-sec" id="data">
          <h2>You control what the agent remembers</h2>
          <p>
            See each memory and its source, pause memory, or delete it. Memory stays on
            this device.
          </p>
        </section>

        <div className="lp-w">
          <div className="lp-end">
            <h2>Try your first work request</h2>
            <p>Take what you are learning and practise using it to solve a problem.</p>
            {cta("lp-big")}
          </div>
        </div>
      </main>

      <footer className="lp-w">
        Proven · Checks run on your device; agent language runs in the cloud (or on-device
        Gemini Nano). Example conversations are illustrative.
      </footer>
    </div>
  );
}
