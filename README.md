# Practicum

**Your course is the theory. This is where you practise it.**

Practicum is an agent team that turns what a computer-science student is
studying into realistic, checked practice — and keeps proof of what they can
actually do. Built for
[#BuildHybridAI](https://devpost.com) 2026 (on-device + cloud).

It opens with a short, three-step onboarding, then hands you a desk staffed by
five agents:

| Agent | What it does |
|---|---|
| **Mentor** | Plans the next step, reflects, keeps an eye on your time |
| **Curriculum reader** | Turns a week of your course into skills that matter at work |
| **Client** | Brings a realistic problem, with a brief and a deadline |
| **Reviewer** | Runs the checks, shows only the first gap, asks *why* |
| **Scout** | Points you at a resource, then quizzes you on it |

## What you can do

1. **Onboard** (name → experience → goal → hours → a three-question starting
   check), or press *Skip with a sample student* to meet Ada.
2. **Practise** — pick a topic. The Reader explains the lesson, the Client drops
   a realistic problem, and you solve it in the workspace.
3. **Get checked on-device** — SQL normalisation, JavaScript arrays and IP
   subnetting are graded by deterministic checks that run locally. Your code is
   never sent anywhere to be graded.
4. **Explain yourself** — pass every check and the Reviewer asks *why you did it
   that way* before the work counts as proof.
5. **Learn, then prove it** — the Scout suggests real resources (free and paid),
   and after studying you answer a short quiz and write what you built. That
   goes in your portfolio.
6. **Watch your path form** — every completion and *"I enjoyed it"* / *"not for
   me"* moves the interest-and-proof bars toward the role that fits.

The rail takes you through six sections: **Agent**, **Studies**, **Learn**,
**Portfolio**, **Path** and **Memory**.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

Deep links:

- `/?demo=1` — load Ada's desk (a sample student)
- `/?fresh=1` — start from a clean slate (clears saved state)

Without any Firebase keys the app still works: the deterministic checks and the
whole Learn/Portfolio track run locally, and the language agents fall back to a
short, honest offline line. Add your keys (see `SETUP.md`) and the Mentor,
Reader and Reviewer start thinking through Firebase AI Logic.

## How the hybrid routing works

The student is never asked "keep it local or send it to the cloud" per action.
The system decides, and every turn is stamped with where it actually ran.

- **On device, always**: the code checks, memory, path scoring, and the
  Learn/Portfolio quizzes. Private, instant, and nothing leaves the machine.
- **Language in the cloud (or on-device Nano)**: the Mentor, Reader and
  Reviewer call Firebase AI Logic with `PREFER_ON_DEVICE` — local when Gemini
  Nano is available, cloud otherwise. Each message carries a `LOCAL` / `CLOUD`
  badge, and the **Memory → "Where it runs"** log is the receipt for every turn.

One short, single-turn request per agent turn, so it fits on-device inference
(and falls back cleanly when there is no local model).

## Design rules baked into the code

- Open with a form, then work as a team — the onboarding answers are the packet.
- Deterministic checks never leave the device; the model never grades code.
- Proof is *your* code and *your* words, kept exactly as you wrote them.
- Memory lives on the device. Forget anything that's wrong, and the path moves.
- A watched video is not proof — a ticket passed the checks, plus your own
  explanation, is.
- Study is self-reported and labelled as such; the quiz is what's verified.

## Stack

Vite + React 19 + JavaScript, Firebase 13 (`firebase/ai`), App Check. Styled
with Bricolage Grotesque and Instrument Sans.

## Next

- Add real on-device inference on a Nano-capable machine (Chrome 139+)
- Deploy to Firebase Hosting
- Record the ≤3-minute demo and submit on Devpost
