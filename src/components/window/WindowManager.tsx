import { useWindowStore } from '../../store/windowStore'
import { Window } from './Window'
import { BrowserApp } from '../apps/BrowserApp'
import { ChatListApp, ChatThreadApp } from '../apps/ChatApp'
import { MailApp } from '../apps/MailApp'
import { CommandPromptApp, SaveApp, TaskManagerApp } from '../apps/SystemApps'
import { SchedulerApp } from '../apps/SchedulerApp'
import { ExplorerApp } from '../apps/ExplorerApp'
import { ExeApp } from '../apps/ExeApp'
import { StubApp } from '../apps/StubApp'

/** 열린 창 목록을 종류에 따라 렌더링한다. */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)
  const minimize = useWindowStore((s) => s.minimize)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)

  return (
    <>
      {/* 최소화된 창은 그리지 않는다. 목록에서 지우지는 않으므로
          작업 표시줄 항목은 남고 거기서 복원할 수 있다. */}
      {windows.filter((w) => !w.minimized).map((w) => (
        <Window
          key={w.id}
          id={w.id}
          title={w.title}
          icon={w.icon}
          x={w.x}
          y={w.y}
          width={w.width}
          zIndex={w.zIndex}
          maximized={w.maximized}
          /* 게임이 말을 거는 창에만 테두리 장식을 붙인다. 브라우저처럼 "설치된 프로그램"으로
             읽혀야 하는 창은 빼야 가짜 OS 컨셉이 유지된다(Window의 ornament 주석 참조).
             새 종류를 추가할 때 여기에 명시적으로 넣어야 장식이 붙는다 — 기본은 안 붙음.
             메신저·메일·브라우저는 "설치된 프로그램"이라 장식이 붙지 않는다. */
          ornament={w.kind === 'exe' || w.kind === 'stub'}
          /* 메신저 창은 앱이 창 꼭대기까지 자기 색을 칠한다 — 레퍼런스와 같은 형태다. */
          bareTitle={w.kind === 'chat' || w.kind === 'thread' || w.kind === 'cmd'}
          /* 명령 프롬프트는 창 전체가 어두운 프로그램이다 — 캡션 버튼까지 뒤집힌다. */
          dark={w.kind === 'cmd'}
          onClose={() => close(w.id)}
          onMinimize={() => minimize(w.id)}
          onToggleMaximize={() => toggleMaximize(w.id)}
        >
          {w.kind === 'exe' && w.activityId && (
            <ExeApp activityId={w.activityId} onDone={() => close(w.id)} />
          )}
          {w.kind === 'stub' && w.message && <StubApp message={w.message} />}
          {w.kind === 'chat' && w.appId && <ChatListApp appId={w.appId} />}
          {w.kind === 'thread' && w.threadId && (
            <ChatThreadApp threadId={w.threadId} onDone={() => close(w.id)} />
          )}
          {w.kind === 'mail' && <MailApp />}
          {w.kind === 'save' && <SaveApp />}
          {w.kind === 'taskmgr' && <TaskManagerApp />}
          {w.kind === 'cmd' && <CommandPromptApp />}
          {w.kind === 'scheduler' && <SchedulerApp />}
          {w.kind === 'folder' && w.folderId && <ExplorerApp folderId={w.folderId} />}
          {/* 탭의 ✕가 창을 닫는다 — 크롬도 마지막 탭을 닫으면 창이 닫힌다. */}
          {w.kind === 'browser' && <BrowserApp onClose={() => close(w.id)} />}
        </Window>
      ))}
    </>
  )
}
