// 빌드 시 실행하여 lib/data/mediaAssets.generated.ts 생성
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const dbPath = path.join(__dirname, '..', 'data', 'demo.db')
const db = new Database(dbPath, { readonly: true })
const assets = db.prepare('SELECT * FROM media_assets ORDER BY id').all()

const output = `// 자동 생성된 파일 - 수정하지 마세요
export const mediaAssets = ${JSON.stringify(assets, null, 2)} as const
`

fs.writeFileSync(
  path.join(__dirname, '..', 'lib', 'data', 'mediaAssets.generated.ts'),
  output
)

console.log('✓ Media assets generated')
