// 빌드 시 실행하여 lib/data/mediaAssets.generated.ts 생성
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES 모듈에서 __dirname 구하기
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'data', 'demo.db')
const outputPath = path.join(__dirname, '..', 'lib', 'data', 'mediaAssets.generated.ts')

// 이미 생성된 파일이 있으면 스킵 (Vercel 빌드 환경에서 better-sqlite3가 없을 때)
if (fs.existsSync(outputPath)) {
  console.log('✓ Media assets file already exists, skipping generation')
  process.exit(0)
}

async function generateMediaAssets() {
  try {
    // better-sqlite3를 동적으로 import (없으면 에러)
    const Database = (await import('better-sqlite3')).default
    
    const db = new Database(dbPath, { readonly: true })
    const assets = db.prepare(`
      SELECT id, type, title, description, file_path as filePath, script
      FROM media_assets
      ORDER BY id ASC
    `).all()
    
    db.close()

    const output = `// 자동 생성된 파일 - 수정하지 마세요
// 이 파일은 빌드 시 scripts/generate-media-assets.ts에 의해 생성됩니다

import type { MediaAsset } from '@/lib/types/media'

export const mediaAssets: MediaAsset[] = ${JSON.stringify(assets, null, 2)} as const
`

    fs.writeFileSync(outputPath, output, 'utf-8')
    console.log(`✓ Media assets generated: ${assets.length} items`)
  } catch (error: any) {
    // better-sqlite3가 없거나 DB 파일이 없으면 경고만 출력하고 계속 진행
    if (error?.message?.includes('bindings') || error?.message?.includes('Could not locate')) {
      console.warn('⚠️  better-sqlite3 not available, using existing mediaAssets.generated.ts if present')
      if (!fs.existsSync(outputPath)) {
        console.error('❌ mediaAssets.generated.ts not found and cannot generate. Please commit this file to Git.')
        process.exit(1)
      }
    } else {
      console.error('Failed to generate media assets:', error)
      process.exit(1)
    }
  }
}

generateMediaAssets()
