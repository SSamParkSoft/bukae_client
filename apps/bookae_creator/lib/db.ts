import path from 'path'
import Database from 'better-sqlite3'

import type { MediaAsset } from '@/lib/types/media'

const dbPath = path.join(process.cwd(), 'data', 'demo.db')

declare global {
  // eslint-disable-next-line no-var
  var __bookaeDemoDb: Database.Database | undefined
}

const database = global.__bookaeDemoDb ?? new Database(dbPath, { readonly: true })

if (process.env.NODE_ENV !== 'production') {
  global.__bookaeDemoDb = database
}

export const getMediaAssets = (): MediaAsset[] => {
  const statement = database.prepare(`
    SELECT id, type, title, description, file_path as filePath, script
    FROM media_assets
    ORDER BY id ASC
  `)

  return statement.all() as MediaAsset[]
}

