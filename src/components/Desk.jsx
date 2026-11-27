// The desk shell: rail + chat workspace, or a full-width page.

import Rail from "./Rail.jsx";
import ChatView from "./ChatView.jsx";
import SidePane from "./SidePane.jsx";
import Pages from "./Pages.jsx";

export default function Desk({ s, api, armed }) {
  return (
    <div className="app">
      <Rail
        view={s.view}
        onView={api.view}
        theme={s.theme}
        onTheme={api.theme}
        armed={armed}
        onReset={api.reset}
        onHome={api.home}
      />

      {s.view === "chat" ? (
        <ChatView
          s={s}
          onOpen={api.open}
          onSend={api.send}
          onChip={api.chip}
          onLater={api.later}
          onPane={api.pane}
          onProve={api.prove}
          onHome={api.home}
          side={
            <SidePane
              s={s}
              onClose={api.close}
              onCheck={api.check}
              onHint={api.hint}
              onSample={api.sample}
              onCode={api.code}
              onManage={() => api.view("memory")}
              sampleArmed={api.sampleArmedFor === s.cur}
            />
          }
        />
      ) : (
        <Pages
          view={s.view}
          s={s}
          onBegin={api.begin}
          onViewWork={api.viewWork}
          onNotes={api.notes}
          onTogglePause={api.togglePause}
          onWipe={api.wipe}
          onForget={api.forget}
          onPortfolio={() => api.view("folio")}
          onLearn={() => api.view("learn")}
          onProve={api.prove}
          onAllCourses={api.allCourses}
          onAnswer={api.answer}
          onSubmit={api.submit}
          onNote={api.note}
          onLink={api.link}
          onFile={api.file}
          onDownload={api.download}
        />
      )}
    </div>
  );
}
