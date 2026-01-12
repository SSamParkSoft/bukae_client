# Premium 목소리 voice_id 찾기 및 Supabase 저장 가이드

## 1. 환경 변수 설정

스크립트를 실행하기 전에 다음 환경 변수가 설정되어 있어야 합니다:

```bash
# .env.local 파일에 추가하거나 환경 변수로 설정
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
```

## 2. 스크립트 실행

```bash
cd apps/bukae_creator
pnpm tsx scripts/find-premium-voice-ids.ts
```

스크립트가 실행되면:
1. ElevenLabs API를 호출하여 20개 Premium 목소리의 voice_id를 찾습니다
2. 찾은 voice_id를 Supabase `e_voices` 테이블에 저장/업데이트합니다
3. 콘솔에 찾은 voice_id 목록을 출력합니다

## 3. Supabase 테이블 구조

`e_voices` 테이블은 다음 구조를 가져야 합니다:

```sql
CREATE TABLE IF NOT EXISTS e_voices (
  name TEXT PRIMARY KEY,  -- 목소리 이름 (예: "Adam", "Alice")
  voice_id TEXT NOT NULL,  -- ElevenLabs voice_id
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. 수동으로 Supabase에 저장하는 방법

스크립트를 실행할 수 없는 경우, Supabase 대시보드에서 직접 저장할 수 있습니다:

### 방법 1: Supabase 대시보드에서 직접 입력

1. Supabase 대시보드 → Table Editor → `e_voices` 테이블 열기
2. "Insert row" 클릭
3. 다음 형식으로 데이터 입력:
   - `name`: 목소리 이름 (예: "Adam")
   - `voice_id`: ElevenLabs voice_id (아래 목록 참조)
   - `updated_at`: 자동으로 설정됨

### 방법 2: SQL 쿼리로 일괄 저장

Supabase 대시보드 → SQL Editor에서 다음 쿼리 실행:

```sql
-- 20개 Premium 목소리 voice_id 저장
-- 아래 voice_id는 스크립트 실행 후 실제 값으로 교체해야 합니다

INSERT INTO e_voices (name, voice_id) VALUES
  ('Adam', '실제_voice_id_여기에_입력'),
  ('Bill', '실제_voice_id_여기에_입력'),
  ('Brian', '실제_voice_id_여기에_입력'),
  ('Callum', '실제_voice_id_여기에_입력'),
  ('Charlie', '실제_voice_id_여기에_입력'),
  ('Chris', '실제_voice_id_여기에_입력'),
  ('Daniel', '실제_voice_id_여기에_입력'),
  ('Eric', '실제_voice_id_여기에_입력'),
  ('George', '실제_voice_id_여기에_입력'),
  ('Harry', '실제_voice_id_여기에_입력'),
  ('Liam', '실제_voice_id_여기에_입력'),
  ('Roger', '실제_voice_id_여기에_입력'),
  ('Will', '실제_voice_id_여기에_입력'),
  ('Alice', '실제_voice_id_여기에_입력'),
  ('Jessica', '실제_voice_id_여기에_입력'),
  ('Laura', '실제_voice_id_여기에_입력'),
  ('Lily', '실제_voice_id_여기에_입력'),
  ('Matilda', '실제_voice_id_여기에_입력'),
  ('River', '실제_voice_id_여기에_입력'),
  ('Sarah', '실제_voice_id_여기에_입력')
ON CONFLICT (name) DO UPDATE SET 
  voice_id = EXCLUDED.voice_id,
  updated_at = NOW();
```

## 5. voice_id 확인 방법

스크립트 실행 후 콘솔에 다음과 같은 형식으로 출력됩니다:

```
[Find Voice IDs] Saved voice IDs:
  - Adam: 실제_voice_id
  - Bill: 실제_voice_id
  - Brian: 실제_voice_id
  ...
```

이 출력을 복사하여 위의 SQL 쿼리의 `실제_voice_id_여기에_입력` 부분을 교체하면 됩니다.

## 6. 저장 확인

Supabase 대시보드에서 다음 쿼리로 저장된 데이터를 확인할 수 있습니다:

```sql
SELECT * FROM e_voices ORDER BY name;
```

20개의 행이 모두 표시되어야 합니다.
