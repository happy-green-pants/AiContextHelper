document.addEventListener('DOMContentLoaded', () => {
  const selectButton = document.getElementById('selectFolder');
  const progressDiv = document.querySelector('.progress');
  const progressBar = document.getElementById('progressBar');
  const statusDiv = document.getElementById('status');

  selectButton.addEventListener('click', async () => {
    try {
      // 获取回调信息
      const result = await chrome.storage.local.get(['fileScannerCallback']);
      if (!result.fileScannerCallback) {
        throw new Error('未找到扫描信息');
      }

      const { path } = result.fileScannerCallback;
      
      // 隐藏按钮，显示进度条
      selectButton.style.display = 'none';
      progressDiv.style.display = 'block';
      statusDiv.textContent = `正在扫描: ${path}`;

      // 选择文件夹
      const dirHandle = await window.showDirectoryPicker();
      const files = [];
      let processedCount = 0;
      let totalFiles = 0;

      // 首先计算总文件数
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && isTextFile(entry.name)) {
          totalFiles++;
        }
      }

      // 然后处理文件
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && isTextFile(entry.name)) {
          try {
            const file = await entry.getFile();
            const content = await file.text();
            
            files.push({
              name: entry.name,
              path: entry.name,
              size: file.size,
              content: content,
              lastModified: file.lastModified
            });

            processedCount++;
            const progress = (processedCount / totalFiles) * 100;
            progressBar.style.width = `${progress}%`;
            statusDiv.textContent = `正在扫描: ${entry.name} (${processedCount}/${totalFiles})`;
          } catch (error) {
            console.warn(`读取文件失败: ${entry.name}`, error);
          }
        }
      }

      // 通知后台脚本扫描完成
      chrome.runtime.sendMessage({
        type: 'FILES_SCANNED',
        files: files
      });
    } catch (error) {
      console.error('扫描文件失败:', error);
      statusDiv.textContent = '扫描失败: ' + error.message;
      statusDiv.className = 'status error';
      // 显示重试按钮
      selectButton.textContent = '重试';
      selectButton.style.display = 'block';
    }
  });
});

// 检查是否为文本文件
function isTextFile(fileName) {
  const textExtensions = [
    '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs',
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.json',
    '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    '.sh', '.bat', '.ps1', '.sql', '.r', '.m', '.swift', '.kt'
  ];
  
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return textExtensions.includes(ext) || !fileName.includes('.');
} 