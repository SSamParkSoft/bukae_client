import { describe, expect, it } from 'vitest'
import { buildFeedbackUrl } from './feedbackUrl'

describe('buildFeedbackUrl', () => {
  it('returns null when form url is not configured', () => {
    expect(buildFeedbackUrl({}, { pathname: '/analysis' })).toBeNull()
  })

  it('adds generic feedback context query params', () => {
    const url = buildFeedbackUrl(
      { formUrl: 'https://docs.google.com/forms/d/e/form-id/viewform' },
      {
        pathname: '/analysis',
        search: '?projectId=project-1',
        projectId: 'project-1',
        userName: 'Bukae User',
      }
    )

    expect(url).not.toBeNull()
    const parsed = new URL(url as string)

    expect(parsed.searchParams.get('currentPage')).toBe('/analysis?projectId=project-1')
    expect(parsed.searchParams.get('projectId')).toBe('project-1')
    expect(parsed.searchParams.get('userName')).toBe('Bukae User')
  })

  it('adds Google Form prefill entry params when entry ids are configured', () => {
    const url = buildFeedbackUrl(
      {
        formUrl: 'https://docs.google.com/forms/d/e/form-id/viewform?usp=pp_url',
        currentPageEntryId: '111',
        projectIdEntryId: 'entry.222',
        userEmailEntryId: '333',
      },
      {
        pathname: '/planning-setup',
        search: 'projectId=project-2',
        projectId: 'project-2',
        userEmail: 'user@example.com',
      }
    )

    expect(url).not.toBeNull()
    const parsed = new URL(url as string)

    expect(parsed.searchParams.get('usp')).toBe('pp_url')
    expect(parsed.searchParams.get('entry.111')).toBe('/planning-setup?projectId=project-2')
    expect(parsed.searchParams.get('entry.222')).toBe('project-2')
    expect(parsed.searchParams.get('entry.333')).toBe('user@example.com')
  })
})
