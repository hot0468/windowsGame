import { describe, it, expect } from 'vitest'
import { WORK_ACTIVITIES, findActivity } from './activities'
import { JOBS, findJob, jobsOf } from './jobs'

describe('알바몬 채용 공고', () => {
  it('모든 공고의 activityId는 실제 활동을 가리킨다 (죽은 버튼 방지)', () => {
    // ⚠️ 오타 하나가 "눌러도 아무 일이 없는 공고"가 된다.
    for (const job of JOBS) {
      expect(findActivity(job.activityId), `${job.id} → ${job.activityId}`).toBeDefined()
    }
  })

  it('공고 id가 중복되지 않는다', () => {
    const ids = JOBS.map((j) => j.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('알바 활동 4종이 전부 공고에 등장한다 (도달 불가 일자리 방지)', () => {
    // 빠진 활동이 있으면 그 알바는 브라우저에서 영영 실행할 수 없다.
    for (const activity of WORK_ACTIVITIES) {
      expect(jobsOf(activity.id).length, activity.id).toBeGreaterThan(0)
    }
  })

  it('공고는 알바 활동만 가리킨다 (독서·영화가 구인 목록에 섞이지 않는다)', () => {
    const workIds = new Set(WORK_ACTIVITIES.map((a) => a.id))
    for (const job of JOBS) expect(workIds.has(job.activityId), job.id).toBe(true)
  })

  it('표시에 필요한 글자가 비어 있지 않다 (빈 카드 방지)', () => {
    for (const job of JOBS) {
      expect(job.company.length).toBeGreaterThan(0)
      expect(job.title.length).toBeGreaterThan(0)
      expect(job.area.length).toBeGreaterThan(0)
      expect(job.schedule.length).toBeGreaterThan(0)
      expect(job.tags.length).toBeGreaterThan(0)
    }
  })

  it('없는 공고를 물으면 undefined다', () => {
    expect(findJob('없는-공고')).toBeUndefined()
  })
})
