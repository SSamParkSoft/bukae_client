/**
 * 클라이언트 측에서 admin 여부 확인
 * 환경변수 NEXT_PUBLIC_ADMIN_EMAILS에 등록된 이메일과 비교
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ?.split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean) || []
  
  return adminEmails.includes(email.toLowerCase())
}
