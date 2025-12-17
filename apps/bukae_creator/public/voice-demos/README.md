## voice-demos

이 폴더는 **목소리 미리듣기(데모)** 용 정적 오디오 파일을 담습니다.

### 파일 규칙
- 아래 둘 중 하나로 두면 됩니다.
  - **(권장) voiceName과 동일**한 파일명
  - 다운로드되는 형태 그대로의 **슬러그 파일명** (예: `chirp3-hd-achernar.wav`)
- 확장자는 `.mp3` 또는 `.wav` 를 지원합니다.

예)
- `ko-KR-Chirp3-HD-Achernar.mp3`
- `ko-KR-Chirp3-HD-Achernar.wav`
- `chirp3-hd-achernar.wav`

### 동작 방식
UI에서 미리듣기 아이콘을 클릭하면 다음 경로를 재생합니다.
- 1) `/voice-demos/${encodeURIComponent(voiceName)}.(mp3|wav)`
- 2) `/voice-demos/${encodeURIComponent(slug(voiceName))}.(mp3|wav)`  (예: `chirp3-hd-achernar.wav`)

해당 파일이 없으면 **“준비되지 않았어요”** 안내가 표시됩니다.


