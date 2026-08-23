import { BLOG_POSTS } from '../../../data/blogs'
import type { BlogPost } from '../../../data/blogs'
import { BLOG_SITE_PREFIX, blogSiteId, searchSiteId } from '../../../data/sites'
import type { Site } from '../../../data/sites'
import { Cover } from './Cover'
import './BlogSite.css'

/** 본문 사진. 없으면 `Cover`가 통째로 접는다 — 사진이 없어도 글은 온전히 읽힌다. */
function Photo({ src }: { src: string }) {
  return (
    <figure className="bg-photo">
      <Cover src={src} />
    </figure>
  )
}


/**
 * 글 하나에서 파생되는 **표시 전용 숫자**(공감·댓글·조회).
 *
 * ⚠️ `Math.random` 금지(뉴스·실검과 같은 결정성 규칙) — id 글자에서 뽑으므로 같은 글은
 * 언제 열어도 같은 숫자다. ⚠️ **게임 상태가 아니다**: 아무리 읽어도 늘지 않는다
 * (늘리려면 저장할 곳이 필요하고, 그 순간 읽는 것이 공짜가 아니게 된다).
 */
function blogCounts(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return { likes: 12 + (h % 180), comments: 1 + (h % 9), views: 400 + (h % 5000) }
}

/**
 * 블로그 — **글 한 편이 곧 사이트 하나다**(2026-08-22 설계자 지시).
 *
 * ⚠️ **네이놈 검색 결과 안의 화면이 아니다.** 주소(`blog.neinom.com/<글 id>`)도 탭 제목도
 * 이력도 이 글의 것이라, 뒤로 가기·주소창·즐겨찾기가 다른 사이트와 똑같이 동작한다.
 * 그 값을 나르는 것이 `blog:<글 id>`라는 사이트 id 하나다(`data/sites.ts`의 `blogSite`).
 *
 * 판형의 레퍼런스는 실제 블로그 본문 페이지다: 상단 간판 띠 + **왼쪽 프로필/카테고리
 * 사이드바** + 좁은 본문 + 문단 사이 사진 + 해시태그·공감 줄.
 *
 * ⚠️ **읽는 것으로는 아무 값도 움직이지 않는다** — 탐색은 무료라는 규칙이고, 글을 읽어
 * 스탯이 오르면 미디북스의 `reading` 활동이 공짜로 생긴다. `gameStore`를 아예 안 읽는다.
 *
 * ⚠️ **죽은 컨트롤을 만들지 않는다**(사이트 전역 규칙). 실제 블로그의 사이드바는 카테고리와
 * 이웃 목록인데 이 게임의 블로그는 한 집에 글이 한 편뿐이라 그대로 옮기면 전부 갈 데가 없다 →
 * **카테고리·해시태그는 누르면 네이놈 검색으로 가고**(`search:<말>`), **이웃 자리는 꼬리표가
 * 겹치는 다른 글**(누르면 그 글로 이동)이다. 공감·댓글 수만 버튼이 아닌 글자다.
 */
export function BlogSite({
  site,
  onNavigate,
}: {
  site: Site
  onNavigate: (siteId: string) => void
}) {
  const post = BLOG_POSTS.find((p) => p.id === site.id.slice(BLOG_SITE_PREFIX.length))
  /* findSite가 이미 걸러 주므로 실제로는 오지 않는다 — 타입을 좁히기 위한 한 줄이다. */
  if (!post) return null

  const counts = blogCounts(post.id)
  /* 카페 글도 같은 판형을 쓴다(실제 카페 글도 결국 제목·본문·댓글 수다) — 다른 것은
     **부르는 이름과 도메인**뿐이다. 이름만 카페처럼 짓고 주소는 블로그면 그 자리가 거짓말이 된다. */
  const isCafe = post.kind === 'cafe'
  const home = isCafe ? '카페' : '블로그'
  /* 이웃 글 = 꼬리표가 겹치는 다른 글. 목록을 따로 적지 않으므로 글을 더해도 저절로 이어진다. */
  const neighbors: BlogPost[] = BLOG_POSTS.filter(
    (p) => p.id !== post.id && p.tags.some((t) => post.tags.includes(t)),
  ).slice(0, 3)

  return (
    <div className="bg">
      {/* 블로그 상단 띠 = 이 집의 간판. 되돌아가는 길은 브라우저 [뒤로]가 진다 —
          이제 진짜 사이트라 크롬의 이력이 그대로 동작한다. */}
      <header className="bg-bar">
        <span className="bg-bar-name">{post.blog}</span>
        <span className="bg-bar-url">
          {isCafe ? 'cafe' : 'blog'}.neinom.com/{post.id}
        </span>
      </header>

      <div className="bg-grid">
        {/* 좁은 창에서는 통째로 접힌다(@container). 본문이 먼저다. */}
        <aside className="bg-side">
          <div className="bg-profile">
            {/* 프로필 사진 자리. 사진을 받아 오지 않으므로 블로그 이름 첫 글자를 쓴다 —
                가짜 인물 사진을 넣는 것보다 정직하고, 집집이 다른 글자가 나온다. */}
            <span className="bg-avatar" aria-hidden="true">
              {post.blog.slice(0, 1)}
            </span>
            <span className="bg-profile-name">{post.blog}</span>
            <span className="bg-profile-sub">글 1 · 이웃 {neighbors.length}</span>
          </div>

          <nav className="bg-cats" aria-label="카테고리">
            <p className="bg-side-head">카테고리</p>
            {post.tags.map((t) => (
              <button
                key={t}
                type="button"
                className="bg-cat"
                onClick={() => onNavigate(searchSiteId(t))}
              >
                {t}
              </button>
            ))}
          </nav>

          {neighbors.length > 0 && (
            <nav className="bg-cats" aria-label={`이웃 ${home}`}>
              <p className="bg-side-head">이웃 {home}</p>
              {neighbors.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="bg-cat"
                  onClick={() => onNavigate(blogSiteId(n.id))}
                >
                  {n.blog}
                </button>
              ))}
            </nav>
          )}
        </aside>

        <article className="bg-main">
          <h1 className="bg-title">{post.title}</h1>
          <div className="bg-byline">
            <span className="bg-avatar bg-avatar-sm" aria-hidden="true">
              {post.blog.slice(0, 1)}
            </span>
            <span className="bg-byline-name">{post.blog}</span>
            <span className="bg-byline-date">{post.date}</span>
          </div>

          {/* 본문. 사진은 **문단 사이에 눕는다** — 실제 블로그의 리듬이고, 첫 장이 히어로가
              되면 검색 결과 썸네일과 같은 그림이 두 번 연달아 나온다. */}
          <div className="bg-body">
            {post.body.map((para, i) => (
              <div key={i}>
                <p>{para}</p>
                {i === 0 && <Photo src={`/img/blog/${post.id}-1.webp`} />}
                {i === 1 && <Photo src={`/img/blog/${post.id}-2.webp`} />}
              </div>
            ))}
          </div>

          <div className="bg-tags">
            {post.tags.map((t) => (
              <button
                key={t}
                type="button"
                className="bg-tag"
                onClick={() => onNavigate(searchSiteId(t))}
              >
                #{t}
              </button>
            ))}
          </div>

          {/* 공감·댓글·조회는 **글자다**(버튼이 아니다) — 누를 수 있게 만들면 갈 데도 바뀔 것도
              없는 죽은 컨트롤이 된다. */}
          <p className="bg-counts">
            공감 {counts.likes} · 댓글 {counts.comments} · 조회{' '}
            {counts.views.toLocaleString('ko-KR')}
          </p>

          {neighbors.length > 0 && (
            <section className="bg-more" aria-label="함께 본 글">
              <h2 className="bg-more-head">이 글과 함께 본 글</h2>
              {neighbors.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="bg-more-item"
                  onClick={() => onNavigate(blogSiteId(n.id))}
                >
                  <span className="bg-more-title">{n.title}</span>
                  <span className="bg-more-meta">
                    {n.blog} · {n.date}
                  </span>
                </button>
              ))}
            </section>
          )}
        </article>
      </div>
    </div>
  )
}
