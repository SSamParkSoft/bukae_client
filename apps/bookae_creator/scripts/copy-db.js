const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'data', 'demo.db');
const standaloneDest = path.join(__dirname, '..', '.next', 'standalone', 'apps', 'bookae_creator', 'data', 'demo.db');
const serverDest = path.join(__dirname, '..', '.next', 'server', 'apps', 'bookae_creator', 'data', 'demo.db');

if (!fs.existsSync(src)) {
  console.warn('⚠️  demo.db 파일을 찾을 수 없습니다:', src);
  process.exit(0);
}

// standalone 모드 (Vercel 등 서버리스 환경)
if (fs.existsSync(path.dirname(standaloneDest))) {
  const destDir = path.dirname(standaloneDest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, standaloneDest);
  console.log('✓ demo.db copied to standalone output:', standaloneDest);
}

// 일반 서버 모드
if (fs.existsSync(path.dirname(serverDest))) {
  const destDir = path.dirname(serverDest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, serverDest);
  console.log('✓ demo.db copied to server output:', serverDest);
}

console.log('✓ DB 파일 복사 완료');

