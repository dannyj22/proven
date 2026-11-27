// Onboarding — three short steps, then the desk. Nothing here calls a model.

import { QUIZ, ROLES } from "../desk/data.js";

const Choice = ({ on, children, ...rest }) => (
  <button type="button" aria-pressed={on} {...rest}>
    {children}
  </button>
);

export default function Intro({ s, onSet, onNext, onBack, onFinish, onDemo }) {
  const goals = [["none", "Not sure yet"], ...Object.entries(ROLES).map(([k, r]) => [k, r[0]])];
  const quizDone = Object.keys(s.quiz).length === QUIZ.length;

  return (
    <div id="intro">
      <div className="onboard">
        <div className="steps" aria-label={`Step ${s.step} of 3`}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= s.step ? "on" : ""} />
          ))}
        </div>

        {s.step === 1 && (
          <>
            <h1>Practise your course on real-looking work</h1>
            <p className="muted">Your agent starts here. Tell it where you are now.</p>

            <label htmlFor="name">
              <b>Your first name</b>
            </label>
            <p>
              <input
                type="text"
                className="field"
                id="name"
                maxLength={30}
                value={s.name}
                placeholder="e.g. Ada"
                onChange={(e) => onSet({ name: e.target.value })}
              />
            </p>

            <fieldset>
              <legend>Your experience</legend>
              <div className="choices">
                {["Complete beginner", "Some knowledge", "Taken courses"].map((v) => (
                  <Choice key={v} on={s.level === v} onClick={() => onSet({ level: v })}>
                    {v}
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Where do you want to go?</legend>
              <div className="choices">
                {goals.map(([k, label]) => (
                  <Choice key={k} on={s.goal === k} onClick={() => onSet({ goal: k })}>
                    {label}
                  </Choice>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {s.step === 2 && (
          <>
            <h1>Fit practice around school</h1>
            <label htmlFor="hours">
              <b>
                Hours you can practise each week: <output id="hv">{s.hours}</output>
              </b>
            </label>
            <p>
              <input
                type="range"
                id="hours"
                min={1}
                max={15}
                value={s.hours}
                onChange={(e) => onSet({ hours: Number(e.target.value) })}
              />
            </p>

            <fieldset>
              <legend>Are exams happening now?</legend>
              <div className="choices">
                <Choice on={!s.exam} onClick={() => onSet({ exam: false })}>
                  No
                </Choice>
                <Choice on={s.exam} onClick={() => onSet({ exam: true })}>
                  Yes, keep tasks light
                </Choice>
              </div>
            </fieldset>
          </>
        )}

        {s.step === 3 && (
          <>
            <h1>Quick starting check</h1>
            <p className="muted">It is fine not to know. This only picks your starting point.</p>
            {QUIZ.map((q, i) => (
              <fieldset key={q.k}>
                <legend>{q.q}</legend>
                <div className="choices">
                  {[...q.o, "I don’t know yet"].map((o, j) => (
                    <Choice
                      key={o}
                      on={s.quiz[i] === j}
                      onClick={() => onSet({ quiz: { ...s.quiz, [i]: j } })}
                    >
                      {o}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            ))}
          </>
        )}

        <div className="row">
          {s.step > 1 && (
            <button type="button" onClick={onBack}>
              Back
            </button>
          )}
          {s.step < 3 ? (
            <button type="button" className="go" onClick={onNext}>
              Continue
            </button>
          ) : (
            <button type="button" className="go" onClick={onFinish} disabled={!quizDone}>
              Meet my agent
            </button>
          )}
          <button type="button" onClick={onDemo}>
            Skip with a sample student
          </button>
        </div>
      </div>
    </div>
  );
}
