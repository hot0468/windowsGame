import { useState } from 'react'
import { UserCircle2 } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import './LockScreen.css'

export function LockScreen() {
  const [name, setName] = useState('')
  const saved = useGameStore((s) => s.state)
  const startGame = useGameStore((s) => s.startGame)
  const reset = useGameStore((s) => s.reset)
  const continueGame = useGameStore((s) => s.continueGame)

  // 세이브가 있으면 이어하기를 먼저 제안한다.
  const [showNewGame, setShowNewGame] = useState(false)
  const hasSave = saved !== null && saved.gameOver === null
  const isNewGameMode = !hasSave || showNewGame

  const handleStart = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    startGame(trimmed)
  }

  return (
    <div className="lock">
      <div className="lock-clock">
        {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="lock-date">
        {new Date().toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </div>

      <UserCircle2 size={72} className="lock-avatar" />

      {isNewGameMode ? (
        <>
          <input
            className="lock-input"
            placeholder="이름을 입력하세요"
            value={name}
            maxLength={12}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
          <button className="lock-btn" onClick={handleStart} disabled={!name.trim()}>
            로그인
          </button>
        </>
      ) : (
        <>
          <div className="lock-name">{saved.playerName}</div>
          <button className="lock-btn" onClick={continueGame}>
            이어하기 ({saved.day}일차)
          </button>
          <button
            className="lock-sub"
            onClick={() => {
              reset()
              setShowNewGame(true)
            }}
          >
            새로 시작
          </button>
        </>
      )}
    </div>
  )
}
