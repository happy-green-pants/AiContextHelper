document.addEventListener('DOMContentLoaded', () => {
  const selectButton = document.getElementById('selectFolder');
  const statusDiv = document.getElementById('status');

  selectButton.addEventListener('click', async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      // 通知后台脚本文件夹已选择
      chrome.runtime.sendMessage({
        type: 'FOLDER_SELECTED',
        path: dirHandle.name
      });
    } catch (error) {
      console.error('选择文件夹失败:', error);
      showError('选择文件夹失败: ' + error.message);
    }
  });

  function showError(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  }
}); 