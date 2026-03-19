/**
 * Supabase Storage → public/ 마이그레이션 스크립트
 * 실행: node scripts/migrate-storage-to-public.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SUPABASE_URL = 'https://qqvomqwzzmsfzbayukbx.supabase.co'

const BUCKETS = [
  {
    name: 'fonts',
    localDir: 'apps/bukae_creator/public/fonts',
    files: [
      'black_han_sans/BlackHanSans-Regular.ttf',
      'black_han_sans/OFL.txt',
      'do_hyeon/DoHyeon-Regular.ttf',
      'do_hyeon/OFL.txt',
      'gmarket_sans/GmarketSansTTFBold.ttf',
      'gmarket_sans/GmarketSansTTFLight.ttf',
      'gmarket_sans/GmarketSansTTFMedium.ttf',
      'gmarket_sans/OFL.txt',
      'gowun_batang/GowunBatang-Bold.ttf',
      'gowun_batang/GowunBatang-Regular.ttf',
      'gowun_batang/OFL.txt',
      'gowun_dodum/GowunDodum-Regular.ttf',
      'gowun_dodum/OFL.txt',
      'jua/Jua-Regular.ttf',
      'jua/OFL.txt',
      'nanum_gothic/NanumGothic-Bold.ttf',
      'nanum_gothic/NanumGothic-Regular.ttf',
      'nanum_gothic/OFL.txt',
      'nanum_myeongjo/NanumMyeongjo-Bold.ttf',
      'nanum_myeongjo/NanumMyeongjo-Regular.ttf',
      'nanum_myeongjo/OFL.txt',
      'noto_sans_kr/NotoSansKR.ttf',
      'noto_sans_kr/OFL.txt',
      'noto_serif_kr/NotoSerifKR.ttf',
      'noto_serif_kr/OFL.txt',
      'pretendard/LICENSE',
      'pretendard/PretendardVariable.woff2',
    ],
  },
  {
    name: 'bgms',
    localDir: 'apps/bukae_creator/public/bgms',
    files: [
      'bgm1/bgm1.mp3', 'bgm1/LICENSE',
      'bgm2/bgm2.mp3',
      'bgm3/bgm3.mp3', 'bgm3/LICENSE',
      'bgm4/bgm4.mp3', 'bgm4/LICENSE',
      'bgm5/bgm5.mp3',
      'bgm6/bgm6.mp3', 'bgm6/LICENSE',
      'bgm7/bgm7.mp3', 'bgm7/LICENSE',
      'bgm8/bgm8.mp3', 'bgm8/LICENSE',
      'bgm9/bgm9.mp3', 'bgm9/LICENSE',
      'bgm10/bgm10.mp3', 'bgm10/LICENSE',
      'bgm11/bgm11.mp3', 'bgm11/LICENSE',
    ],
  },
  {
    name: 'soundeffect',
    localDir: 'apps/bukae_creator/public/soundeffects',
    files: [
      'alarm/cungmyeong.mp3', 'alarm/ddiring1.mp3', 'alarm/kakao.wav',
      'alarm/mail.mp3', 'alarm/send.mp3', 'alarm/silrophone.mp3', 'alarm/text1.mp3',
      'animal/cricket.mp3', 'animal/crow.mp3', 'animal/duck.mp3',
      'animal/goat1.mp3', 'animal/goat2.mp3', 'animal/owl.mp3',
      'basic/bbiyu.mp3', 'basic/bbok.wav', 'basic/bboks.wav', 'basic/bounce.mp3',
      'basic/ddadak.mp3', 'basic/ddidong.mp3', 'basic/ddidongx2.wav',
      'basic/ddiririroring.mp3', 'basic/ddoit.wav', 'basic/ddongding.mp3',
      'beep/bbi.mp3', 'beep/wrong1.mp3', 'beep/wrong2.mp3',
      'blow/chack.mp3', 'blow/pak.mp3', 'blow/puck.mp3', 'blow/tak.mp3',
      'embarrassment/ddiyong.mp3', 'embarrassment/ddoing.mp3', 'embarrassment/ddugk.wav',
      'embarrassment/dduhuck.mp3', 'embarrassment/dingding.wav', 'embarrassment/discover.mp3',
      'embarrassment/eng.mp3', 'embarrassment/herl.wav', 'embarrassment/tung.mp3', 'embarrassment/water.mp3',
      'emotion/ddeoring.mp3', 'emotion/exddodok.wav', 'emotion/exddung.mp3',
      'emotion/question.mp3', 'emotion/realize.mp3', 'emotion/sweat.mp3',
      'etc/appear1.mp3', 'etc/appear2.mp3', 'etc/background.mp3', 'etc/bite.mp3',
      'etc/clock.mp3', 'etc/correct.mp3', 'etc/ctpop.mp3', 'etc/ddiring.mp3',
      'etc/finger.mp3', 'etc/fryingpan.mp3', 'etc/glitch.wav', 'etc/grow.mp3',
      'etc/heart.mp3', 'etc/over.mp3', 'etc/paint.mp3', 'etc/paper.mp3',
      'etc/piyungfar.wav', 'etc/piyunglong.wav', 'etc/plate.mp3', 'etc/remind.wav',
      'etc/rubberbbeak.mp3', 'etc/rubbertoy.mp3', 'etc/scratch.mp3', 'etc/tada.mp3',
      'etc/wheak.mp3', 'etc/whiplash.wav', 'etc/zzazan.mp3',
      'explosion/e1.wav', 'explosion/lightning.wav', 'explosion/loudExplosion.mp3', 'explosion/mukgik.mp3',
      'fart/bbung1.mp3', 'fart/bbung2.mp3', 'fart/bbung3.mp3',
      'frustration/high.mp3', 'frustration/low.mp3', 'frustration/mono.mp3',
      'game/bbam.wav', 'game/ddiring.mp3', 'game/levelup.wav', 'game/pop.mp3',
      'horn/bbangbbare.mp3', 'horn/bbubbubbu.mp3', 'horn/carbbang.mp3', 'horn/loudsiren.mp3', 'horn/roundstart.mp3',
      'laugh/baby.mp3', 'laugh/cartoon.mp3', 'laugh/cloudlaugh.mp3', 'laugh/haha.mp3',
      'laugh/laugh1.wav', 'laugh/man1.mp3', 'laugh/man2.mp3', 'laugh/wicked.mp3',
      'mech/break.mp3', 'mech/cameralong.mp3', 'mech/camerashort.mp3', 'mech/click1.mp3',
      'mech/click2.mp3', 'mech/gear1.mp3', 'mech/gear2.wav', 'mech/keyboard.mp3',
      'money/casher.mp3', 'money/coin1.mp3', 'money/coin2.mp3',
      'negative/nope.mp3', 'negative/what.mp3',
      'percussion/drum.mp3', 'percussion/dung.wav', 'percussion/tiding.mp3',
      'percussion/ting.mp3', 'percussion/tung.mp3', 'percussion/twice.mp3',
      'positive/cloud.wav', 'positive/cloudwa.mp3', 'positive/wow.mp3', 'positive/yeah.mp3',
      'run/annoying.mp3', 'run/ctheavy.mp3', 'run/ctlight.mp3', 'run/fast.mp3',
      'run/ing.mp3', 'run/sseng.WAV',
      'shit/kaesound.mp3', 'shit/shutup.mp3', 'shit/whatthef.mp3',
      'speed/back1.mp3', 'speed/front1.mp3', 'speed/front2.mp3',
      'spring/ddiyong.mp3', 'spring/ddoing.mp3', 'spring/ddoing2.mp3', 'spring/ddotong.mp3',
      'suspense/dduddung.wav', 'suspense/ending.mp3', 'suspense/heak.mp3', 'suspense/long.mp3',
      'suspense/Suspense1.wav', 'suspense/Suspense2.wav', 'suspense/Suspense3.wav', 'suspense/Suspense4.wav',
      'suspense/Suspense6.wav', 'suspense/Suspense7.wav', 'suspense/Suspense8.wav',
      'talk/bimyeong.mp3', 'talk/bye.mp3', 'talk/dduckbaeki.mp3', 'talk/hello.mp3', 'talk/koza.mp3',
      'wand/bbyororong1.mp3', 'wand/bbyororong2.wav', 'wand/ddoriring.mp3', 'wand/magic1.mp3', 'wand/wand.mp3',
      'water/bbap.mp3', 'water/bboing.mp3', 'water/bbwok.mp3', 'water/tok.mp3',
      'wind/bigwind.mp3', 'wind/cartoonhook.mp3', 'wind/hwick.mp3', 'wind/longhook.wav',
      'wind/notification.mp3', 'wind/riserSwoosh.mp3', 'wind/shorthook.mp3', 'wind/stronghook.wav',
      'wind/weakhook.wav', 'wind/whoosh.mp3', 'wind/wind.mp3', 'wind/wind2.mp3', 'wind/wind3.mp3',
    ],
  },
]

async function downloadFile(bucket, filePath, destDir) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, status: res.status }

  const localPath = path.join(ROOT, destDir, filePath)
  fs.mkdirSync(path.dirname(localPath), { recursive: true })
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(localPath, buffer)
  return { ok: true, bytes: buffer.length }
}

async function main() {
  console.log('🚀 Supabase Storage → public/ 마이그레이션 시작\n')

  for (const { name, files, localDir } of BUCKETS) {
    console.log(`📁 버킷: ${name} (${files.length}개)`)
    let totalBytes = 0
    let failed = 0

    for (const filePath of files) {
      const result = await downloadFile(name, filePath, localDir)
      if (result.ok) {
        totalBytes += result.bytes
        console.log(`  ✅ ${filePath} (${(result.bytes / 1024).toFixed(0)}KB)`)
      } else {
        failed++
        console.warn(`  ⚠️  ${filePath} → HTTP ${result.status}`)
      }
    }

    console.log(`  → 완료: ${(totalBytes / 1024 / 1024).toFixed(1)}MB, 실패: ${failed}개\n`)
  }

  console.log('✨ 다운로드 완료!')
}

main().catch(console.error)
