# Proven — 3-minute demo script (#BuildHybridAI 2026)

**Goal:** show that Proven turns a course into *proof*, with the hybrid split
visible — deterministic checks on-device, agent language in the cloud (and on
Nano where available).

**Run it:** `npm run dev`, open `http://localhost:5173/?fresh=1&demo=1`, record
the tab at 1600×900 (or full window). Keep narration to ~55–65 words per 15s.

---

## Beat 1 — Cold open + onboarding (0:00–0:35)

**Narration**
> "This is Proven. You study the theory in class — Proven turns it into
> something you can actually do, with proof at the end."

**On screen**
1. Land on the onboarding card.
2. Click **Skip with a sample student** (Ada appears).
3. Point at the five agents on the left (Mentor, Curriculum reader, Client,
   Reviewer, Scout) as the Mentor's welcome streams in — note the **CLOUD**
   badge on the message.

**Line to land**
> "Five agents run your desk. Their language is generated in the cloud — and
> stamped, so you always know where it ran."

---

## Beat 2 — A realistic ticket (0:35–1:10)

**On screen**
1. Click **This week: database normalisation**.
2. Watch the Mentor plan tick through, the Reader summarise the course week,
   then the Client drop the ticket: *"Our sales sheet keeps breaking"*.
3. Click **Open workspace**.

**Narration**
> "The Client doesn't hand you a quiz — it hands you a realistic problem. A
> pharmacy's sales sheet, repeated data, disagreeing prices. Design the tables."

---

## Beat 3 — On-device checks + the 'why' gate (1:10–1:55)

**On screen**
1. Type (or **Load unfinished example**) SQL: three tables, primary keys,
   foreign keys, a `JOIN` with `SUM ... GROUP BY`.
2. Click **Check my work** → the Reviewer flags **one** gap (a cloud message).
3. Fix it, **Check my work** again → all five checks pass → the Reviewer asks
   *why you did it that way*.
4. Type a one-line explanation → **proof saved**, confetti.

**Narration (the hybrid money shot)**
> "The grading never leaves your laptop. Those checks are deterministic — they
> run on-device, and your code is never sent anywhere. Only when it passes does
> the Reviewer ask the question that matters: *why did you do it that way?*
> Explain it, and it's proof."

---

## Beat 4 — Learn, then prove it (1:55–2:30)

**On screen**
1. Click **I enjoyed it** → **About right** (path starts to move).
2. Click **Recommend a course** → the Scout drops real resources (free and
   paid), each with *I studied this, test me*.
3. Click one → answer the three-question quiz, write what you learned, submit.

**Narration**
> "Practice finds the gaps. The Scout points at a real resource — YouTube,
> Udemy, SQLBolt. Study it, pass the three questions, and it's in your
> portfolio. Study is self-reported, and labelled that way. The quiz is what's
> verified."

---

## Beat 5 — Proof + the receipt (2:30–2:55)

**On screen**
1. Open **Portfolio** → the task (tag: *passed automated checks*) and the
   course (tag: *study self-reported*).
2. Open **Memory** → scroll to **Where it runs** — show the LOCAL/CLOUD stamps
   for every agent turn.

**Narration**
> "Everything you finish becomes evidence — your code, your words, and how each
> was checked. And every agent turn is stamped with where it actually ran."

---

## Beat 6 — Close (2:55–3:00)

**Narration**
> "Your course is the theory. Proven is the proof."

---

## On-device (Nano) cutaway — optional, film on a 16 GB laptop

If you have a machine with Gemini Nano (Chrome 139+, 16 GB):

1. Enable the flag
   `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart, wait
   for the model to download.
2. Reload the same demo. The Mentor/Reader/Reviewer messages now show **LOCAL**
   instead of **CLOUD**.
3. Cut 5 seconds of that into Beat 1 or Beat 3 as the "on-device" proof.

The deterministic checks are on-device on **any** machine — so the hybrid story
holds even without Nano.
