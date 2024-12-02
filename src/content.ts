import { VideoAnalyzer } from './utils/videoAnalyzer';

const DEBUG_PREFIX = '[B站评论过滤器]';
let processedCount = 0;
let filteredCount = 0;
let isEnabled = true;
let isNavHidden = false;
let isLoading = false;
let noMoreContent = false;
let visibleCardCount = 0;

// 添加更新统计函数
async function updateStats(isFiltered: boolean) {
  try {
    await chrome.storage.local.set({
      filterStats: {
        processedCount,
        filteredCount,
        isActive: isEnabled
      }
    });
    console.log(`${DEBUG_PREFIX} 统计数据已更新:`, {
      processedCount,
      filteredCount,
      isActive: isEnabled
    });
  } catch (error) {
    console.error(`${DEBUG_PREFIX} 更新统计失败:`, error);
  }
}

// 添加新的过滤规则
function shouldHideContent(element: Element): boolean {
  console.log(`${DEBUG_PREFIX} 开始检查元素:`, {
    element,
    classes: element.className,
    attributes: Array.from(element.attributes).map(attr => `${attr.name}=${attr.value}`)
  });

  // 检查数据属性
  if (element.getAttribute('data-v-fb1914c6')) {
    console.log(`${DEBUG_PREFIX} 命中数据属性过滤规则: data-v-fb1914c6`);
    return true;
  }

  // 检查广告标记
  const adIndicators = [
    'use[href="#palette-ad"]',
    '.bili-video-card__info--ad',
    '[class*="creative-ad"]',
    '[class*="ad-report"]',
    '[href*="cm.bilibili.com"]'
  ];

  for (const selector of adIndicators) {
    const match = element.querySelector(selector);
    if (match) {
      console.log(`${DEBUG_PREFIX} 命中广告标记:`, {
        selector,
        matchedElement: match
      });
      return true;
    }
  }

  // 检查分类标记
  const categoryIndicators = [
    'use[href*="channel-movie"]',
    'use[href*="channel-zhishi"]',
    'use[href*="channel-zongyi"]',
    'use[href*="channel-live"]',
    'use[href*="channel-documentary"]',
    'use[href*="channel-manhua"]',
    '[href*="bangumi"]',
    '[href*="cheese"]',
    '[href*="variety"]',
    '[href*="manga.bilibili.com"]'
  ];

  // 检查基本选择器
  for (const selector of categoryIndicators) {
    const match = element.querySelector(selector);
    if (match) {
      console.log(`${DEBUG_PREFIX} 命中分类标记:`, {
        selector,
        matchedElement: match,
        href: match.getAttribute('href')
      });
      return true;
    }
  }

  // 检查文本内容
  const titleElement = element.querySelector('.badge .floor-title');
  if (titleElement) {
    const text = titleElement.textContent || '';
    if (text.includes('纪录片') || text.includes('漫画')) {
      console.log(`${DEBUG_PREFIX} 命中标题文本:`, {
        text,
        element: titleElement
      });
      return true;
    }
  }

  // 检查直播标记
  const liveIndicators = [
    '.living',
    'use[href*="channel-live"]',
    'a[href*="live.bilibili.com"]',
    'a[href*="/live/"]'
  ];

  // 检查直播相关选择器
  for (const selector of liveIndicators) {
    const match = element.querySelector(selector);
    if (match) {
      console.log(`${DEBUG_PREFIX} 命中直播标记:`, {
        selector,
        matchedElement: match
      });
      return true;
    }
  }

  // 检查直播文本
  const badgeElement = element.querySelector('.badge');
  if (badgeElement && badgeElement.textContent?.includes('直播')) {
    console.log(`${DEBUG_PREFIX} 命中直播文本`);
    return true;
  }

  console.log(`${DEBUG_PREFIX} 元素通过检查，不需要隐藏`);
  return false;
}

// 更新CSS以优化布局
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .recommended-swipe {
    display: none !important;
  }

  .filtered-video {
    display: none !important;
  }

  /* 使用grid布局自动填充空缺 */
  .feed-card, .bili-feed {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
    gap: 20px !important;
    padding: 0 20px !important;
  }

  .bili-video-card:not(.filtered-video) {
    margin: 0 !important;
    width: 100% !important;
  }
`;
document.head.appendChild(styleSheet);

// 添加视频信息输出函数
function logVideoInfo(videoCard: Element, reason: string, metrics?: { 
  viewCount?: number, 
  likeCount?: number, 
  likeRatio?: number 
}) {
  const title = videoCard.querySelector('.bili-video-card__info--tit')?.getAttribute('title') || '未知标题';
  const up = videoCard.querySelector('.bili-video-card__info--author')?.textContent?.trim() || '未知UP主';
  const link = videoCard.querySelector('a[href*="/video/"]')?.getAttribute('href') || '未知链接';

  let logStyle = 'color: #999; font-size: 12px;';
  let prefix = '🎬';

  if (reason.includes('隐藏')) {
    logStyle = 'color: #f56c6c; font-size: 12px;';
    prefix = '❌';
  } else if (reason.includes('合格')) {
    logStyle = 'color: #67c23a; font-size: 12px;';
    prefix = '✅';
  }

  console.log(
    `%c${prefix} ${title}\n` +
    `   UP主: ${up}\n` +
    `   链接: ${link}\n` +
    `   状态: ${reason}` +
    (metrics ? `\n   数据: 播放${metrics.viewCount} 点赞${metrics.likeCount} 点赞率${(metrics.likeRatio! * 100).toFixed(2)}%` : ''),
    logStyle
  );
}

// 添加防抖函数
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 使用 Set 缓存已处理的元素
const processedCards = new Set<Element>();

// 修改处理视频卡片的方法
function processVideoCard(card: Element) {
  if (!isEnabled || processedCards.has(card)) {
    return;
  }

  console.log(`${DEBUG_PREFIX} 开始处理视频卡片:`, {
    card,
    title: card.querySelector('.bili-video-card__info--tit')?.textContent?.trim(),
    uploader: card.querySelector('.bili-video-card__info--author')?.textContent?.trim()
  });

  if (shouldHideContent(card)) {
    // 不是用 display: none，而是直接移除元素
    card.remove();
    processedCards.add(card);
    filteredCount++;
    console.log(`${DEBUG_PREFIX} 已移除内容:`, {
      card,
      reason: '匹配过滤规则'
    });
  } else {
    processedCards.add(card);
    processedCount++;
  }

  updateStats(true);
}

// 修改 checkNeedMoreContent 函数
function checkNeedMoreContent() {
  const visibleCards = document.querySelectorAll('.bili-video-card:not(.hidden)');
  visibleCardCount = visibleCards.length;
  
  // 如果当前可见区域没有合格视频，且不在加载中，则触发懒加载
  if (visibleCardCount === 0 && !isLoading && !noMoreContent) {
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    
    // 如果用户已经滚动到接近底部，触发加载
    if ((scrollTop + viewportHeight + 200) >= documentHeight) {
      console.log(`${DEBUG_PREFIX} 当前页面无合格视频，触发懒加载`);
      triggerLoadMore();
    } else {
      console.log(`${DEBUG_PREFIX} 等待用户滚动以加载更多内容`);
    }
  }
}

// 触发B站的加载更多功能
function triggerLoadMore() {
  isLoading = true;
  
  // 找到加载触发点
  const feedBottom = document.querySelector('.feed-load-anchor');
  if (feedBottom) {
    // 创建交叉观察器配置
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log(`${DEBUG_PREFIX} 触发加载更多`);
          // 滚动到加载触发点
          feedBottom.scrollIntoView();
          observer.disconnect();
          
          // 设置超时检查是否有新内容加载
          setTimeout(() => {
            const currentCards = document.querySelectorAll('.bili-video-card').length;
            if (currentCards === visibleCardCount) {
              console.log(`${DEBUG_PREFIX} 未检测到新内容加载，可能已到达底部`);
              noMoreContent = true;
            }
            isLoading = false;
          }, 3000);
        }
      });
    }, options);

    // 开始观察
    observer.observe(feedBottom);
  } else {
    console.log(`${DEBUG_PREFIX} 未找到加载触发点，可能已到达底部`);
    noMoreContent = true;
    isLoading = false;
  }
}

// 修改 processAllVideoCards 函数
function processAllVideoCards() {
  if (!isEnabled) return;

  const cards = document.querySelectorAll<Element>([
    '.bili-video-card:not([data-filtered])',
    '.feed-card:not([data-filtered])',
    '.floor-card:not([data-filtered])'
  ].join(','));

  if (cards.length === 0) return;

  const batchSize = 10;
  let index = 0;

  function processBatch() {
    const end = Math.min(index + batchSize, cards.length);
    
    for (let i = index; i < end; i++) {
      const card = cards[i];
      processVideoCard(card);
      card.setAttribute('data-filtered', 'true');
    }

    index = end;
    
    if (index < cards.length) {
      requestAnimationFrame(processBatch);
    } else {
      // 处理完当前批次，检查是否需要加载更多
      checkNeedMoreContent();
    }
  }

  requestAnimationFrame(processBatch);
}

// 修改 MutationObserver 回调
const debouncedProcess = debounce((mutations: MutationRecord[]) => {
  console.log(`${DEBUG_PREFIX} 检测到页面变化:`, {
    mutationsCount: mutations.length,
    timestamp: new Date().toISOString()
  });

  const newCards = new Set<Element>();

  mutations.forEach(mutation => {
    console.log(`${DEBUG_PREFIX} 处理变更:`, {
      type: mutation.type,
      addedNodes: mutation.addedNodes.length,
      target: mutation.target
    });

    mutation.addedNodes.forEach(node => {
      if (node instanceof Element) {
        const cards = node.querySelectorAll<Element>([
          '.bili-video-card:not([data-filtered])',
          '.feed-card:not([data-filtered])',
          '.floor-card:not([data-filtered])'
        ].join(','));
        
        console.log(`${DEBUG_PREFIX} 找到新卡片:`, {
          count: cards.length,
          cards: Array.from(cards).map(card => ({
            title: card.querySelector('.bili-video-card__info--tit')?.textContent?.trim(),
            uploader: card.querySelector('.bili-video-card__info--author')?.textContent?.trim()
          }))
        });

        cards.forEach(card => newCards.add(card));
      }
    });
  });

  if (newCards.size > 0) {
    console.log(`${DEBUG_PREFIX} 开始处理新片:`, {
      count: newCards.size,
      timestamp: new Date().toISOString()
    });

    requestAnimationFrame(() => {
      newCards.forEach(card => {
        processVideoCard(card);
        card.setAttribute('data-filtered', 'true');
      });
      
      console.log(`${DEBUG_PREFIX} 完成新卡片处理:`, {
        processedCount: processedCards.size,
        timestamp: new Date().toISOString()
      });

      // 处理完新卡片后，检查是否需要加载更多
      checkNeedMoreContent();
    });
  }
}, 100);

// 优化 observeVideoList 函数
function observeVideoList() {
  console.log(`${DEBUG_PREFIX} 启动内容监听器`);
  
  const observer = new MutationObserver(debouncedProcess);
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
  
  console.log(`${DEBUG_PREFIX} 内容监听器已启动`);
}

// 合并后的初始化函数
async function init() {
  // 检查是否是目标页面
  if (!window.location.pathname.match(/^\/($|index.html|video|space|search)/)) {
    console.log(`${DEBUG_PREFIX} 不是目标页面，插件不工作`);
    return;
  }

  console.log(`${DEBUG_PREFIX} 插件启动`);
  
  // 获取导航栏隐藏状态
  const { hideNav = false } = await chrome.storage.local.get('hideNav');
  isNavHidden = hideNav;
  toggleNav(isNavHidden);
  
  // 初始处理已有的视频卡片
  processAllVideoCards();
  
  // 启动观察器
  observeVideoList();
}

// 监听来自 popup 的消
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_FILTER') {
    isEnabled = message.enabled;
    console.log(`${DEBUG_PREFIX} 过滤器状态更新:`, isEnabled);
    
    // 如果启用，重新处理页面
    if (isEnabled) {
      processAllVideoCards();
    }
    
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开启
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 添加视频信息获取
async function getVideoInfo(videoElement: Element) {
  try {
    const videoLink = videoElement.querySelector('a.bili-video-card__image--link');
    if (!videoLink) return null;

    const bvMatch = (videoLink as HTMLAnchorElement).href.match(/\/video\/(BV[\w]+)/);
    if (!bvMatch) return null;

    const bvid = bvMatch[1];
    
    // 获取标题
    const title = videoElement.querySelector('.bili-video-card__info--tit')?.textContent?.trim();
    
    // 获取UP主信息
    const uploader = videoElement.querySelector('.bili-video-card__info--author')?.textContent?.trim();
    
    // 获取播放量
    const viewCountText = videoElement.querySelector('.bili-video-card__stats--text')?.textContent;
    const viewCount = parseViewCount(viewCountText || '0');

    return {
      bvid,
      title,
      uploader,
      stats: {
        view: viewCount,
        // 其他统计信息...
      }
    };
  } catch (err) {
    console.error(`${DEBUG_PREFIX} 获取视频信息失败:`, err);
    return null;
  }
}

// 辅助函数：解析播放量文本
function parseViewCount(text: string): number {
  const num = parseFloat(text);
  if (text.includes('万')) {
    return num * 10000;
  }
  return num;
}

// 添加新的消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'toggleNav') {
    isNavHidden = request.value;
    toggleNav(isNavHidden);
    sendResponse({ success: true });
  }
});

// 添加新的切换函数
function toggleNav(hide: boolean) {
  if (hide) {
    document.body.classList.add('hide-nav');
  } else {
    document.body.classList.remove('hide-nav');
  }
}

// 修改 MutationObserver
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (shouldHideContent(node)) {
            node.remove();
          }
          
          // 处理子节点
          const cards = node.querySelectorAll('.bili-video-card, .floor-single-card');
          cards.forEach(card => {
            if (shouldHideContent(card)) {
              card.remove();
            }
          });
        }
      });
    }
  }
});

// 配置 observer
const observerConfig = {
  childList: true,
  subtree: true
};

// 开始观察
observer.observe(document.body, observerConfig);

// 初始处理
document.querySelectorAll('.bili-video-card, .floor-single-card').forEach(card => {
  if (shouldHideContent(card)) {
    (card as HTMLElement).style.display = 'none';
  }
});

// 添加滚动事件监听
window.addEventListener('scroll', debounce(() => {
  if (isEnabled) {
    checkNeedMoreContent();
  }
}, 200));
  