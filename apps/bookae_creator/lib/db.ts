import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

import type { MediaAsset } from '@/lib/types/media'

const resolveDemoDbPath = () => {
  const cwd = process.cwd()
  const libDir = __dirname
  
  // Vercel 환경 체크
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
  
  // 다양한 가능한 경로들 (우선순위 순)
  const candidates = [
    // 1. Vercel 런타임 경로 (최우선)
    ...(isVercel ? [
      path.join('/var/task', 'apps', 'bookae_creator', 'data', 'demo.db'),
      path.join('/var/task', '.next', 'server', 'data', 'demo.db'),
      path.join('/var/task', 'data', 'demo.db'),
    ] : []),
    
    // 2. __dirname 기준 (프로덕션에서 가장 확실한 방법)
    // .next/server/app/lib/db.js -> .next/server/data/demo.db
    path.resolve(libDir, '..', '..', 'data', 'demo.db'),
    path.resolve(libDir, '..', '..', 'apps', 'bookae_creator', 'data', 'demo.db'),
    path.resolve(libDir, '..', '..', '..', 'data', 'demo.db'),
    
    // 3. 현재 작업 디렉토리 기준
    path.join(cwd, 'data', 'demo.db'),
    path.join(cwd, 'apps', 'bookae_creator', 'data', 'demo.db'),
    path.join(cwd, '.next', 'server', 'data', 'demo.db'),
    path.join(cwd, '.next', 'server', 'apps', 'bookae_creator', 'data', 'demo.db'),
    
    // 4. 절대 경로
    path.resolve(cwd, 'data', 'demo.db'),
    path.resolve(cwd, 'apps', 'bookae_creator', 'data', 'demo.db'),
  ]

  console.log('[db] Vercel 환경:', isVercel)
  console.log('[db] process.cwd():', cwd)
  console.log('[db] __dirname:', libDir)
  console.log('[db] 후보 경로들:', candidates)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log('[db] DB 파일 발견:', candidate)
      return candidate
    }
  }

  // Vercel 환경에서 파일을 찾지 못한 경우, /tmp로 복사 시도
  if (isVercel) {
    const tmpPath = path.join('/tmp', 'demo.db')
    // 먼저 후보 경로에서 찾기
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          fs.copyFileSync(candidate, tmpPath)
          console.log('[db] DB 파일을 /tmp로 복사:', tmpPath)
          return tmpPath
        } catch (error) {
          console.warn('[db] /tmp 복사 실패:', error)
        }
      }
    }
  }

  const errorMsg = `demo.db 파일을 찾을 수 없습니다. 검색한 경로:\n${candidates.map((p, i) => `  ${i + 1}. ${p} (존재: ${fs.existsSync(p)})`).join('\n')}\n현재 작업 디렉토리: ${cwd}\n__dirname: ${libDir}`
  console.error('[db]', errorMsg)
  throw new Error(errorMsg)
}

declare global {
  // eslint-disable-next-line no-var
  var __bookaeDemoDb: Database.Database | undefined
  // eslint-disable-next-line no-var
  var __bookaeDemoDbPath: string | undefined
}

const getDatabase = (): Database.Database => {
  if (global.__bookaeDemoDb) {
    return global.__bookaeDemoDb
  }

  try {
    const dbPath = resolveDemoDbPath()
    const database = new Database(dbPath, { readonly: true })
    
    // 프로덕션 환경에서도 캐싱 허용 (서버리스 환경에서 재사용)
    global.__bookaeDemoDb = database
    global.__bookaeDemoDbPath = dbPath
    
    return database
  } catch (error) {
    console.error('[db] DB 초기화 실패:', error)
    throw error
  }
}

export const getMediaAssets = (): MediaAsset[] => {
  try {
    const database = getDatabase()
    const statement = database.prepare(`
      SELECT id, type, title, description, file_path as filePath, script
      FROM media_assets
      ORDER BY id ASC
    `)

    return statement.all() as MediaAsset[]
  } catch (error) {
    console.error('[db] getMediaAssets 실패:', error)
    // 배포 환경에서 DB 파일이 없을 경우 빈 배열 반환
    // 앱이 계속 작동할 수 있도록 함
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      console.warn('[db] 프로덕션 환경에서 DB 접근 실패, 빈 배열 반환')
      return []
    }
    throw error
  }
}

