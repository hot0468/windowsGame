import { useState } from 'react'
import { CAT_DEFAULT_NAME, CAT_FEEDS_TO_ADOPT, CAT_FEED_PRICE } from '../../data/cat'
import { catCanAdopt, catEncounterDue, catFeedBlocker } from '../../systems/cat'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import './CatApp.css'

/**
 * 길고양이 만남 창 — **별똥별 소원 창(`WishApp`)과 같은 판형이다.**
 *
 * ## 왜 활동 창이 아닌가
 * 창밖에 고양이가 온 것은 플레이어가 고른 행동이 아니라 **일어난 일**이다. 턴을 먹으면
 * 만남이 곧 벌금이 된다 — 그래서 고르는 창이고 턴을 쓰지 않는다(소원과 같은 판단).
 *
 * ## ⚠️ 닫기만 하면 아무것도 세지 않는다
 * 결정(사료·모른 척·입양)만 기록을 찍는다(`decidedDay`). 안 고르고 닫으면 그날 안에는
 * 다시 뜨고, 날이 지나면 그 방문은 그냥 지나간 것이다 — 모른 척으로 세지 않는다.
 *
 * ## ⚠️ 창은 읽고 부르기만 한다
 * 판정·금액·기록은 전부 `systems/cat.ts`이고 스토어 액션이 그것을 부른다.
 */
export function CatApp({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const feedCat = useGameStore((s) => s.feedCat)
  const ignoreCat = useGameStore((s) => s.ignoreCat)
  const adoptCat = useGameStore((s) => s.adoptCat)
  const [name, setName] = useState('')

  if (!state) return null
  /* 결정한 뒤에도 창이 남아 있을 수 있다(창은 상태를 모른다) — 그때는 배웅 문장만 남긴다. */
  const due = catEncounterDue(state)
  const fed = state.cat?.fed ?? 0
  const feedBlock = catFeedBlocker(state)
  const canAdopt = due && catCanAdopt(state)

  /* 정이 든 만큼 문장이 달라진다 — 숫자 대신 거리가 줄어드는 것이 보이게. */
  const lead =
    fed === 0
      ? '창밖 난간에 검은 고양이 한 마리가 앉아 있다. 이쪽을 보고 있다.'
      : fed < CAT_FEEDS_TO_ADOPT
        ? '그 고양이가 또 왔다. 이번에는 창 바로 앞까지 와서 앉는다.'
        : '고양이가 창틀에 올라와 있다. 문을 열면 들어올 기세다.'

  return (
    <div className="cat">
      <p className="cat-lead">
        <AppIcon name="fluent-color:paw-24" size={22} />
        {due ? lead : '고양이는 골목 쪽으로 사라졌다. 밤은 다시 조용하다.'}
      </p>
      {due && (
        <>
          <p className="cat-sub">
            {fed > 0 && <>지금까지 사료를 {fed}번 줬다. </>}
            {canAdopt
              ? '이제 집에 들일 수도 있다. 들이면 매일 사료값이 든다.'
              : '사료를 줄 수도 있고, 모른 척할 수도 있다.'}
          </p>

          {canAdopt && (
            <label className="cat-name">
              이름
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={CAT_DEFAULT_NAME}
                maxLength={12}
              />
            </label>
          )}

          <div className="cat-actions">
            {canAdopt && (
              <button
                type="button"
                className="cat-btn cat-btn-primary"
                onClick={() => {
                  adoptCat(name)
                  onClose()
                }}
              >
                집에 들인다
              </button>
            )}
            <button
              type="button"
              className={`cat-btn${canAdopt ? '' : ' cat-btn-primary'}`}
              disabled={!!feedBlock}
              onClick={() => {
                feedCat()
                onClose()
              }}
            >
              사료를 준다 −{CAT_FEED_PRICE.toLocaleString('ko-KR')}원
            </button>
            <button
              type="button"
              className="cat-btn"
              onClick={() => {
                ignoreCat()
                onClose()
              }}
            >
              모른 척한다
            </button>
          </div>
          {/* 못 누르는 사유는 글자로(죽은 컨트롤 금지 — 흐려진 버튼만으로는 이유를 모른다). */}
          {feedBlock && (
            <p className="cat-block" role="status">
              {feedBlock}
            </p>
          )}
        </>
      )}
    </div>
  )
}
