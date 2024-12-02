import { QualityIndicator } from '../types/comment';

export interface PlatformConfig {
  name: string;
  commentSelector: string;
  qualityIndicators: QualityIndicator[];
  platformSpecificMetrics: Record<string, (element: HTMLElement) => number>;
}

export class PlatformAdapter {
  private static readonly PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
    bilibili: {
      name: '哔哩哔哩',
      commentSelector: '.reply-item',
      qualityIndicators: [
        { name: 'likes', selector: '.like-btn', valueType: 'number' },
        { name: 'replies', selector: '.reply-count', valueType: 'number' }
      ],
      platformSpecificMetrics: {
        upInteraction: (el) => el.classList.contains('up-reply') ? 1 : 0
      }
    },
    zhihu: {
      name: '知乎',
      commentSelector: '.CommentItem',
      qualityIndicators: [
        { name: 'votes', selector: '.Vote-count', valueType: 'number' },
        { name: 'replies', selector: '.CommentItemV2-footer', valueType: 'number' }
      ],
      platformSpecificMetrics: {
        authorResponse: (el) => el.querySelector('.AuthorComment') ? 1 : 0
      }
    }
  };

  public getCommentSelector(platform: string): string {
    return PlatformAdapter.PLATFORM_CONFIGS[platform]?.commentSelector || '';
  }

  public getQualityIndicators(platform: string): QualityIndicator[] {
    return PlatformAdapter.PLATFORM_CONFIGS[platform]?.qualityIndicators || [];
  }

  public getPlatformMetrics(platform: string, element: HTMLElement): Record<string, number> {
    const metrics = PlatformAdapter.PLATFORM_CONFIGS[platform]?.platformSpecificMetrics || {};
    return Object.entries(metrics).reduce((acc, [key, fn]) => {
      acc[key] = fn(element);
      return acc;
    }, {} as Record<string, number>);
  }
} 