# Practice Desk frontend + backend

Plain HTML, CSS and JavaScript. No build step.

- `index.html`: the page
- `config.js`: app name, API address, token and agent names
- `client.js`: every backend call
- `app.js`: screens and interactions
- `server.js`: the backend — serves the frontend and the API in `API.md`
- `API.md`: the contract the backend follows

## Run

1. Create a free Gemini API key: https://aistudio.google.com/apikey
2. Put it in a `.env` file next to the code (never committed):

       GEMINI_API_KEY=your-key

3. Start the app (needs Node 18+):

       node server.js

Open http://localhost:5173. One command runs the whole thing: the landing
page, the five agents, onboarding, tasks, grading, the Learn track, the
portfolio, memory and the path.

Each student gets their own desk (a cookie session), stored on the server
machine under `data/`. Attachments are stored under `uploads/`.

## What is real here

- The Mentor, Curriculum reader, Client, Reviewer and Scout all speak through
  Gemini — one short, grounded request per turn.
- The student's own words become the curriculum: share what you studied (in
  chat or on the Studies page) and the team turns it into a topic and a
  realistic client task.
- Work is graded on the server against the task's own requirements, and the
  explanation gate decides whether the understanding is really the student's.
- Quiz answers never reach the browser; proofs are marked on the server.
- Courses come from a small catalog of real, checked resources.
- Memory records what the student did and said, with its source, and can be
  paused, deleted or wiped at any time.

## Free-tier note

The Gemini free tier allows a limited number of requests per model per day.
The server tries several models in turn, so a busy or exhausted one does not
break the app — it just answers on the next. For heavy use or a recorded demo,
enable billing on your Google AI project, or create keys in more than one
project and list them separated by commas in `.env`:

       GEMINI_API_KEY=key-one,key-two

## Before launch

Choose the final name, add privacy and terms pages, add sign-in, and confirm
that every claim on the landing page is true of your finished backend.
