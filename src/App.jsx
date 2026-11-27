// App — the practice desk.
//
// Deterministic work (checks, memory, path scoring) runs on the device.
// Language turns (mentor, reader, reviewer) go through Firebase AI Logic with
// PREFER_ON_DEVICE: local when Gemini Nano is available, cloud otherwise. The
// badge on each message and the "Where it runs" log record what actually
// happened. Nothing asks the student to choose a brain.

import { useEffect, useRef, useState } from "react";
import Intro from "./components/Intro.jsx";
import Desk from "./components/Desk.jsx";
import {
  AG,
  AREA,
  ASK,
  COURSES,
  ECHO_ACTIONS,
  QUIZ,
  ROLES,
  TOPICS,
  USED,
  blankForm,
  checksFor,
  feelChips,
  freshDesk,
  freshWork,
  has,
  paceChips,
  strip,
  topicChips,
  verdict,
  workChips,
} from "./desk/data.js";
import {
  mentorChatPrompt,
  mentorWelcomePrompt,
  readerPrompt,
  reviewerPrompt,
} from "./desk/prompts.js";
import { askAgent } from "./desk/ai.js";
import { clear, load, save } from "./lib/storage.js";

function loadInitial() {
  const p = new URLSearchParams(window.location.search);
  if (p.get("fresh") === "1") {
    clear();
    return freshDesk();
  }
  const loaded = load();
  if (!loaded) return freshDesk();
  return {
    ...freshDesk(),
    ...loaded,
    course: loaded.course ?? null,
    forms: loaded.forms || {},
    learned: loaded.learned || {},
    busy: null,
    await: null,
    msgs: (loaded.msgs || []).map((m) => (m.streaming ? { ...m, streaming: false } : m)),
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const words = (t) => String(t || "").split(/\s+/).filter(Boolean).length;

const safeLink = (u) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

function party() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 70; i++) {
    const e = document.createElement("i");
    e.className = "confetti";
    e.style.left = `${Math.random() * 100}vw`;
    e.style.background = ["#ffc53d", "#ff5c7a", "#0fbf93", "#8a3ff0"][i % 4];
    e.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 2500);
  }
}

export default function App() {
  const [s, setS] = useState(loadInitial);
  const [armed, setArmed] = useState(false);
  const [sampleArmedFor, setSampleArmedFor] = useState(null);

  const sRef = useRef(s);
  const idRef = useRef(0);
  const memIdRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const genRef = useRef(0);

  // Persist with a short debounce so streaming does not hit storage per token.
  useEffect(() => {
    const t = setTimeout(() => save(s), 250);
    return () => clearTimeout(t);
  }, [s]);

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
  }, [s.theme]);

  // Deep link for filming: ?demo=1 opens Ada's desk.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("demo") !== "1" || sRef.current.ready) return;
    update({ name: "Ada", goal: "backend", known: { db: true, js: true, net: false } });
    enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror state into the ref immediately. The agent queue reads sRef.current
  // right after an update (for example enter() reads the quiz answers that were
  // just written), so React's deferred updater would be too late.
  function update(patch) {
    const prev = sRef.current;
    const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
    sRef.current = next;
    setS(next);
  }

  // ── message + agent plumbing ─────────────────────────────────

  function pushMsg(msg) {
    const id = `m${++idRef.current}`;
    update((p) => ({ ...p, msgs: [...p.msgs, { id, ...msg }] }));
    return id;
  }

  function patchMsg(id, patch) {
    update((p) => ({
      ...p,
      msgs: p.msgs.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  const setChips = (chips) => update({ chips });

  // One agent action at a time, like a small team with a shared queue.
  function enqueue(fn) {
    const g = genRef.current;
    queueRef.current = queueRef.current.then(async () => {
      if (g !== genRef.current) return;
      const alive = () => g === genRef.current;
      try {
        await fn(alive);
      } catch (err) {
        console.error("agent action failed:", err);
      }
      if (alive()) update({ busy: null });
    });
  }

  async function say(alive, agent, payload, why) {
    if (!alive()) return;
    update({ busy: agent });
    await wait(450);
    if (!alive()) return;
    pushMsg({ agent, why, ...payload });
  }

  // Uses the model for the words, falls back to a grounded line if the brain
  // is unreachable, and stamps the real inference source.
  async function sayAI(alive, agent, prompt, fallback, why, label) {
    if (!alive()) return;
    update({ busy: agent });
    await wait(300);
    if (!alive()) return;

    const id = pushMsg({ agent, text: "", streaming: true, why, brain: null });
    let got = "";
    const run = await askAgent(prompt, (text, brain) => {
      got = text;
      if (!alive()) return;
      patchMsg(id, { text, streaming: true, brain });
    });
    if (!alive()) return;

    const text = (run.text || got || "").trim();
    const brain = run.brain;
    patchMsg(id, {
      text: text || fallback,
      streaming: false,
      brain: text ? brain : "OFFLINE",
    });

    update((p) => ({
      ...p,
      runs: [
        ...p.runs,
        {
          id: `r${++idRef.current}`,
          agent,
          brain: text ? brain || "CLOUD" : "OFFLINE",
          action: label || AG[agent].name,
          detail: text
            ? brain === "LOCAL"
              ? "answered on device"
              : brain === "CLOUD"
                ? "answered in cloud"
                : "source not reported"
            : run.error || "offline fallback",
          at: Date.now(),
        },
      ],
    }));
  }

  function remember(kind, k, text, source) {
    if (sRef.current.paused) return false;
    const group =
      { like: "feel", dislike: "feel", okay: "feel", easy: "pace", hard: "pace", right: "pace" }[
        kind
      ] || kind;
    const entry = { id: ++memIdRef.current, kind, group, k, text, source };
    const memoId = `m${++idRef.current}`;
    update((p) => ({
      ...p,
      mem: [...p.mem.filter((m) => !(m.group === group && m.k === k)), entry],
      msgs: [...p.msgs, { id: memoId, memo: text }],
    }));
    return true;
  }

  // ── onboarding ───────────────────────────────────────────────

  function enter() {
    const cur = sRef.current;
    const entries = [];
    const add = (kind, group, k, text) =>
      entries.push({ id: ++memIdRef.current, kind, group, k, text, source: "Your introduction" });

    if (cur.name.trim()) add("name", "name", "name", `Your name is ${cur.name.trim()}`);
    add("level", "level", "level", `Experience: ${cur.level.toLowerCase()}`);
    add(
      "time",
      "time",
      "time",
      `${cur.hours} practice ${cur.hours === 1 ? "hour" : "hours"} a week`
    );
    if (cur.exam) add("exam", "exam", "exam", "Exams are on, so keep tasks light");
    if (cur.goal !== "none")
      add("goal", "goal", "goal", `Your stated goal: ${ROLES[cur.goal][0].toLowerCase()}`);
    QUIZ.forEach((q) => {
      if (q.k in cur.known)
        add(
          "start",
          "start",
          q.k,
          `Starting check, ${AREA[q.k]}: ${cur.known[q.k] ? "correct" : "new to you"}`
        );
    });

    update((p) => ({
      ...p,
      ready: true,
      view: "chat",
      pane: "chat",
      msgs: [],
      chips: [],
      mem: [...p.mem, ...entries],
    }));
    intro();
  }

  function intro() {
    enqueue(async (alive) => {
      const cur = sRef.current;
      const name = has(cur.mem, "name", "name") ? cur.name.trim() : "";
      const goal = has(cur.mem, "goal", "goal") ? ROLES[cur.goal][0].toLowerCase() : "";
      const fallback = `Hi${name ? `, ${name}` : ""}. I am your practice mentor. I connect what you study to the kind of work people do with it, and I learn what you enjoy as we go.\n\n${
        goal
          ? `You are interested in becoming a ${goal}. We will test that, with no rush.`
          : "No career goal is needed yet. We will explore and let the evidence build up."
      }\n\nWhat are you studying this week?`;

      await sayAI(
        alive,
        "mentor",
        mentorWelcomePrompt(name, goal, cur.mem),
        fallback,
        "Based on your introduction.",
        "mentor — welcome"
      );
      setChips(topicChips());
    });
  }

  // ── tickets ──────────────────────────────────────────────────

  function start(k) {
    if (sRef.current.busy) return;
    update({ cur: null, chips: [] });
    enqueue(async (alive) => {
      const cur = sRef.current;
      const t = TOPICS[k];
      const w = cur.work[k] || freshWork(k);
      if (!cur.work[k]) update((p) => ({ ...p, work: { ...p.work, [k]: w } }));

      if (w.done) {
        update({ cur: k });
        setChips(topicChips());
        await say(alive, "mentor", {
          text: `You already completed the ${t.name.toLowerCase()} ticket. Your work is open, or pick another topic.`,
        });
        return;
      }

      if (!cur.lessons.includes(k))
        update((p) => ({ ...p, lessons: [...p.lessons, k] }));

      const steps = [
        "Read the lesson topic",
        "Check what you have shown before",
        "Choose a realistic problem",
        "Set clear success checks",
      ];
      const planId = pushMsg({ agent: "mentor", plan: steps, at: 0 });

      for (let i = 0; i < steps.length; i++) {
        update({ busy: i === 0 ? "reader" : i === 2 ? "client" : "mentor" });
        patchMsg(planId, { at: i });
        await wait(550);
        if (!alive()) return;
      }
      patchMsg(planId, { at: steps.length });

      const known = sRef.current.known ? sRef.current.known[k] : undefined;
      const base = sRef.current.mem.find((m) => m.kind === "start" && m.k === k);
      const readerFallback = `${t.course} covers: ${t.extract
        .join(", ")
        .toLowerCase()}.\n\nWhere it meets real work: ${USED[k]}${
        base
          ? `\n\n${
              known
                ? "You answered the starting question correctly, so now try applying it."
                : "This was new in your starting check, so use hints whenever you need them."
            }`
          : ""
      }`;
      await sayAI(
        alive,
        "reader",
        readerPrompt(k, known),
        readerFallback,
        "Read from this week's course.",
        "reader — read the course week"
      );

      // If this area already feels hard, or the student is a beginner, open the
      // first hint before the ticket so the task starts at the right size.
      const now = sRef.current;
      if (
        has(now.mem, "hard", k) ||
        has(now.mem, "dislike", k) ||
        now.level === "Complete beginner"
      ) {
        const work = now.work[k];
        if (work && work.hints < 1) {
          update((p) => ({
            ...p,
            work: { ...p.work, [k]: { ...p.work[k], hints: 1 } },
          }));
        }
      }

      await say(
        alive,
        "client",
        { text: t.story, ticket: k },
        "This problem uses this week's lesson."
      );

      update({ cur: k });
      setChips(workChips(k));
    });
  }

  function check(k) {
    const cur = sRef.current;
    const w = cur.work[k];
    if (!w || w.done || cur.busy) return;

    const code = strip(w.code);
    const results = checksFor(k, w).map(([label, fn, tip]) => ({
      label,
      tip,
      ok: !!fn(code),
    }));
    const tries = w.tries + 1;
    update((p) => ({
      ...p,
      await: null,
      work: { ...p.work, [k]: { ...w, tries, result: results } },
    }));

    enqueue(async (alive) => {
      const bad = results.filter((r) => !r.ok);
      if (bad.length) {
        const passed = results.length - bad.length;
        const fallback = `${passed} of ${results.length} checks pass.\n\nImprove one thing next: ${bad[0].tip}`;
        await sayAI(
          alive,
          "reviewer",
          reviewerPrompt(k, results, code),
          fallback,
          `Attempt ${tries}. Only the first gap is shown so you can focus.`,
          "reviewer — checked your work"
        );
        setChips(workChips(k));
      } else {
        update({ await: k });
        await say(
          alive,
          "reviewer",
          {
            text: `All checks pass. Before I count it: ${TOPICS[k].why}\n\nReply below in at least 15 words.`,
          },
          "Explaining your choices shows that the understanding is yours."
        );
        setChips([]);
        update({ pane: "chat" });
      }
    });
  }

  function explain(text) {
    const cur = sRef.current;
    const k = cur.await;
    if (!k) return;
    const w = cur.work[k];
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    enqueue(async (alive) => {
      if (words < 15) {
        await say(alive, "reviewer", {
          text: `Tell me a little more. That was ${words} ${
            words === 1 ? "word" : "words"
          } and I need at least 15.`,
        });
        return;
      }

      update((p) => ({
        ...p,
        await: null,
        work: { ...p.work, [k]: { ...w, done: true, why: text } },
      }));
      party();

      await say(
        alive,
        "reviewer",
        {
          text: "Saved to your portfolio. The checks are real; your explanation is kept as you wrote it.",
        },
        "Your explanation is part of the proof."
      );

      remember(
        "proof",
        k,
        `Completed a ${AREA[k]} ticket (${w.tries} ${w.tries === 1 ? "check" : "checks"}, ${
          w.hints
        } ${w.hints === 1 ? "hint" : "hints"})`,
        "Your work"
      );

      await say(alive, "mentor", {
        text: "How did that kind of work feel?",
      });
      setChips(feelChips(k));
    });
  }

  function hint(k) {
    const cur = sRef.current;
    const w = cur.work[k];
    if (!w || w.done || cur.busy) return;
    if (w.hints >= 3) {
      enqueue((alive) =>
        say(alive, "mentor", {
          text: "You have seen all three hints. They are in your workspace.",
        })
      );
      return;
    }
    const h = TOPICS[k].hints[w.hints];
    const next = w.hints + 1;
    update((p) => ({
      ...p,
      work: { ...p.work, [k]: { ...w, hints: next } },
    }));
    enqueue((alive) =>
      say(alive, "mentor", { text: h, pre: next === 3 }, `Hint ${next} of 3.`)
    );
  }

  async function doRecommend(alive, k) {
    const w = sRef.current.work[k];
    const gap = w && w.result && w.result.find((r) => !r.ok);
    const why = gap
      ? `You are working on: ${gap.label.toLowerCase()}.`
      : w && (w.hints || w.tries > 1)
        ? `You used ${w.hints} hints and ${w.tries} checks, so a short refresher may help.`
        : `A next step in ${AREA[k]}.`;

    await say(
      alive,
      "scout",
      {
        text: "Pick one practical resource. When you finish, answer a few questions and add it to your portfolio.",
        courses: COURSES[k],
        topic: k,
      },
      why
    );
  }

  async function doNext(alive) {
    const cur = sRef.current;
    const open = Object.keys(TOPICS)
      .filter((k) => !(cur.work[k] && cur.work[k].done))
      .sort(
        (a, b) => (has(cur.mem, "dislike", a) ? 1 : 0) - (has(cur.mem, "dislike", b) ? 1 : 0)
      );
    const [v, why] = verdict(cur.mem);

    if (!open.length) {
      setChips([{ label: "Show my path", action: "view", value: "path" }]);
      await say(alive, "mentor", { text: `You tried all three practice areas. ${v}.` }, why);
      return;
    }

    setChips([
      { label: `Try ${TOPICS[open[0]].name.toLowerCase()}`, action: "start", value: open[0] },
      { label: "Show my path", action: "view", value: "path" },
      { label: "Pause for today", action: "pause", value: "" },
    ]);
    await say(
      alive,
      "mentor",
      {
        text: `Next, I suggest ${TOPICS[
          open[0]
        ].name.toLowerCase()} so you can compare a different kind of work.\n\nCurrent view: ${v.toLowerCase()}.`,
      },
      why
    );
  }

  function feel(value) {
    const [f, k] = value.split(":");
    enqueue(async (alive) => {
      const text = {
        like: `You enjoy ${AREA[k]}`,
        okay: `You found ${AREA[k]} okay`,
        dislike: `You do not enjoy ${AREA[k]}`,
      }[f];
      remember(f, k, text, "Your reaction after a ticket");
      await say(alive, "mentor", { text: "And the difficulty?" });
      setChips(paceChips(k));
    });
  }

  function pace(value) {
    const [p, k] = value.split(":");
    enqueue(async (alive) => {
      const text = {
        easy: "felt too easy",
        right: "difficulty felt right",
        hard: "felt too hard",
      }[p];
      remember(p, k, `${TOPICS[k].name}: ${text}`, "Your reaction after a ticket");

      const cur = sRef.current;
      const w = cur.work[k];
      if (p === "easy" && !w.change) {
        update((prev) => ({
          ...prev,
          cur: k,
          work: { ...prev.work, [k]: { ...w, change: true, done: false, result: null } },
        }));
        await say(
          alive,
          "client",
          {
            text: `One more thing. ${TOPICS[k].change[0]}. Please update your work.`,
          },
          "You said it felt too easy, so the requirement changed."
        );
        setChips([
          { label: "Check my work", action: "check", value: k },
          { label: "Give me a hint", action: "hint", value: k },
        ]);
        return;
      }

      if (p === "hard" || w.hints) await doRecommend(alive, k);
      await doNext(alive);
    });
  }

  // ── learning proof + portfolio ───────────────────────────────

  function prove(id) {
    update({ course: id, view: "learn" });
  }

  function allCourses() {
    update({ course: null });
  }

  function editForm(field, value) {
    const cur = sRef.current;
    const id = cur.course;
    if (!id) return;
    const f = cur.forms[id] || blankForm();
    update((p) => ({
      ...p,
      forms: { ...p.forms, [id]: { ...f, [field]: value } },
    }));
  }

  // Store a proof attachment locally (name, size, and a preview for small
  // images). Nothing is uploaded — it lives in the student's portfolio on this
  // device, exactly like the rest of their memory.
  function attachFile(fileObj) {
    const cur = sRef.current;
    const id = cur.course;
    if (!id) return;

    const setFile = (file) =>
      update((p) => ({
        ...p,
        forms: { ...p.forms, [id]: { ...(p.forms[id] || blankForm()), file } },
      }));

    if (!fileObj) {
      setFile(null);
      return;
    }

    const meta = { name: fileObj.name, size: fileObj.size, type: fileObj.type, dataUrl: null };
    const smallImage = fileObj.type.startsWith("image/") && fileObj.size <= 1024 * 1024 * 1.5;

    if (smallImage) {
      const reader = new FileReader();
      reader.onload = () => setFile({ ...meta, dataUrl: reader.result });
      reader.onerror = () => setFile(meta);
      reader.readAsDataURL(fileObj);
    } else {
      setFile(meta);
    }
  }

  function answer(value) {
    const cur = sRef.current;
    const id = cur.course;
    if (!id) return;
    const [n, j] = value.split(":").map(Number);
    const f = cur.forms[id] || blankForm();
    update((p) => ({
      ...p,
      forms: {
        ...p.forms,
        [id]: { ...f, ans: { ...f.ans, [n]: j }, result: null, error: "" },
      },
    }));
  }

  function submitProof() {
    const cur = sRef.current;
    const id = cur.course;
    if (!id) return;
    const [k, i] = id.split(":");
    const questions = ASK[k];
    if (!questions) return;

    const f = cur.forms[id] || blankForm();
    const note = f.note.trim();
    const link = f.link.trim();
    let error = "";

    if (Object.keys(f.ans).length < questions.length) {
      error = "Answer all three questions.";
    } else if (words(note) < 20) {
      error = `Describe what you learned or built in at least 20 words. You have ${words(note)}.`;
    } else if (link && !safeLink(link)) {
      error = "Use a full link that starts with https://, or leave it empty.";
    }

    if (error) {
      update((p) => ({
        ...p,
        forms: { ...p.forms, [id]: { ...f, result: null, error } },
      }));
      return;
    }

    const results = questions.map((q, n) => f.ans[n] === q[2]);
    if (!results.every(Boolean)) {
      update((p) => ({
        ...p,
        forms: { ...p.forms, [id]: { ...f, result: results, error: "" } },
      }));
      return;
    }

    const [name, by, url] = COURSES[k][Number(i)];
    const worked = cur.work[k] && cur.work[k].done;

    update((p) => ({
      ...p,
      learned: {
        ...p.learned,
        [id]: { k, name, by, url, note, link, file: f.file },
      },
      forms: { ...p.forms, [id]: { ...f, result: results, error: "" } },
    }));

    remember(
      "course",
      id,
      `Passed the ${AREA[k]} questions after studying ${name}`,
      "Your course proof"
    );

    update((p) => ({
      ...p,
      msgs: [
        ...p.msgs,
        {
          id: `m${++idRef.current}`,
          agent: "mentor",
          text: `You passed the questions for ${name} and it is in your portfolio. Now use it on real-looking work.`,
          why: "Answering questions shows recall. A ticket shows you can apply it.",
        },
      ],
      chips: [
        worked
          ? { label: "Show my portfolio", action: "view", value: "folio" }
          : { label: "Apply it in a ticket", action: "begin", value: k },
      ],
    }));
    party();
  }

  function downloadPortfolio() {
    const cur = sRef.current;
    const tasks = Object.keys(TOPICS).filter((k) => cur.work[k] && cur.work[k].done);
    const courses = Object.values(cur.learned || {});
    const lines = [
      `PORTFOLIO${cur.name.trim() ? `: ${cur.name.trim()}` : ""}`,
      "",
      "PRACTICAL TASKS (passed automated checks)",
    ];
    tasks.forEach((k) => {
      lines.push("", TOPICS[k].title, cur.work[k].why, cur.work[k].code);
    });
    lines.push("", "COURSES (questions passed, study self-reported)");
    courses.forEach((x) => {
      lines.push(
        "",
        `${x.name} (${x.by})`,
        x.note,
        x.link ? `Proof link, not verified: ${x.link}` : "",
        x.file ? `Attached: ${x.file.name} (stored on device, not uploaded)` : ""
      );
    });

    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function later() {
    if (sRef.current.busy) return;
    enqueue(async (alive) => {
      const cur = sRef.current;
      const done = Object.keys(TOPICS).filter((k) => cur.work[k] && cur.work[k].done);
      const weak = done.sort(
        (x, y) =>
          cur.work[y].hints + cur.work[y].tries - (cur.work[x].hints + cur.work[x].tries)
      )[0];

      if (weak) {
        await say(
          alive,
          "mentor",
          {
            text: `You have completed ${done.length} ${
              done.length === 1 ? "ticket" : "tickets"
            }. The ${TOPICS[weak].name.toLowerCase()} one needed the most checks and hints, so it is worth a review. Without looking back: ${TOPICS[
              weak
            ].why.replace("did you", "would you")}`,
          },
          "This is the completed ticket where you needed the most checks and hints."
        );
        setChips([
          { label: "Show my path", action: "view", value: "path" },
          ...topicChips().filter((c) => !(cur.work[c.value] && cur.work[c.value].done)),
        ]);
      } else {
        await say(alive, "mentor", {
          text: "Here is where you are: no ticket is completed yet. Start with a small one?",
        });
        setChips(topicChips());
      }
    });
  }

  // ── free text ────────────────────────────────────────────────

  function hear(text) {
    const t = String(text).toLowerCase();
    const k = /sql|databas|normali|table|join/.test(t)
      ? "db"
      : /javascript|\bjs\b|array|web|program|cod/.test(t)
        ? "js"
        : /subnet|network|\bip\b|cyber|secur/.test(t)
          ? "net"
          : null;

    if (sRef.current.await) {
      explain(text);
      return;
    }

    const no =
      /(don'?t|do not|never)\s+(really\s+)?(like|enjoy)|hate|dislike|boring|not (a fan|for me)/.test(
        t
      );
    const yes = !no && /\b(like|love|enjoy|interested|fun)\b/.test(t);

    if ((no || yes) && k) {
      enqueue(async (alive) => {
        if (sRef.current.paused) {
          await say(alive, "mentor", { text: "Memory is paused, so I will not keep that." });
          return;
        }
        remember(
          no ? "dislike" : "like",
          k,
          `You ${no ? "do not enjoy" : "enjoy"} ${AREA[k]}`,
          "You said so in chat"
        );
        await say(alive, "mentor", {
          text: no
            ? "Noted. I will still show you what your course needs, with extra help, and weigh it lower in your path."
            : "I will look for more ways to test that interest.",
        });
      });
      return;
    }

    if (/hint|stuck|help/.test(t) && sRef.current.cur) {
      hint(sRef.current.cur);
      return;
    }

    if (/course|learn more|recommend|read/.test(t) && (k || sRef.current.cur)) {
      const kk = k || sRef.current.cur;
      enqueue((alive) => doRecommend(alive, kk));
      return;
    }

    if (/path|career|what should|become/.test(t)) {
      const [v, why] = verdict(sRef.current.mem);
      setChips([{ label: "Show my path", action: "view", value: "path" }, ...topicChips()]);
      enqueue((alive) => say(alive, "mentor", { text: `${v}.` }, why));
      return;
    }

    if (k) {
      start(k);
      return;
    }

    enqueue(async (alive) => {
      await sayAI(
        alive,
        "mentor",
        mentorChatPrompt(text, sRef.current.mem, sRef.current.cur),
        "I can help with the ticket, your path, or what to learn next. Try asking about this week's topic, or tell me what you enjoyed.",
        "Answered from what the agent remembers.",
        "mentor — answered a question"
      );
    });
  }

  function send(text) {
    if (sRef.current.busy) return;
    const value = String(text || "").trim();
    if (!value) return;
    pushMsg({ me: value });
    update({ chips: [] });
    hear(value);
  }

  // ── chips + pages ────────────────────────────────────────────

  function chip(c) {
    if (sRef.current.busy && c.action !== "view") return;
    if (ECHO_ACTIONS.includes(c.action)) {
      pushMsg({ me: c.label });
      update({ chips: [] });
    } else {
      setChips([]);
    }
    dispatch(c.action, c.value);
  }

  function dispatch(action, value) {
    switch (action) {
      case "view":
        update({ view: value });
        break;
      case "pane":
        update({ pane: value });
        break;
      case "open":
        update({ cur: value, view: "chat", pane: "side" });
        break;
      case "close":
        update({ cur: null, pane: "chat" });
        break;
      case "start":
        start(value);
        break;
      case "begin":
        pushMsg({ me: `Help me practise ${TOPICS[value].name.toLowerCase()}` });
        update({ view: "chat", chips: [] });
        start(value);
        break;
      case "hint":
        hint(value);
        break;
      case "check":
        check(value);
        break;
      case "learn":
        enqueue((alive) => doRecommend(alive, value));
        break;
      case "prove":
        prove(value);
        break;
      case "allcourses":
        allCourses();
        break;
      case "answer":
        answer(value);
        break;
      case "submit":
        submitProof();
        break;
      case "download":
        downloadPortfolio();
        break;
      case "sample":
        loadSample(value);
        break;
      case "feel":
        feel(value);
        break;
      case "pace":
        pace(value);
        break;
      case "pause":
        enqueue((alive) =>
          say(alive, "mentor", {
            text: "I will stop suggesting tasks for now. Your desk is saved on this device, so pick up any topic whenever you are back.",
          })
        );
        break;
      case "later":
        later();
        break;
      case "theme":
        update((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }));
        break;
      case "mpause":
        update((p) => ({ ...p, paused: !p.paused }));
        break;
      case "wipe":
        update((p) => ({ ...p, mem: [], msgs: p.msgs.filter((m) => !m.memo) }));
        break;
      case "forget":
        forget(value);
        break;
      default:
        break;
    }
  }

  function loadSample(k) {
    const cur = sRef.current;
    const w = cur.work[k];
    if (!w) return;
    if (w.code !== TOPICS[k].start && sampleArmedFor !== k) {
      setSampleArmedFor(k);
      setTimeout(() => setSampleArmedFor((v) => (v === k ? null : v)), 2500);
      return;
    }
    setSampleArmedFor(null);
    update((p) => ({
      ...p,
      await: null,
      work: { ...p.work, [k]: { ...w, code: TOPICS[k].sample, result: null } },
    }));
  }

  function onCode(k, code) {
    const w = sRef.current.work[k];
    if (!w) return;
    update((p) => ({
      ...p,
      await: null,
      work: { ...p.work, [k]: { ...w, code, result: null } },
    }));
  }

  function forget(id) {
    const m = sRef.current.mem.find((x) => x.id === id);
    if (!m) return;
    update((p) => ({
      ...p,
      mem: p.mem.filter((x) => x.id !== id),
      msgs: p.msgs.filter((x) => !(x.memo && x.memo === m.text)),
    }));
  }

  function reset() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 2500);
      return;
    }
    setArmed(false);
    genRef.current++;
    queueRef.current = Promise.resolve();
    clear();
    setSampleArmedFor(null);
    update(freshDesk());
  }

  const api = {
    view: (v) => update({ view: v }),
    pane: (p) => update({ pane: p }),
    theme: () => update((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" })),
    reset,
    open: (k) => update({ cur: k, view: "chat", pane: "side" }),
    close: () => update({ cur: null, pane: "chat" }),
    send,
    chip,
    later,
    check,
    hint,
    sample: loadSample,
    code: onCode,
    begin: (k) => dispatch("begin", k),
    viewWork: (k) => update({ cur: k, view: "chat", pane: "side" }),
    notes: (text) => {
      pushMsg({ me: text });
      update({ view: "chat", chips: [] });
      hear(text);
    },
    togglePause: () => update((p) => ({ ...p, paused: !p.paused })),
    wipe: () => dispatch("wipe"),
    forget,
    prove,
    allCourses,
    answer,
    note: (v) => editForm("note", v),
    link: (v) => editForm("link", v.trim()),
    file: attachFile,
    submit: submitProof,
    download: downloadPortfolio,
    sampleArmedFor,
  };

  if (!s.ready) {
    return (
      <Intro
        s={s}
        onSet={(patch) => update(patch)}
        onNext={() => update((p) => ({ ...p, step: Math.min(3, p.step + 1) }))}
        onBack={() => update((p) => ({ ...p, step: Math.max(1, p.step - 1) }))}
        onFinish={() => {
          const cur = sRef.current;
          const known = Object.fromEntries(
            QUIZ.map((q, i) => [q.k, cur.quiz[i] === q.a])
          );
          update({ known });
          enter();
        }}
        onDemo={() => {
          update({ name: "Ada", goal: "backend", known: { db: true, js: true, net: false } });
          enter();
        }}
      />
    );
  }

  return <Desk s={s} api={api} armed={armed} />;
}
