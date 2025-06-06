const fs = require('fs');

// 读取 version-display.js 文件
const versionPath = './version-display.js';
const versionContent = fs.readFileSync(versionPath, 'utf8');

// 提取版本号
const versionMatch = versionContent.match(/number:\s*['"]([^'"]+)['"]/);
if (!versionMatch) {
  console.error('❌ 无法从 version-display.js 中提取版本号');
  process.exit(1);
}

const version = versionMatch[1];

// 读取 manifest.json
const manifestPath = './manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 更新版本号
manifest.version = version;

// 写回文件
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`✅ 已更新 manifest.json 版本号为 ${version}`); 