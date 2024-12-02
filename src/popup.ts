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
});

// 添加状态更新函数
function updateHideNavStatus(hidden: boolean) {
  if (hideNavStatus) {
    hideNavStatus.textContent = hidden ? '开启' : '关闭';
    hideNavStatus.style.color = hidden ? '#276749' : '#9b2c2c';
  }
} 