// 文件选择器管理器
class FileContextManager {
    constructor() {
      this.files = [];
      this.selectedIndex = -1;
      this.activeInput = null;
      this.dropdown = null;
      this.currentQuery = '';
      this.triggerChar = '';
      this.triggerPosition = -1;
      
      this.init();
    }
  
    async init() {
      console.log('初始化文件上下文管理器...');
      
      // 加载已保存的文件列表
      console.log('加载已保存的文件列表...');
      await this.loadFiles();
      console.log(`加载完成，当前有 ${this.files.length} 个文件`);
      
      // 监听输入框
      console.log('开始监听输入框...');
      this.attachInputListeners();
      
      // 创建下拉菜单元素
      console.log('创建下拉菜单元素...');
      this.createDropdown();
      
      // 监听键盘事件
      console.log('添加键盘事件监听器...');
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      
      // 监听点击外部关闭下拉菜单
      console.log('添加点击事件监听器...');
      document.addEventListener('click', this.handleClickOutside.bind(this));
      
      console.log('初始化完成');
    }
  
    async loadFiles() {
      try {
        console.log('从存储中获取文件列表...');
        const result = await chrome.storage.local.get(['workspaceFiles']);
        this.files = result.workspaceFiles || [];
        console.log(`成功加载 ${this.files.length} 个文件`);
      } catch (error) {
        console.error('加载文件列表失败:', error);
      }
    }
  
    attachInputListeners() {
      // 查找页面中的输入框和文本域
      const inputs = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
      
      inputs.forEach(input => {
        input.addEventListener('input', this.handleInput.bind(this));
        input.addEventListener('keydown', this.handleInputKeyDown.bind(this));
        input.addEventListener('keyup', this.handleInputKeyUp.bind(this));
      });
  
      // 监听动态添加的输入框
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const newInputs = node.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
              newInputs.forEach(input => {
                input.addEventListener('input', this.handleInput.bind(this));
                input.addEventListener('keydown', this.handleInputKeyDown.bind(this));
                input.addEventListener('keyup', this.handleInputKeyUp.bind(this));
              });
            }
          });
        });
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  
    handleInput(event) {
      const input = event.target;
      const value = this.getInputValue(input);
      const cursorPos = this.getCursorPosition(input);
      
      // 检查是否输入了@或#
      const beforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = beforeCursor.lastIndexOf('@');
      const lastHashIndex = beforeCursor.lastIndexOf('#');
      
      let triggerIndex = -1;
      let triggerChar = '';
      
      if (lastAtIndex > lastHashIndex && lastAtIndex !== -1) {
        triggerIndex = lastAtIndex;
        triggerChar = '@';
      } else if (lastHashIndex > lastAtIndex && lastHashIndex !== -1) {
        triggerIndex = lastHashIndex;
        triggerChar = '#';
      }
      
      if (triggerIndex !== -1) {
        // 检查触发字符后是否有空格
        const afterTrigger = beforeCursor.substring(triggerIndex + 1);
        if (!afterTrigger.includes(' ') && !afterTrigger.includes('\n')) {
          this.triggerChar = triggerChar;
          this.triggerPosition = triggerIndex;
          this.currentQuery = afterTrigger;
          this.activeInput = input;
          this.showDropdown(input, triggerIndex);
          return;
        }
      }
      
      this.hideDropdown();
    }
  
    handleInputKeyDown(event) {
      if (this.dropdown && this.dropdown.style.display === 'block') {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.navigateDropdown(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.navigateDropdown(-1);
        } else if (event.key === 'Tab') {
          event.preventDefault();
          this.selectFile();
        } else if (event.key === 'Escape') {
          this.hideDropdown();
        }
      }
    }
  
    handleInputKeyUp(event) {
      // 处理发送消息的情况
      if (event.key === 'Enter' && !event.shiftKey) {
        setTimeout(() => {
          this.processMessageBeforeSend(event.target);
        }, 100);
      }
    }
  
    handleKeyDown(event) {
      // 全局键盘事件处理
      if (event.key === 'Escape' && this.dropdown && this.dropdown.style.display === 'block') {
        this.hideDropdown();
      }
    }
  
    handleClickOutside(event) {
      if (this.dropdown && !this.dropdown.contains(event.target) && event.target !== this.activeInput) {
        this.hideDropdown();
      }
    }
  
    getInputValue(input) {
      return input.contentEditable === 'true' ? input.textContent : input.value;
    }
  
    setInputValue(input, value) {
      if (input.contentEditable === 'true') {
        input.textContent = value;
      } else {
        input.value = value;
      }
    }
  
    getCursorPosition(input) {
      if (input.contentEditable === 'true') {
        const selection = window.getSelection();
        return selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
      } else {
        return input.selectionStart;
      }
    }
  
    setCursorPosition(input, pos) {
      if (input.contentEditable === 'true') {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(input.firstChild || input, pos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        input.setSelectionRange(pos, pos);
      }
    }
  
    createDropdown() {
      this.dropdown = document.createElement('div');
      this.dropdown.className = 'file-context-dropdown';
      this.dropdown.style.display = 'none';
      document.body.appendChild(this.dropdown);
    }
  
    showDropdown(input, triggerIndex) {
      if (!this.files.length) {
        this.showNoFilesMessage();
        return;
      }
  
      const filteredFiles = this.filterFiles(this.currentQuery);
      
      if (filteredFiles.length === 0) {
        this.hideDropdown();
        return;
      }
  
      this.dropdown.innerHTML = '';
      this.selectedIndex = 0;
  
      filteredFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        if (index === 0) item.classList.add('selected');
        
        const icon = this.triggerChar === '@' ? '📄' : '🔗';
        item.innerHTML = `
          <span class="file-icon">${icon}</span>
          <span class="file-name">${file.name}</span>
          <span class="file-path">${file.path}</span>
        `;
        
        item.addEventListener('click', () => {
          this.selectedIndex = index;
          this.selectFile();
        });
        
        this.dropdown.appendChild(item);
      });
  
      this.positionDropdown(input);
      this.dropdown.style.display = 'block';
    }
  
    filterFiles(query) {
      if (!query) return this.files;
      
      const lowerQuery = query.toLowerCase();
      return this.files
        .filter(file => file.name.toLowerCase().includes(lowerQuery))
        .sort((a, b) => {
          const aIndex = a.name.toLowerCase().indexOf(lowerQuery);
          const bIndex = b.name.toLowerCase().indexOf(lowerQuery);
          // 主要排序规则：按查询词在文件名中出现的位置排序
          if (aIndex !== bIndex) {
            return aIndex - bIndex;
          }
          // 次要排序规则：如果位置相同，按文件名字母顺序排序
          return a.name.localeCompare(b.name);
        });
    }
  
    navigateDropdown(direction) {
      const items = this.dropdown.querySelectorAll('.dropdown-item');
      if (items.length === 0) return;
  
      items[this.selectedIndex]?.classList.remove('selected');
      this.selectedIndex += direction;
      
      if (this.selectedIndex < 0) this.selectedIndex = items.length - 1;
      if (this.selectedIndex >= items.length) this.selectedIndex = 0;
      
      items[this.selectedIndex]?.classList.add('selected');
      items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  
    selectFile() {
      const items = this.dropdown.querySelectorAll('.dropdown-item');
      if (this.selectedIndex < 0 || this.selectedIndex >= items.length) return;
  
      const selectedFile = this.filterFiles(this.currentQuery)[this.selectedIndex];
      if (!selectedFile) return;
  
      const input = this.activeInput;
      const value = this.getInputValue(input);
      const beforeTrigger = value.substring(0, this.triggerPosition);
      const afterQuery = value.substring(this.triggerPosition + 1 + this.currentQuery.length);
      
      // 根据触发符决定插入的内容
      let insertContent;
      if (this.triggerChar === '@') {
        // 对于@符号，先插入文件名，然后触发处理
        insertContent = selectedFile.name;
        const newValue = beforeTrigger + this.triggerChar + insertContent + ' ' + afterQuery;
        this.setInputValue(input, newValue);
        
        const newCursorPos = this.triggerPosition + 1 + insertContent.length + 1;
        this.setCursorPosition(input, newCursorPos);
        
        this.hideDropdown();
        input.focus();
        
        // 触发input事件，确保内容更新
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
        
        // 延迟处理文件内容转换
        setTimeout(() => {
          this.processMessageBeforeSend(input);
        }, 100);
      } else if (this.triggerChar === '#') {
        // 对于#符号，直接插入完整内容
        insertContent = `\n\n--- ${selectedFile.name} ---\n${selectedFile.content}\n--- End of ${selectedFile.name} ---\n\n`;
        const newValue = beforeTrigger + this.triggerChar + insertContent + ' ' + afterQuery;
        this.setInputValue(input, newValue);
        
        const newCursorPos = this.triggerPosition + 1 + insertContent.length + 1;
        this.setCursorPosition(input, newCursorPos);
        
        this.hideDropdown();
        input.focus();
        
        // 触发input事件，确保内容更新
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  
    positionDropdown(input) {
      const rect = input.getBoundingClientRect();
      const dropdownHeight = 300; // 最大高度
      
      // 计算下拉菜单的位置
      let top = rect.top - dropdownHeight - 5; // 在输入框上方5px
      
      // 如果上方空间不足，则显示在下方
      if (top < 0) {
        top = rect.bottom + 5;
      }
      
      this.dropdown.style.left = rect.left + 'px';
      this.dropdown.style.top = top + 'px';
      this.dropdown.style.width = Math.max(300, rect.width) + 'px';
      this.dropdown.style.maxHeight = dropdownHeight + 'px';
    }
  
    hideDropdown() {
      if (this.dropdown) {
        this.dropdown.style.display = 'none';
      }
      this.selectedIndex = -1;
      this.activeInput = null;
      this.currentQuery = '';
      this.triggerChar = '';
      this.triggerPosition = -1;
    }
  
    showNoFilesMessage() {
      this.dropdown.innerHTML = `
        <div class="no-files-message">
          <p>📁 还没有设置工作区文件夹</p>
          <p>点击浏览器插件图标进行设置</p>
        </div>
      `;
      
      if (this.activeInput) {
        this.positionDropdown(this.activeInput);
        this.dropdown.style.display = 'block';
        
        setTimeout(() => {
          this.hideDropdown();
        }, 3000);
      }
    }
  
    async processMessageBeforeSend(input) {
      const value = this.getInputValue(input);
      const processedValue = await this.replaceFileReferences(value);
      
      if (processedValue !== value) {
        this.setInputValue(input, processedValue);
        
        // 触发发送事件
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  
    async replaceFileReferences(text) {
      const fileRefRegex = /[@#]([^\s]+)/g;
      let processedText = text;
      const matches = [...text.matchAll(fileRefRegex)];
      
      for (const match of matches) {
        const [fullMatch, fileName] = match;
        const file = this.files.find(f => f.name === fileName);
        
        if (file && file.content) {
          const replacement = `\n\n--- ${fileName} ---\n${file.content}\n--- End of ${fileName} ---\n\n`;
          processedText = processedText.replace(fullMatch, replacement);
        }
      }
      
      return processedText;
    }
  }
  
  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message);
    if (message.type === 'FILES_UPDATED') {
      console.log('收到文件更新消息，重新加载文件列表...');
      fileManager.loadFiles().then(() => {
        console.log('文件列表重新加载完成');
      }).catch(error => {
        console.error('重新加载文件列表失败:', error);
      });
    }
  });
  
  // 初始化文件管理器
  let fileManager;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fileManager = new FileContextManager();
    });
  } else {
    fileManager = new FileContextManager();
  }