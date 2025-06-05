// 处理文件系统操作
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SELECT_FOLDER') {
    // 创建一个新标签页来处理文件夹选择
    chrome.tabs.create({
      url: 'folder-picker.html',
      active: true
    }, (tab) => {
      // 保存回调信息
      chrome.storage.local.set({
        folderPickerCallback: {
          tabId: tab.id,
          sender: sender.tab ? sender.tab.id : null,
          popupId: sender.id // 保存popup的ID
        }
      });
    });
    return true;
  }
  
  if (request.type === 'FOLDER_SELECTED') {
    // 处理文件夹选择结果
    chrome.storage.local.get(['folderPickerCallback'], async (result) => {
      if (result.folderPickerCallback) {
        const { tabId, sender, popupId } = result.folderPickerCallback;
        
        // 保存工作区路径
        await chrome.storage.local.set({ 
          workspacePath: request.path,
          workspaceSelected: true
        });
        
        // 关闭选择器标签页
        chrome.tabs.remove(tabId);
        
        // 清除回调信息
        chrome.storage.local.remove(['folderPickerCallback']);
        
        // 通知popup
        if (popupId) {
          chrome.runtime.sendMessage({
            type: 'FOLDER_SELECTION_RESULT',
            success: true,
            path: request.path
          });
        }
        
        // 通知内容脚本
        if (sender) {
          chrome.tabs.sendMessage(sender, {
            type: 'FOLDER_SELECTION_RESULT',
            success: true,
            path: request.path
          });
        }
      }
    });
    return true;
  }
  
  if (request.type === 'SCAN_FILES') {
    // 创建一个新标签页来扫描文件
    chrome.tabs.create({
      url: 'file-scanner.html',
      active: true
    }, (tab) => {
      // 保存回调信息
      chrome.storage.local.set({
        fileScannerCallback: {
          tabId: tab.id,
          sender: sender.tab ? sender.tab.id : null,
          popupId: sender.id,
          path: request.path
        }
      });
    });
    return true;
  }
  
  if (request.type === 'FILES_SCANNED') {
    // 处理文件扫描结果
    chrome.storage.local.get(['fileScannerCallback'], async (result) => {
      if (result.fileScannerCallback) {
        const { tabId, sender, popupId } = result.fileScannerCallback;
        
        // 保存文件列表
        await chrome.storage.local.set({ 
          workspaceFiles: request.files,
          filesScanned: true
        });
        
        // 关闭扫描器标签页
        chrome.tabs.remove(tabId);
        
        // 清除回调信息
        chrome.storage.local.remove(['fileScannerCallback']);
        
        // 通知popup
        if (popupId) {
          chrome.runtime.sendMessage({
            type: 'FILE_SCAN_RESULT',
            success: true,
            files: request.files
          });
        }
        
        // 通知内容脚本
        if (sender) {
          chrome.tabs.sendMessage(sender, {
            type: 'FILE_SCAN_RESULT',
            success: true,
            files: request.files
          });
        }
      }
    });
    return true;
  }
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