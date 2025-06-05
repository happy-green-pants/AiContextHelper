class WorkspaceManager {
    constructor() {
      this.files = [];
      this.folderHandle = null;
      this.init();
    }
  
    async init() {
      this.bindEvents();
      await this.loadSavedWorkspace();
      this.setupMessageListener();
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('收到消息:', message);
        if (message.type === 'FOLDER_SELECTION_RESULT') {
          if (message.success) {
            this.handleFolderSelected(message.path);
          } else {
            this.showStatus('选择文件夹失败: ' + message.error, 'error');
          }
        } else if (message.type === 'FILE_SCAN_RESULT') {
          if (message.success) {
            this.handleFilesScanned(message.files);
          } else {
            this.showStatus('扫描文件失败: ' + message.error, 'error');
          }
        }
      });
    }
  
    bindEvents() {
      document.getElementById('selectFolder').addEventListener('click', () => {
        this.selectFolder();
      });
  
      document.getElementById('refreshFiles').addEventListener('click', () => {
        this.refreshFiles();
      });
    }
  
    async loadSavedWorkspace() {
      try {
        const result = await chrome.storage.local.get([
          'workspacePath', 
          'workspaceFiles', 
          'workspaceSelected',
          'filesScanned'
        ]);
        
        if (result.workspaceSelected && result.workspacePath) {
          this.showFolderInfo(result.workspacePath);
          document.getElementById('refreshFiles').style.display = 'inline-block';
        }
        
        if (result.filesScanned && result.workspaceFiles) {
          this.files = result.workspaceFiles;
          this.updateFileList();
        }
      } catch (error) {
        console.error('加载工作区失败:', error);
      }
    }
  
    async selectFolder() {
      try {
        console.log('开始选择文件夹...');
        
        // 发送消息给后台脚本
        chrome.runtime.sendMessage({
          type: 'SELECT_FOLDER'
        });
      } catch (error) {
        console.error('选择文件夹过程中发生错误:', error);
        this.showStatus('选择文件夹失败: ' + error.message, 'error');
      }
    }

    async handleFolderSelected(folderPath) {
      try {
        console.log('成功选择文件夹:', folderPath);
        
        // 更新UI
        this.showFolderInfo(folderPath);
        document.getElementById('refreshFiles').style.display = 'inline-block';

        // 扫描文件
        await this.scanFiles(folderPath);
      } catch (error) {
        console.error('处理文件夹选择失败:', error);
        this.showStatus('处理文件夹选择失败: ' + error.message, 'error');
      }
    }
  
    async scanFiles(folderPath) {
      this.showLoading(true);
      this.files = [];
      
      try {
        console.log('开始扫描目录:', folderPath);
        
        // 发送消息给后台脚本
        chrome.runtime.sendMessage({
          type: 'SCAN_FILES',
          path: folderPath
        });
      } catch (error) {
        console.error('扫描文件失败:', error);
        this.showStatus('扫描文件失败: ' + error.message, 'error');
        this.showLoading(false);
      }
    }

    handleFilesScanned(files) {
      this.files = files;
      console.log(`扫描完成，找到 ${this.files.length} 个文件`);
      
      this.updateFileList();
      this.showStatus(`成功扫描到 ${this.files.length} 个文件`, 'success');
      this.showLoading(false);
    }
  
    showFolderInfo(folderPath) {
      const folderPathElement = document.getElementById('folderPath');
      folderPathElement.textContent = `已选择: ${folderPath}`;
      folderPathElement.style.display = 'block';
    }
  
    updateFileList() {
      const fileList = document.getElementById('fileList');
      const fileCount = document.getElementById('fileCount');
      
      fileCount.textContent = this.files.length;
      
      if (this.files.length === 0) {
        fileList.innerHTML = `
          <div class="empty-state">
            <p>📂 文件夹中没有找到支持的文件</p>
            <p>支持的文件类型：.txt, .md, .js, .py, .html, .css 等</p>
          </div>
        `;
        return;
      }
  
      const sortedFiles = [...this.files].sort((a, b) => a.name.localeCompare(b.name));
      
      fileList.innerHTML = sortedFiles.map(file => `
        <div class="file-item">
          <span class="file-icon">${this.getFileIcon(file.name)}</span>
          <span class="file-name" title="${file.path}">${file.name}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </div>
      `).join('');
    }
  
    getFileIcon(fileName) {
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      const iconMap = {
        '.js': '🟨',
        '.ts': '🔷',
        '.jsx': '⚛️',
        '.tsx': '⚛️',
        '.vue': '💚',
        '.py': '🐍',
        '.java': '☕',
        '.html': '🌐',
        '.css': '🎨',
        '.md': '📝',
        '.json': '📋',
        '.xml': '📄',
        '.yml': '⚙️',
        '.yaml': '⚙️'
      };
      return iconMap[ext] || '📄';
    }
  
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  
    async refreshFiles() {
      const result = await chrome.storage.local.get(['workspacePath']);
      if (!result.workspacePath) {
        this.showStatus('请先选择工作区文件夹', 'error');
        return;
      }
  
      await this.scanFiles(result.workspacePath);
    }
  
    clearWorkspace() {
      this.files = [];
      document.getElementById('folderPath').style.display = 'none';
      document.getElementById('refreshFiles').style.display = 'none';
      this.updateFileList();
      chrome.storage.local.remove([
        'workspacePath', 
        'workspaceFiles', 
        'workspaceSelected',
        'filesScanned'
      ]);
    }
  
    showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = `status ${type}`;
      status.style.display = 'block';
      
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  
    showLoading(show) {
      document.getElementById('loading').style.display = show ? 'block' : 'none';
      document.getElementById('selectFolder').disabled = show;
      document.getElementById('refreshFiles').disabled = show;
    }
  }
  
  // 初始化工作区管理器
  document.addEventListener('DOMContentLoaded', () => {
    new WorkspaceManager();
  });