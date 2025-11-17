import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dbPath = path.join(projectRoot, 'apps', 'bookae_creator', 'data', 'demo.db')

const demoAssets = [
  {
    type: 'video',
    title: '시나리오 하이라이트 영상',
    description: 'Scenario_video.mp4 (약 1분)',
    file_path: 'media/Scenario_video.mp4',
    script: '전체 시나리오를 한 번에 보여주는 영상이에요. 아래 컷별 스크립트 흐름을 영상으로 확인해보세요.',
  },
  {
    type: 'image',
    title: '컷 1 - 거북목 공감',
    description: 'num1.png',
    file_path: 'media/num1.png',
    script: '잠깐 주목! 목이랑 어깨 아파서 고생하는 사람들 모여주세요.',
  },
  {
    type: 'image',
    title: '컷 2 - 집에서 느끼는 손 마사지',
    description: 'num2.png',
    file_path: 'media/num2.png',
    script: '마사지샵 갈 필요 없이 집에서 손 마사지를 느껴보세요!',
  },
  {
    type: 'image',
    title: '컷 3 - 원조의 묵직함',
    description: 'num3.png',
    file_path: 'media/num3.png',
    script: '글쎄 원조는 진짜 다릅니다. 안정감 있고 묵직하게, 차원이 다른 마사지!',
  },
  {
    type: 'image',
    title: '컷 4 - 97% 만족 리뷰',
    description: 'num4.png',
    file_path: 'media/num4.png',
    script: '아니 이 고객님들의 짜릿한 리뷰 좀 보세요. 97% 만족도면 말 다한 거 아닙니까?',
  },
  {
    type: 'image',
    title: '컷 5 - 성훈도 인정',
    description: 'num5.png',
    file_path: 'media/num5.png',
    script: '성훈이 형도 쓰는데 안 쓰실 거예요?',
  },
  {
    type: 'image',
    title: '컷 6 - 액션 콜',
    description: 'num6.png',
    file_path: 'media/num6.png',
    script: '23번! 프로필 링크를 참고해주세요!',
  },
]

const statements = [
  `CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    script TEXT
  );`,
  'DELETE FROM media_assets;',
  ...demoAssets.map(
    (asset) =>
      `INSERT INTO media_assets (type, title, description, file_path, script) VALUES (
        '${asset.type}',
        '${asset.title.replace(/'/g, "''")}',
        ${asset.description ? `'${asset.description.replace(/'/g, "''")}'` : 'NULL'},
        '${asset.file_path}',
        ${asset.script ? `'${asset.script.replace(/'/g, "''")}'` : 'NULL'}
      );`,
  ),
]

const result = spawnSync('sqlite3', [dbPath], {
  input: statements.join('\n'),
  encoding: 'utf-8',
})

if (result.status !== 0) {
  console.error(result.stderr)
  throw new Error('Failed to seed SQLite database.')
}

console.log(`Seed completed: ${demoAssets.length} media assets written to ${dbPath}`)

