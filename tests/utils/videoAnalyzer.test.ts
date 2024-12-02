import { VideoAnalyzer } from './videoAnalyzer';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('VideoAnalyzer', () => {
  let analyzer: VideoAnalyzer;

  beforeEach(() => {
    analyzer = new VideoAnalyzer();
    
    document.body.innerHTML = `
      <div class="video-data">
        <span class="view">10万</span>
        <span class="like">5000</span>
        <span class="reply">3000</span>
      </div>
    `;
  });

  describe('isQualityVideo', () => {
    it('应该正确识别高质量视频', () => {
      document.querySelector('.view')!.textContent = '10万';
      document.querySelector('.like')!.textContent = '5000';
      expect(analyzer.isQualityVideo()).toBe(true);
    });

    it('应该过滤掉点赞率低的视频', () => {
      document.querySelector('.view')!.textContent = '100万';
      document.querySelector('.like')!.textContent = '5000';
      expect(analyzer.isQualityVideo()).toBe(false);
    });
  });

  describe('getVideoMetrics', () => {
    it('应该正确解析视频数据', () => {
      const metrics = analyzer.getVideoMetrics();
      expect(metrics.viewCount).toBe(100000);
      expect(metrics.likeCount).toBe(5000);
      expect(metrics.likeRatio).toBe(0.05);
    });

    it('应该正确处理带单位的数字', () => {
      document.querySelector('.view')!.textContent = '1.5万';
      document.querySelector('.like')!.textContent = '2.3万';
      
      const metrics = analyzer.getVideoMetrics();
      expect(metrics.viewCount).toBe(15000);
      expect(metrics.likeCount).toBe(23000);
    });
  });
}); 