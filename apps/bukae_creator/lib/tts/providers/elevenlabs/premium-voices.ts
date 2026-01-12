/**
 * Premium 목소리 하드코딩 데이터
 * voice_id는 Supabase의 e_voices 테이블에서 조회
 */
export interface PremiumVoiceData {
  name: string      // 목소리 이름 (예: "Adam", "Alice") - Supabase PK로 사용
  displayName: string  // UI 표시용 이름
  gender: 'MALE' | 'FEMALE'
}

export const PREMIUM_VOICES: PremiumVoiceData[] = [
  // 남성 (13개)
  { name: 'Adam', displayName: 'Adam', gender: 'MALE' },
  { name: 'Bill', displayName: 'Bill', gender: 'MALE' },
  { name: 'Brian', displayName: 'Brian', gender: 'MALE' },
  { name: 'Callum', displayName: 'Callum', gender: 'MALE' },
  { name: 'Charlie', displayName: 'Charlie', gender: 'MALE' },
  { name: 'Chris', displayName: 'Chris', gender: 'MALE' },
  { name: 'Daniel', displayName: 'Daniel', gender: 'MALE' },
  { name: 'Eric', displayName: 'Eric', gender: 'MALE' },
  { name: 'George', displayName: 'George', gender: 'MALE' },
  { name: 'Harry', displayName: 'Harry', gender: 'MALE' },
  { name: 'Liam', displayName: 'Liam', gender: 'MALE' },
  { name: 'Roger', displayName: 'Roger', gender: 'MALE' },
  { name: 'Will', displayName: 'Will', gender: 'MALE' },
  // 여성 (7개)
  { name: 'Alice', displayName: 'Alice', gender: 'FEMALE' },
  { name: 'Jessica', displayName: 'Jessica', gender: 'FEMALE' },
  { name: 'Laura', displayName: 'Laura', gender: 'FEMALE' },
  { name: 'Lily', displayName: 'Lily', gender: 'FEMALE' },
  { name: 'Matilda', displayName: 'Matilda', gender: 'FEMALE' },
  { name: 'River', displayName: 'River', gender: 'FEMALE' },
  { name: 'Sarah', displayName: 'Sarah', gender: 'FEMALE' },
]
