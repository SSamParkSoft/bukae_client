import { handleStorageBucketCleanup } from '@/app/api/_utils/storageBucketCleanup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLEANUP_SECRET = process.env.ADMIN_IMAGES_CLEANUP_SECRET
const BUCKET = 'images'
const ROOT_PREFIX = 'images'
const RETENTION_HOURS = 1

export async function POST(request: Request) {
  return handleStorageBucketCleanup({
    request,
    bucket: BUCKET,
    rootPrefix: ROOT_PREFIX,
    retentionHours: RETENTION_HOURS,
    cleanupSecret: CLEANUP_SECRET,
    cleanupSecretEnvKey: 'ADMIN_IMAGES_CLEANUP_SECRET',
    logPrefix: 'images cleanup',
  })
}
