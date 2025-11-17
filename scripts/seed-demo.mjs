import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dbPath = path.join(projectRoot, 'apps', 'bookae_creator', 'data', 'demo.db')

const demoAssets = [
  {
    type: 'video',
    title: '최종 하이라이트 영상',
    description: '완성본 영상 파일 (60초)',
    file_path: 'media/final-video.mp4',
    script: '인트로: "오늘은 쿠팡 베스트 상품 TOP5를 1분 만에 훑어볼게요!"',
  },
  {
    type: 'image',
    title: '장면 1 - 스마트 홈 온도계',
    description: '미니멀한 책상 위 IoT 디바이스',
    file_path: 'media/photo-1.jpg',
    script: '“앱에서 한 번 터치로 실내 온도를 정밀하게 제어할 수 있어요.”',
  },
  {
    type: 'image',
    title: '장면 2 - 프리미엄 캣타워',
    description: '고양이가 편하게 누워있는 모습',
    file_path: 'media/photo-2.jpg',
    script: '“부드러운 패브릭과 4단 구조라 집사와 냥이가 함께 쉬기 좋아요.”',
  },
  {
    type: 'image',
    title: '장면 3 - 휴대용 블렌더',
    description: '야외 피크닉에서 스무디를 만드는 장면',
    file_path: 'media/photo-3.jpg',
    script: '“선 하나 없이 완충으로 15잔까지 스무디를 만들 수 있습니다.”',
  },
  {
    type: 'image',
    title: '장면 4 - 인체공학 게이밍 의자',
    description: 'LED 조명과 허리 서포트 강조',
    file_path: 'media/photo-4.jpg',
    script: '“허리를 단단히 잡아주는 EMS 허리 패드로 오래 앉아도 편안해요.”',
  },
  {
    type: 'image',
    title: '장면 5 - 무선 살균 가습기',
    description: '아이 방에서 은은한 조명과 함께',
    file_path: 'media/photo-5.jpg',
    script: '“살균수 필터로 하루종일 촉촉하게, 취침등으로 은은한 무드를 만들어줍니다.”',
  },
]

const database = new Database(dbPath)

database
  .prepare(
    `CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      script TEXT
    );`,
  )
  .run()

database.prepare('DELETE FROM media_assets;').run()

const insert = database.prepare(
  'INSERT INTO media_assets (type, title, description, file_path, script) VALUES (@type, @title, @description, @file_path, @script);',
)

const insertMany = database.transaction((assets) => {
  for (const asset of assets) {
    insert.run(asset)
  }
})

insertMany(demoAssets)

console.log(`Seed completed: ${demoAssets.length} media assets written to ${dbPath}`)

database.close()

