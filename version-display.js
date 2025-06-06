// 版本信息
const VERSION = {
  number: '0.0.2',
  date: '2025-06-06',
  name: 'AI Context Helper'
};

// 显示版本号
document.addEventListener('DOMContentLoaded', () => {
  const versionElement = document.getElementById('version');
  if (versionElement) {
    versionElement.textContent = `v${VERSION.number}`;
  }
}); 