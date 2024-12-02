const DEBUG_PREFIX = '[B站评论过滤器][Popup]';

interface FilterStats {
  processedCount: number;
  filteredCount: number;
  isActive: boolean;
}

// 从storage获取统计数据和状态
async function getStats(): Promise<FilterStats> {
  const result = await chrome.storage.local.get(['filterStats', 'filterEnabled']);
  return {
    ...result.filterStats || { processedCount: 0, filteredCount: 0 },
    isActive: result.filterEnabled !== false  // 默认开启
  };
}

// 更新插件状态
async function updateFilterState(enabled: boolean) {
  try {
    await chrome.storage.local.set({ filterEnabled: enabled });
    
    // 只在 B 站页面发送消息
    const tabs = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: "*://*.bilibili.com/*"  // 添加 URL 过滤
    });

    if (tabs[0]?.id) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'TOGGLE_FILTER',
          enabled: enabled
        });
      } catch (error) {
        console.log(`${DEBUG_PREFIX} 页面未准备好:`, error);
        // 不阻止后续操作
      }
    }
  } catch (error) {
    console.error(`${DEBUG_PREFIX} 更新状态失败:`, error);
  }
}

// 更新UI
async function updateUI() {
  const stats = await getStats();
  
  const statusEl = document.getElementById('status');
  const processedEl = document.getElementById('processedCount');
  const filteredEl = document.getElementById('filteredCount');
  const toggleEl = document.getElementById('toggleFilter') as HTMLInputElement;
  
  if (statusEl) {
    statusEl.textContent = stats.isActive ? '运行中' : '已停用';
    statusEl.parentElement?.parentElement?.classList.add(stats.isActive ? 'active' : 'inactive');
  }
  
  if (processedEl) {
    processedEl.textContent = stats.processedCount.toString();
  }
  
  if (filteredEl) {
    filteredEl.textContent = stats.filteredCount.toString();
  }
  
  if (toggleEl) {
    toggleEl.checked = stats.isActive;
  }
}

// 添加新的状态变量和 DOM 元素
let hideNavToggle: HTMLInputElement | null;
let hideNavStatus: HTMLElement | null;

// 更新初始化函数
document.addEventListener('DOMContentLoaded', async () => {
  // 更新初始 UI
  await updateUI();
  
  // 添加开关切换事件
  const toggleEl = document.getElementById('toggleFilter') as HTMLInputElement;
  if (toggleEl) {
    toggleEl.addEventListener('change', async () => {
      await updateFilterState(toggleEl.checked);
      await updateUI();
    });
  }
  
  hideNavToggle = document.getElementById('toggleNav') as HTMLInputElement;
  hideNavStatus = document.getElementById('hideNavStatus');
  
  // 获取并设置导航栏隐藏状态
  const { hideNav = false } = await chrome.storage.local.get('hideNav');
  if (hideNavToggle) {
    hideNavToggle.checked = hideNav;
    updateHideNavStatus(hideNav);
  }
  
  // 添加导航栏开关事件监听
  hideNavToggle?.addEventListener('change', async () => {
    const hideNav = hideNavToggle?.checked || false;
    await chrome.storage.local.set({ hideNav });
    updateHideNavStatus(hideNav);
    
    // 向 content script 发送消息
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggleNav', value: hideNav });
    }
  });
  
  // 初始化点赞比设置
  await initializeLikeRatioThreshold();
  await initializeKeywordsFilter();
});

// 添加状态更新函数
function updateHideNavStatus(hidden: boolean) {
  if (hideNavStatus) {
    hideNavStatus.textContent = hidden ? '开启' : '关闭';
    hideNavStatus.style.color = hidden ? '#276749' : '#9b2c2c';
  }
}

// 添加点赞比设置的逻辑
async function initializeLikeRatioThreshold() {
  const { likeRatioThreshold = 3 } = await chrome.storage.local.get('likeRatioThreshold');
  const input = document.getElementById('likeRatioThreshold') as HTMLInputElement;
  if (input) {
    input.value = likeRatioThreshold.toString();
  }

  // 添加保存按钮事件监听
  const saveBtn = document.getElementById('saveLikeRatio');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const newThreshold = parseFloat(input.value);
      if (isNaN(newThreshold) || newThreshold < 0 || newThreshold > 100) {
        alert('请输入0-100之间的有效数值');
        return;
      }

      await chrome.storage.local.set({ likeRatioThreshold: newThreshold });
      
      // 通知内容脚本更新阈值
      const tabs = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true,
        url: "*://*.bilibili.com/*"
      });

      if (tabs[0]?.id) {
        try {
          await chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'UPDATE_LIKE_RATIO_THRESHOLD',
            value: newThreshold
          });
        } catch (error) {
          console.log(`${DEBUG_PREFIX} 页面未准备好:`, error);
        }
      }
    });
  }
}

// 添加保存成功提示函数的定义
function showSaveSuccess() {
  const toast = document.createElement('div');
  toast.className = 'save-success';
  toast.textContent = '保存成功';
  document.body.appendChild(toast);
  
  // 2秒后移除提示
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// 统一的标签创建函数
function createKeywordTag(
  keyword: string, 
  container: HTMLElement, 
  type: 'title' | 'author' | 'partition' | 'whitelist'
) {
  const tag = document.createElement('div');
  tag.className = 'keyword-tag';
  tag.innerHTML = `
    ${keyword}
    <span class="remove">×</span>
  `;
  
  tag.querySelector('.remove')?.addEventListener('click', async () => {
    // 从DOM中移除标签
    tag.remove();
    
    // 获取剩余的关键词
    const remainingKeywords = Array.from(container.querySelectorAll('.keyword-tag'))
      .map(tag => tag.textContent?.replace('×', '').trim())
      .filter(Boolean)
      .join(',');
    
    // 保存到storage
    await chrome.storage.local.set({ [`${type}Keywords`]: remainingKeywords });
    
    // 通知content script
    const tabs = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: "*://*.bilibili.com/*"
    });

    if (tabs[0]?.id) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'UPDATE_KEYWORDS',
          target: type,
          value: remainingKeywords
        });
        showSaveSuccess();
      } catch (error) {
        console.log(`${DEBUG_PREFIX} 页面未准备好:`, error);
      }
    }
  });
  
  container.appendChild(tag);
}

// 统一的关键词输入处理函数
function setupKeywordInput(
  input: HTMLInputElement, 
  container: HTMLElement, 
  type: 'title' | 'author' | 'partition' | 'whitelist'
) {
  input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const keyword = input.value.trim();
      if (keyword) {
        createKeywordTag(keyword, container, type);
        input.value = '';

        // 获取所有关键词并保存
        const allKeywords = Array.from(container.querySelectorAll('.keyword-tag'))
          .map(tag => tag.textContent?.replace('×', '').trim())
          .filter(Boolean)
          .join(',');

        await chrome.storage.local.set({ [`${type}Keywords`]: allKeywords });

        // 通知content script
        const tabs = await chrome.tabs.query({ 
          active: true, 
          currentWindow: true,
          url: "*://*.bilibili.com/*"
        });

        if (tabs[0]?.id) {
          try {
            await chrome.tabs.sendMessage(tabs[0].id, { 
              type: 'UPDATE_KEYWORDS',
              target: type,
              value: allKeywords
            });
            showSaveSuccess();
          } catch (error) {
            console.log(`${DEBUG_PREFIX} 页面未准备好:`, error);
          }
        }
      }
    }
  });
}

// 修改关键词初始化函数
async function initializeKeywordsFilter() {
  const { 
    titleKeywords = '', 
    authorKeywords = '',
    partitionKeywords = '',
    whitelistKeywords = ''
  } = await chrome.storage.local.get([
    'titleKeywords', 
    'authorKeywords', 
    'partitionKeywords',
    'whitelistKeywords'
  ]);
  
  // 初始化标题关键词
  const titleInput = document.getElementById('titleKeywords') as HTMLInputElement;
  const titleTags = document.getElementById('titleTags');
  if (titleInput && titleTags) {
    const keywords = titleKeywords.split(',').filter((k: string) => k.trim());
    keywords.forEach((keyword: string) => createKeywordTag(keyword.trim(), titleTags, 'title'));
    setupKeywordInput(titleInput, titleTags, 'title');
  }

  // 初始化作者关键词
  const authorInput = document.getElementById('authorKeywords') as HTMLInputElement;
  const authorTags = document.getElementById('authorTags');
  if (authorInput && authorTags) {
    const keywords = authorKeywords.split(',').filter((k: string) => k.trim());
    keywords.forEach((keyword: string) => createKeywordTag(keyword.trim(), authorTags, 'author'));
    setupKeywordInput(authorInput, authorTags, 'author');
  }

  // 初始化分区关键词
  const partitionInput = document.getElementById('partitionKeywords') as HTMLInputElement;
  const partitionTags = document.getElementById('partitionTags');
  if (partitionInput && partitionTags) {
    const keywords = partitionKeywords.split(',').filter((k: string) => k.trim());
    keywords.forEach((keyword: string) => createKeywordTag(keyword.trim(), partitionTags, 'partition'));
    setupKeywordInput(partitionInput, partitionTags, 'partition');
  }

  // 初始化白名单关键词
  const whitelistInput = document.getElementById('whitelistKeywords') as HTMLInputElement;
  const whitelistTags = document.getElementById('whitelistTags');
  if (whitelistInput && whitelistTags) {
    const keywords = whitelistKeywords.split(',').filter((k: string) => k.trim());
    keywords.forEach((keyword: string) => createKeywordTag(keyword.trim(), whitelistTags, 'whitelist'));
    setupKeywordInput(whitelistInput, whitelistTags, 'whitelist');
  }
} 