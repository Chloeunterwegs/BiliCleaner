import { CommentQualityMetrics } from '../types/comment';

export class CommentAnalyzer {
  public analyzeComment(comment: HTMLElement): CommentQualityMetrics {
    const metrics = {
      contentDepth: this.getBasicContentDepth(comment),
      professionalLevel: 0.5, // 暂时固定值
      interactionValue: this.getBasicInteractionValue(comment),
      timeInvestment: this.getBasicTimeInvestment(comment),
      length: this.getCommentLength(comment),
      hasLinks: this.checkForLinks(comment),
      hasImages: this.checkForImages(comment),
      replyCount: this.getReplyCount(comment),
      likeCount: this.getLikeCount(comment),
      userLevel: this.getUserLevel(comment),
      isUpReply: this.isUpReply(comment)
    };

    // 计算总体质量分数
    const qualityScore = this.calculateQualityScore(metrics);

    return {
      ...metrics,
      qualityScore
    };
  }

  public calculateQualityScore(metrics: Omit<CommentQualityMetrics, 'qualityScore'>): number {
    // 权重配置
    const weights = {
      contentDepth: 0.3,
      professionalLevel: 0.2,
      interactionValue: 0.3,
      timeInvestment: 0.2
    };

    // 计算加权平均分
    const score = 
      metrics.contentDepth * weights.contentDepth +
      metrics.professionalLevel * weights.professionalLevel +
      metrics.interactionValue * weights.interactionValue +
      metrics.timeInvestment * weights.timeInvestment;

    // 转换为0-100的分数
    return Math.round(score * 100);
  }

  private getBasicContentDepth(comment: HTMLElement): number {
    const length = this.getCommentLength(comment);
    return length > 50 ? 0.8 : 0.3;  // 降低长评论的判断标准
  }

  private getBasicInteractionValue(comment: HTMLElement): number {
    const likeCount = this.getLikeCount(comment);
    return likeCount > 50 ? 0.8 : 0.3;  // 简单判断：高点赞=高互动
  }

  private getBasicTimeInvestment(comment: HTMLElement): number {
    return this.checkForImages(comment) ? 0.8 : 0.3;  // 简单判断：有图=高投入
  }

  // 基础的DOM解析方法
  private getCommentText(comment: HTMLElement): string {
    const contentElement = comment.querySelector('.reply-content');
    return contentElement?.textContent?.trim() || '';
  }

  private getCommentLength(comment: HTMLElement): number {
    return this.getCommentText(comment).length;
  }

  private checkForLinks(comment: HTMLElement): boolean {
    return comment.querySelectorAll('a').length > 0;
  }

  private checkForImages(comment: HTMLElement): boolean {
    return comment.querySelectorAll('img.reply-item-image').length > 0;
  }

  private getReplyCount(comment: HTMLElement): number {
    const replyElement = comment.querySelector('.reply-count');
    return parseInt(replyElement?.textContent || '0', 10);
  }

  private getLikeCount(comment: HTMLElement): number {
    const likeElement = comment.querySelector('.like-count');
    return parseInt(likeElement?.textContent || '0', 10);
  }

  private getUserLevel(comment: HTMLElement): number {
    const levelElement = comment.querySelector('.user-level');
    return parseInt(levelElement?.textContent || '0', 10);
  }

  private isUpReply(comment: HTMLElement): boolean {
    return comment.classList.contains('up-reply');
  }
} 