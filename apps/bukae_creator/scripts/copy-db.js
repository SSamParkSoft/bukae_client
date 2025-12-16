/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'data', 'demo.db');
const projectRoot = path.join(__dirname, '..');

// 복사할 대상 경로들 (여러 가능성 고려)
const destPaths = [
  // standalone 모드 (Vercel 등 서버리스 환경)
  path.join(projectRoot, '.next', 'standalone', 'apps', 'bookae_creator', 'data', 'demo.db'),
  // 일반 서버 모드
  path.join(projectRoot, '.next', 'server', 'apps', 'bookae_creator', 'data', 'demo.db'),
  // 프로덕션 실행 시 작업 디렉토리가 앱 루트인 경우
  path.join(projectRoot, 'data', 'demo.db'),
  // 프로덕션 실행 시 작업 디렉토리가 모노레포 루트인 경우
  path.join(projectRoot, '..', '..', 'apps', 'bookae_creator', 'data', 'demo.db'),
  // .next/server 루트에 직접 복사 (fallback)
  path.join(projectRoot, '.next', 'server', 'data', 'demo.db'),
];

if (!fs.existsSync(src)) {
  process.exit(0);
}

let copiedCount = 0;

// 각 대상 경로에 대해 복사 시도
destPaths.forEach((destPath) => {
  const destDir = path.dirname(destPath);
  
  // 부모 디렉토리가 존재하는 경우에만 복사
  // (.next 폴더가 존재한다는 것은 빌드가 완료되었다는 의미)
  if (fs.existsSync(path.dirname(destDir))) {
    try {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, destPath);
      copiedCount++;
    } catch (error) {
    }
  }
});

if (copiedCount === 0) {
}

