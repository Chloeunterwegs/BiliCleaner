import { CommentAnalyzer } from './commentAnalyzer';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('CommentAnalyzer', () => {
  let analyzer: CommentAnalyzer;

  beforeEach(() => {
    analyzer = new CommentAnalyzer();
  });

  describe('analyzeComment', () => {
    it('应该返回完整的评论质量指标', () => {
      const comment = document.createElement('div');
      comment.innerHTML = `
        <div class="reply-content">${'这是一个很长的评论。'.repeat(20)}</div>
        <span class="reply-count">10</span>
        <span class="like-count">100</span>
        <img class="reply-item-image" />
      `;
      
      const metrics = analyzer.analyzeComment(comment);
      
      expect(metrics.contentDepth).toBe(0.8);
      expect(metrics.interactionValue).toBe(0.8);
      expect(metrics.timeInvestment).toBe(0.8);
      expect(metrics.hasImages).toBe(true);
    });

    it('应该正确处理低质量评论', () => {
      const comment = document.createElement('div');
      comment.innerHTML = `
        <div class="reply-content">短评论</div>
        <span class="reply-count">1</span>
        <span class="like-count">10</span>
      `;
      
      const metrics = analyzer.analyzeComment(comment);
      
      expect(metrics.contentDepth).toBe(0.3);
      expect(metrics.interactionValue).toBe(0.3);
      expect(metrics.timeInvestment).toBe(0.3);
      expect(metrics.hasImages).toBe(false);
    });
  });
}); 