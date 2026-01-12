-- Premium 목소리 voice_id Supabase 저장 쿼리
-- e_voices 테이블에 20개 Premium 목소리 voice_id 저장

INSERT INTO e_voices (name, voice_id) VALUES
  ('Adam', 'pNInz6obpgDQGcFmaJgB'),
  ('Alice', 'Xb7hH8MSUJpSbSDYk0k2'),
  ('Bill', 'pqHfZKP75CvOlQylNhV4'),
  ('Brian', 'nPczCjzI2devNBz1zQrb'),
  ('Callum', 'N2lVS1w4EtoT3dr4eOWO'),
  ('Charlie', 'IKne3meq5aSn9XLyUdCD'),
  ('Chris', 'iP95p4xoKVk53GoZ742B'),
  ('Daniel', 'onwK4e9ZLuTAKqWW03F9'),
  ('Eric', 'cjVigY5qzO86Huf0OWal'),
  ('George', 'JBFqnCBsd6RMkjVDRZzb'),
  ('Harry', 'SOYHLrjzK2X1ezoPC6cr'),
  ('Jessica', 'cgSgspJ2msm6clMCkdW9'),
  ('Laura', 'FGY2WhTYpPnrIDTdsKH5'),
  ('Liam', 'TX3LPaxmHKxFdv7VOQHJ'),
  ('Lily', 'pFZP5JQG7iQjIQuC4Bku'),
  ('Matilda', 'XrExE9yKIg1WjnnlVkGX'),
  ('River', 'SAz9YHcvj6GT2YYXdXww'),
  ('Roger', 'CwhRBWXzGAHq8TQ4Fs17'),
  ('Sarah', 'EXAVITQu4vr4xnSDxMaL'),
  ('Will', 'bIHbv24MWmeRgasZH58o')
ON CONFLICT (name) DO UPDATE SET 
  voice_id = EXCLUDED.voice_id,
  updated_at = NOW();
