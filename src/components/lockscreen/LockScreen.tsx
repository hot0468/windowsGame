import { useState } from 'react'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { playSound } from '../../sound'
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
  /* ⚠️ **주저앉은 판도 이어한다**(2026-08-14). 예전에는 `gameOver === null`을 함께
     봤는데, 그때는 끝난 판의 세이브가 이어할 수 없는 것이었다. 지금 회복은 며칠 뒤
     풀리는 상태이므로 여기서 막으면 플레이어가 판을 통째로 잃는다. */
  const hasSave = saved !== null
  const isNewGameMode = !hasSave || showNewGame

  const handleStart = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    playSound('boot')
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

      <AppIcon name={UI_ICONS.lockAvatar} size={72} className="lock-avatar" />

      {isNewGameMode ? (
        <>
          {/*
           * ⚠️ **이 게임의 첫 문장이다**(2026-08-24 설계자 설정). 여태 잠금화면에는
           * 설명이 한 줄도 없어서, 이름을 넣고 들어가면 활동 50개가 **버튼 50개**로
           * 읽혔다 — "왜 이러고 있는가"가 없으면 무엇을 골라도 뜻이 안 생긴다.
           *
           * ⚠️ **새 판에만 뜬다.** 이어하기 화면에서 설정을 다시 읽히면 이미 살고 있는
           * 사람에게 "1년이 주어졌다"고 통보하는 꼴이 된다 — 그쪽은 남은 날이 말한다.
           */}
          <p className="lock-lede">
            20대의 딱 1년, 자유가 주어졌다.
            <span className="lock-lede-sub">
              친구를 만들어도, 사랑을 해도, 일을 구해도, 무언가를 만들어도 좋다.
            </span>
          </p>
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
          <button
            className="lock-btn"
            onClick={() => {
              playSound('boot')
              continueGame()
            }}
          >
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
