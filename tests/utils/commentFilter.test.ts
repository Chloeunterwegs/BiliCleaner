import { CommentFilter, EnhancedFilterOptions } from './commentFilter';
import { CommentQualityMetrics } from '../types/comment';
import { VideoAnalyzer } from './videoAnalyzer';

describe('CommentFilter', () => {
  let filter: CommentFilter;
  let defaultOptions: EnhancedFilterOptions;
  let videoAnalyzer: VideoAnalyzer;

  beforeEach(() => {
    defaultOptions = {
      minQualityScore: 0.6,
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
      commentToViewRatio: 0,
      upInteractionFrequency: 0,
      commentDepthLevel: 0,
      minLikeRate: 0,
      excludeFilteredComments: false,
      excludeTopComments: false
    };
    
    videoAnalyzer = new VideoAnalyzer();
    
    filter = new CommentFilter(defaultOptions, videoAnalyzer);
  });

  describe('shouldShowComment', () => {
    it('应该过滤掉低质量评论', () => {
      const metrics: CommentQualityMetrics = {
        contentDepth: 0.2,
        professionalLevel: 0.1,
        interactionValue: 0.3,
        timeInvestment: 0.2,
        length: 20,
        hasLinks: false,
        hasImages: false,
        replyCount: 0,
        likeCount: 5,
        userLevel: 1,
        isUpReply: false
      };

      expect(filter.shouldShowComment(metrics, 0.4)).toBe(false);
    });

    it('应该保留高质量评论', () => {
      const metrics: CommentQualityMetrics = {
        contentDepth: 0.8,
        professionalLevel: 0.7,
        interactionValue: 0.6,
        timeInvestment: 0.5,
        length: 200,
        hasLinks: true,
        hasImages: true,
        replyCount: 15,
        likeCount: 100,
        userLevel: 5,
        isUpReply: true
      };

      expect(filter.shouldShowComment(metrics, 0.8)).toBe(true);
    });
  });
}); 