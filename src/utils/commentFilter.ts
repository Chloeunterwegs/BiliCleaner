import { VideoAnalyzer } from './videoAnalyzer';
import { CommentFilterConfig, CommentQualityMetrics } from '../types/comment';

export class CommentFilter {
  private config: CommentFilterConfig;
  private videoAnalyzer: VideoAnalyzer;
  private DEBUG_PREFIX = '[B站评论过滤器][CommentFilter]';

  constructor(config: Partial<CommentFilterConfig>, videoAnalyzer: VideoAnalyzer) {
    // 设置默认配置
    const defaultConfig: CommentFilterConfig = {
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
    };

    // 合并配置
    this.config = { ...defaultConfig, ...config };
    this.videoAnalyzer = videoAnalyzer;
    console.log(`${this.DEBUG_PREFIX} 初始化过滤器配置:`, this.config);
  }

  public setOptions(options: Partial<CommentFilterConfig>): void {
    this.config = { ...this.config, ...options };
  }

  public async shouldProcessComments(videoUrl: string): Promise<boolean> {
    try {
      return await this.videoAnalyzer.isQualityVideo(videoUrl);
    } catch (error) {
      console.error(`${this.DEBUG_PREFIX} 评论处理检查失败:`, error);
      return false;
    }
  }

  public shouldShowComment(metrics: CommentQualityMetrics, qualityScore: number): boolean {
    if (qualityScore < this.config.minQualityScore) {
      return false;
    }

    if (metrics.contentDepth < this.config.minContentDepth) {
      return false;
    }

    if (metrics.professionalLevel < this.config.minProfessionalLevel) {
      return false;
    }

    return true;
  }
} 