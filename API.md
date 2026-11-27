# Practice Desk API contract

Base URL: `apiBase` in `config.js` (default `/api`). Bodies are JSON unless noted.
Successful JSON responses must use a JSON content type. `204 No Content` is accepted for changes.
On failure, return a 4xx or 5xx status with `{ "message": "Text the student can read" }`.
Sign-in: cookies are sent automatically; for tokens, set `getToken` in `config.js`.
There is no sign-in screen; protect the app with your own and have it set the cookie or token.

## Shared shapes

**Reply** (any chat, task or proof response may include these)

    { "messages": [Message], "suggestions": [Suggestion], "task": Task }

`messages` are NEW messages to append (the frontend ignores repeated ids).
Omit `suggestions` to keep the current buttons; send `[]` to clear them.

**Message**

    { "id": "string", "role": "student" | "agent",
      "agent": "mentor" | "reader" | "client" | "reviewer" | "scout",
      "text": "plain text", "reason": "optional: why the agent did this",
      "taskId": "optional: shows Open workspace",
      "plan": [{ "label": "string", "status": "pending" | "active" | "done" }],
      "resources": [{ "title": "", "provider": "", "url": "https://...", "courseId": "optional" }],
      "memoryNote": "optional: what was just remembered" }

**Suggestion** `{ "id": "string", "label": "string", "view": "optional: chat|studies|learn|portfolio|path|memory" }`
With `view`, the button opens that screen. Otherwise it is sent as a message.

**Task**

    { "id": "", "title": "", "from": "", "brief": "", "minutes": 30, "language": "SQL",
      "starterCode": "", "work": "saved work", "changeRequest": "optional",
      "requirements": [{ "id": "", "label": "", "status": "pending" | "passed" | "failed", "feedback": "" }],
      "hints": ["hints already revealed"], "hintsRemaining": 2,
      "status": "active" | "needs_explanation" | "completed",
      "question": "shown when status is needs_explanation" }

## Endpoints

| Method and path | Request | Response |
|---|---|---|
| GET `/session` | | `{ "onboarded": false }` |
| GET `/options` | | `{ "goals": [{ "id", "label" }] }` |
| GET `/assessment` | | `{ "questions": [{ "id", "text", "options": [string] }] }` (empty list hides this step) |
| POST `/onboarding` | `{ "skipped": true }` or `{ skipped:false, name, level, goalId, hoursPerWeek, examsNow, answers:[{ questionId, optionIndex or null }] }` | 204 |
| GET `/messages` | | Reply with the full history |
| POST `/messages` | `{ text, suggestionId, taskId }` | Reply, optionally `openTaskId`. Include the saved student message |
| GET `/topics` | | `{ "topics": [{ id, title, course, skills:[string], status }] }` |
| POST `/topics` | `{ notes }` | Reply |
| POST `/topics/:id/task` | | Reply plus `taskId` |
| GET `/tasks/:id` | | Task |
| PUT `/tasks/:id/work` | `{ work }` | 204 |
| POST `/tasks/:id/check` | `{ work }` (save it too) | Reply with `task` |
| POST `/tasks/:id/hint` | | Reply with `task` |
| POST `/tasks/:id/explanation` | `{ text }` | Reply with `task` |
| GET `/courses` | | `{ "courses": [{ id, topic, title, provider, url, duration, cost, proven }] }` |
| GET `/courses/:id/quiz` | | `{ "minWords": 20, "questions": [{ id, text, options:[string] }] }` |
| POST `/courses/:id/proof` | multipart: `answers` (JSON string of `{ questionId, optionIndex }`), `note`, `link`, `file` | `{ passed, results:[{ questionId, correct, feedback }] }`, plus optional Reply fields |
| GET `/path` | | `{ headline, explanation, goal, roles:[{ name, evidence:0-100, interest:0-100 or null, note }] }` |
| GET `/portfolio` | | `{ name, items:[{ id, type, title, date, summary, verification, work, link, fileUrl }] }` |
| GET `/portfolio/export` | | File with `Content-Disposition: attachment; filename="..."` |
| GET `/memory` | | `{ paused, items:[{ id, text, source }] }` |
| PATCH `/memory` | `{ paused }` | 204 |
| DELETE `/memory/:id` | | 204 |
| DELETE `/memory` | | 204 |

## Backend rules to enforce

- Never send correct quiz answers to the browser. Mark answers on the server.
- Run submitted code only in an isolated sandbox with time and memory limits.
- Check that each student can read and change only their own records.
- Validate uploads (type and size) and links on the server.
- Add CSRF protection if you use cookie sign-in.
- Honour memory pause and delete, including in anything given to the AI model.
