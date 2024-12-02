import { VideoAnalyzer } from './utils/videoAnalyzer';

const DEBUG_PREFIX = '[B站评论过滤器]';
let processedCount = 0;
let filteredCount = 0;
let isEnabled = true;
let isNavHidden = false;
let isLoading = false;
let noMoreContent = false;
let visibleCardCount = 0;
let likeRatioThreshold = 0.03; // 默认3%
let titleKeywords: string[] = [];
let authorKeywords: string[] = [];
let partitionKeywords: string[] = [];
let whitelistKeywords: string[] = [];
let replyRatioThreshold = 0.01; // 默认1%
let enableHotReply = false;

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
async function shouldHideContent(element: Element): Promise<boolean> {
  // 首先检查白名单
  const whitelistTitleEl = element.querySelector('.bili-video-card__info--tit');
  if (whitelistTitleEl && whitelistKeywords.length > 0) {
    const title = whitelistTitleEl.textContent || '';
    if (whitelistKeywords.some(keyword => title.includes(keyword))) {
      console.log(`${DEBUG_PREFIX} 标题包含白名单关键词，保留:`, {
        标题: title,
        匹配关键词: whitelistKeywords.find(keyword => title.includes(keyword))
      });
      return false;
    }
  }

  // 检查数据属性
  if (element.getAttribute('data-v-fb1914c6')) {
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
    if (element.querySelector(selector)) {
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
    'use[href*="channel-tv"]',
    '[href*="bangumi"]',
    '[href*="cheese"]',
    '[href*="variety"]',
    '[href*="manga.bilibili.com"]',
    '[href*="tv.bilibili.com"]'
  ];

  // 检查基本选择器
  for (const selector of categoryIndicators) {
    const match = element.querySelector(selector);
    if (match) {
      return true;
    }
  }

  // 检查文本内容
  const titleElement = element.querySelector('.badge .floor-title');
  if (titleElement) {
    const text = titleElement.textContent || '';
    if (text.includes('纪录片') || text.includes('漫画') || text.includes('电视剧')) {
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
      return true;
    }
  }

  // 检查直播文本
  const badgeElement = element.querySelector('.badge');
  if (badgeElement && badgeElement.textContent?.includes('直播')) {
    return true;
  }

  // 检查标题关键词
  const titleEl = element.querySelector('.bili-video-card__info--tit');
  if (titleEl && titleKeywords.length > 0) {
    const title = titleEl.textContent || '';
    if (titleKeywords.some(keyword => title.includes(keyword))) {
      console.log(`${DEBUG_PREFIX} 标题包含关键词，已过滤:`, title);
      return true;
    }
  }

  // 检查作者关键词
  const authorEl = element.querySelector('.bili-video-card__info--author');
  if (authorEl && authorKeywords.length > 0) {
    const author = authorEl.textContent || '';
    if (authorKeywords.some(keyword => author.includes(keyword))) {
      console.log(`${DEBUG_PREFIX} 作者包含关键词，已过滤:`, author);
      return true;
    }
  }

  // 检查分区关键词
  const partitionEl = element.querySelector('.bili-video-card__info--partition, .bili-video-card__info--area');
  if (partitionEl && partitionKeywords.length > 0) {
    const partition = partitionEl.textContent?.trim() || '';
    const title = element.querySelector('.bili-video-card__info--tit')?.textContent?.trim() || '未知标题';
    const author = element.querySelector('.bili-video-card__info--author')?.textContent?.trim() || '未知UP主';

    // 无论是否匹配都输出分区信息
    console.log(`${DEBUG_PREFIX} 视频分区检查:`, {
      标题: title,
      UP主: author,
      分区: partition,
      当前过滤分区: partitionKeywords,
      是否被过滤: partitionKeywords.some(keyword => partition.includes(keyword))
    });

    if (partitionKeywords.some(keyword => partition.includes(keyword))) {
      console.log(`${DEBUG_PREFIX} 分区匹配，已过滤:`, {
        标题: title,
        UP主: author,
        分区: partition,
        匹配关键词: partitionKeywords.find(keyword => partition.includes(keyword))
      });
      return true;
    }
  }

  // 在所有规则检查完后，最后检查评论率和热评
  const link = element.querySelector('a[href*="/video/"]')?.getAttribute('href');
  if (!link) return true;

  const bvMatch = link.match(/\/video\/(BV[\w]+)/);
  if (!bvMatch) return true;

  const stats = await getCommentStats(bvMatch[1]);
  if (!stats) return true;

  // 评论率检查
  const hasEnoughReplyRatio = stats.replyRatio >= replyRatioThreshold;
  
  // 热评检查（如果启用）
  const hasEnoughHotReplies = !enableHotReply || stats.hotReplyCount >= 1;

  // 两个条件都满足才显示
  const shouldShow = hasEnoughReplyRatio && hasEnoughHotReplies;
  
  if (!shouldShow) {
    console.log(`${DEBUG_PREFIX} 视频未达到评论指标，已过滤:`, {
      标题: element.querySelector('.bili-video-card__info--tit')?.textContent?.trim(),
      播放量: stats.viewCount,
      评论数: stats.replyCount,
      评论率: `${(stats.replyRatio * 100).toFixed(2)}%`,
      热评数: stats.hotReplyCount,
      评论率达标: hasEnoughReplyRatio,
      热评达标: hasEnoughHotReplies
    });
    return true;
  }

  return false;
}

// 更新CSS以优化布局
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .recommended-swipe {
    display: none !important;
  }
`;
document.head.appendChild(styleSheet);

// 修改视频信息输出函数
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

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
  };

  // 构建数据字符串
  let statsStr = '';
  if (metrics) {
    statsStr = `\n   数据统计:
    ▶️ 播放量: ${formatNumber(metrics.viewCount || 0)}
    👍 点赞数: ${formatNumber(metrics.likeCount || 0)}
    📊 点赞率: ${((metrics.likeRatio || 0) * 100).toFixed(2)}%`;
  }

  console.log(
    `%c${prefix} ${title}\n` +
    `   UP主: ${up}\n` +
    `   链接: ${link}` +
    statsStr,
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

// 获取视频数据的函数
async function getVideoMetrics(bvid: string): Promise<{ view: number, like: number } | null> {
  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    const data = await response.json();
    
    if (data.code === 0) {
      return {
        view: data.data.stat.view,
        like: data.data.stat.like
      };
    }
    return null;
  } catch (error) {
    console.error('获取视频数据失败:', error);
    return null;
  }
}

// 修改检查视频质量的函数
async function isQualityVideo(element: Element): Promise<boolean> {
  const link = element.querySelector('a[href*="/video/"]')?.getAttribute('href');
  if (!link) return false;
  
  const bvid = link.match(/\/video\/(BV[\w]+)/)?.[1];
  if (!bvid) return false;

  const metrics = await getVideoMetrics(bvid);
  if (!metrics) return false;

  // 计算点赞率
  const likeRatio = metrics.like / metrics.view;
  const passQuality = likeRatio >= 0.03;

  // 只输出视频数据
  console.log(`${DEBUG_PREFIX} 视频数据:`, {
    标题: element.querySelector('.bili-video-card__info--tit')?.textContent?.trim(),
    UP主: element.querySelector('.bili-video-card__info--author')?.textContent?.trim(),
    播放量: metrics.view.toLocaleString(),
    点赞数: metrics.like.toLocaleString(),
    点赞率: `${(likeRatio * 100).toFixed(2)}%`,
    通过筛选: passQuality ? '✅' : '❌'
  });

  return passQuality;
}

// 添加新的接口定义
interface CommentStats {
  replyCount: number;
  viewCount: number;
  replyRatio: number;
  hotReplyCount: number;
}

// 修改 getCommentStats 函数
async function getCommentStats(bvid: string): Promise<CommentStats | null> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 添加随机延迟避免频繁请求
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      // 获取视频基础信息
      const videoResponse = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
      if (!videoResponse.ok) {
        throw new Error(`视频信息请求失败: ${videoResponse.status}`);
      }
      
      const videoData = await videoResponse.json();
      if (videoData.code !== 0) {
        throw new Error(`获取视频信息失败: ${videoData.message}`);
      }

      // 获取评论区信息
      const commentResponse = await fetch(`https://api.bilibili.com/x/v2/reply?type=1&oid=${videoData.data.aid}&pn=1&ps=20`);
      if (!commentResponse.ok) {
        throw new Error(`评论请求失败: ${commentResponse.status}`);
      }
      
      const commentData = await commentResponse.json();
      if (commentData.code !== 0) {
        throw new Error(`获取评论失败: ${commentData.message}`);
      }

      // 统计热评数量（回复数>20的评论）
      const hotReplyCount = commentData.data.replies?.filter(
        (reply: any) => reply.rcount > 20
      ).length || 0;

      const stats: CommentStats = {
        replyCount: videoData.data.stat.reply,
        viewCount: videoData.data.stat.view,
        replyRatio: videoData.data.stat.reply / videoData.data.stat.view,
        hotReplyCount
      };

      return stats;

    } catch (error) {
      retryCount++;
      console.warn(`${DEBUG_PREFIX} 获取评论数据失败 (尝试 ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount === maxRetries) {
        console.error(`${DEBUG_PREFIX} 达到最大重试次数，放弃获取评论数据`);
        return null;
      }
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }

  return null;
}

// 修改 processVideoCard 函数
async function processVideoCard(element: Element) {
  if (element.hasAttribute('data-processed')) {
    return;
  }
  element.setAttribute('data-processed', 'true');

  const shouldHide = await shouldHideContent(element);
  if (shouldHide) {
    element.classList.add('filtered-video');
    return;
  }

  // 获取视频链接和标题
  const link = element.querySelector('a[href*="/video/"]')?.getAttribute('href');
  const title = element.querySelector('.bili-video-card__info--tit')?.textContent?.trim();
  
  if (!link || !title) {
    return;
  }

  const bvid = link.match(/\/video\/(BV[\w]+)/)?.[1];
  if (!bvid) {
    return;
  }

  // 获取评论统计数据
  const stats = await getCommentStats(bvid);
  
  if (stats) {
    // 输出详细信息到控制台
    console.log(`${DEBUG_PREFIX} 视频数据分析:`, {
      标题: title,
      播放量: stats.viewCount.toLocaleString(),
      评论数: stats.replyCount.toLocaleString(),
      评论率: `${(stats.replyRatio * 100).toFixed(4)}%`,
      热评数量: `${stats.hotReplyCount}条`,
      链接: `https://www.bilibili.com/video/${bvid}`
    });
  }
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

// 定义 observeVideoList 函数
function observeVideoList() {
  const feedContainer = document.querySelector('.feed-card');
  if (feedContainer) {
    videoObserver.observe(feedContainer, {
      childList: true,
      subtree: true
    });
    console.log(`${DEBUG_PREFIX} 开始观察视频列表`);
  }
}

// 修改 MutationObserver 的处理逻辑
const videoObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(async (node) => {
        if (node instanceof HTMLElement) {
          // 1. 处理当前节点
          const shouldHide = await shouldHideContent(node);
          if (shouldHide) {
            node.classList.add('filtered-video');
            return;
          }

          // 2. 处理所有新添加的卡片
          const allCards = node.querySelectorAll('.bili-video-card, .floor-single-card');
          allCards.forEach(async (card) => {
            if (card.hasAttribute('data-processed')) {
              return;
            }
            card.setAttribute('data-processed', 'true');

            // 先检查是否需要直接隐藏
            const shouldHideCard = await shouldHideContent(card);
            if (shouldHideCard) {
              card.classList.add('filtered-video');
              return;
            }

            // 如果是普通视频卡片，检查点赞率
            if (card.classList.contains('bili-video-card')) {
              const link = card.querySelector('a[href*="/video/"]')?.getAttribute('href');
              if (!link) {
                card.classList.add('filtered-video');
                return;
              }
              
              const bvid = link.match(/\/video\/(BV[\w]+)/)?.[1];
              if (!bvid) {
                card.classList.add('filtered-video');
                return;
              }

              const metrics = await getVideoMetrics(bvid);
              if (!metrics) {
                card.classList.add('filtered-video');
                return;
              }

              const likeRatio = metrics.like / metrics.view;
              
              // 输出视频数据
              console.log(`${DEBUG_PREFIX} 视频数据:`, {
                标题: card.querySelector('.bili-video-card__info--tit')?.textContent?.trim(),
                UP主: card.querySelector('.bili-video-card__info--author')?.textContent?.trim(),
                播放量: metrics.view.toLocaleString(),
                点赞数: metrics.like.toLocaleString(),
                点赞率: `${(likeRatio * 100).toFixed(2)}%`,
                通过筛选: likeRatio >= likeRatioThreshold ? '✅' : '❌'
              });

              if (likeRatio < likeRatioThreshold) {
                console.log(`${DEBUG_PREFIX} 低于${(likeRatioThreshold * 100).toFixed(1)}%，予以隐藏`);
                card.classList.add('filtered-video');
              }
            }
          });
        }
      });
    }
  });
});

// 合并后的初始化函数
async function init() {
  if (!window.location.pathname.match(/^\/($|index.html|video|space|search)/)) {
    console.log(`${DEBUG_PREFIX} 不是目标页面，插件不工作`);
    return;
  }

  console.log(`${DEBUG_PREFIX} 插件启动`);
  
  // 获取导航栏隐藏状态
  const { hideNav = false } = await chrome.storage.local.get('hideNav');
  isNavHidden = hideNav;
  toggleNav(isNavHidden);

  // 处理所有已存在的卡片
  processAllVideoCards();

  // 启动观察器，监听整个页面
  videoObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 添加滚动监听，处理懒加载
  window.addEventListener('scroll', debounce(() => {
    if (isEnabled) {
      const unprocessedCards = document.querySelectorAll('.bili-video-card:not([data-processed]), .floor-single-card:not([data-processed])');
      unprocessedCards.forEach(card => {
        if (card instanceof HTMLElement) {
          processVideoCard(card);
        }
      });
    }
  }, 200));

  // 获取点赞率阈值
  const { likeRatioThreshold: threshold = 3 } = await chrome.storage.local.get('likeRatioThreshold');
  likeRatioThreshold = threshold / 100; // 转换为小数

  // 初始化关键词
  const { titleKeywords: title = '', authorKeywords: author = '', partitionKeywords: partition = '', whitelistKeywords: whitelist = '' } = 
    await chrome.storage.local.get(['titleKeywords', 'authorKeywords', 'partitionKeywords', 'whitelistKeywords']);
  
  titleKeywords = title.split(',')
    .map((k: string) => k.trim())
    .filter((k: string) => k);
  
  authorKeywords = author.split(',')
    .map((k: string) => k.trim())
    .filter((k: string) => k);
  partitionKeywords = partition.split(',').map((k: string) => k.trim()).filter((k: string) => k);
  whitelistKeywords = whitelist.split(',').map((k: string) => k.trim()).filter((k: string) => k);
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

// 添加滚动事件监听
window.addEventListener('scroll', debounce(() => {
  if (isEnabled) {
    checkNeedMoreContent();
  }
}, 200));

// 添加新的消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_LIKE_RATIO_THRESHOLD') {
    likeRatioThreshold = message.value / 100;
    console.log(`${DEBUG_PREFIX} 点赞率阈值已更新: ${message.value}%`);
    // 重新处理所有视频
    processAllVideoCards();
    sendResponse({ success: true });
  }
  return true;
});

// 添加新的消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_KEYWORDS') {
    if (message.target === 'title') {
      titleKeywords = message.value.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      console.log(`${DEBUG_PREFIX} 标题关键词已更新:`, titleKeywords);
    } else if (message.target === 'author') {
      authorKeywords = message.value.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      console.log(`${DEBUG_PREFIX} 作者关键词已更新:`, authorKeywords);
    } else if (message.target === 'partition') {
      partitionKeywords = message.value.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      console.log(`${DEBUG_PREFIX} 分区关键词已更新:`, partitionKeywords);
      processAllVideoCards();
      sendResponse({ success: true });
    } else if (message.target === 'whitelist') {
      whitelistKeywords = message.value.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      console.log(`${DEBUG_PREFIX} 白名单关键词已更新:`, whitelistKeywords);
      processAllVideoCards();
      sendResponse({ success: true });
    }
  }
  return true;
});

// 添加新的消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_REPLY_RATIO_THRESHOLD') {
    replyRatioThreshold = message.value / 100;
    console.log(`${DEBUG_PREFIX} 评论率阈值已更新: ${message.value}%`);
    processAllVideoCards();
    sendResponse({ success: true });
  } else if (message.type === 'TOGGLE_HOT_REPLY') {
    enableHotReply = message.enabled;
    console.log(`${DEBUG_PREFIX} 热评判断已${enableHotReply ? '开启' : '关闭'}`);
    processAllVideoCards();
    sendResponse({ success: true });
  }
  return true;
});
  