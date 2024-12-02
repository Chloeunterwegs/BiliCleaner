import { CommentObserver } from './commentObserver';
import { CommentFilter } from './commentFilter';
import { CommentAnalyzer } from './commentAnalyzer';
import { VideoAnalyzer } from './videoAnalyzer';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

describe('CommentObserver', () => {
  let observer: CommentObserver;
  let filter: CommentFilter;
  let analyzer: CommentAnalyzer;
  let container: HTMLElement;
  let videoAnalyzer: VideoAnalyzer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    analyzer = new CommentAnalyzer();
    videoAnalyzer = new VideoAnalyzer();
    filter = new CommentFilter({
      minQualityScore: 60,
      minContentDepth: 0.3,
      minProfessionalLevel: 0.2,
      minInteractionValue: 0.4,
      minTimeInvestment: 0.3,
      requireLinks: false,
      requireImages: false,
      minReplyCount: 0,
      minLikeCount: 0,
      minUserLevel: 0,
      onlyUpReplies: false,
      commentToViewRatio: 0.03,
      upInteractionFrequency: 0,
      commentDepthLevel: 0,
      minLikeRate: 0,
      excludeFilteredComments: false,
      excludeTopComments: false
    }, videoAnalyzer);

    observer = new CommentObserver(filter, analyzer);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Filtering', () => {
    it('should show high quality comments', async () => {
      const comment = document.createElement('div');
      comment.className = 'reply-item';
      comment.innerHTML = `
        <div class="reply-content">${'这是一个很长的评论。'.repeat(20)}</div>
        <span class="reply-count">50</span>
        <span class="like-count">100</span>
        <img class="reply-item-image" />
      `;
      container.appendChild(comment);

      // 启动观察
      observer.startObserving(container);

      // 等待处理完成
      await new Promise<void>(resolve => {
        setTimeout(() => {
          expect(comment.style.display).not.toBe('none');
          resolve();
        }, 500); // 增加等待时间
      });
    });

    it('should hide low quality comments', async () => {
      const comment = document.createElement('div');
      comment.className = 'reply-item';
      comment.innerHTML = `
        <div class="reply-content">短评论</div>
        <span class="reply-count">1</span>
        <span class="like-count">5</span>
      `;
      container.appendChild(comment);

      // 启动观察
      observer.startObserving(container);

      // 等待处理完成
      await new Promise<void>(resolve => {
        setTimeout(() => {
          expect(comment.style.display).toBe('none');
          resolve();
        }, 500); // 增加等待时间
      });
    });
  });
}); 