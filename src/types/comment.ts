// 基础评论指标接口
export interface CommentMetrics {
  length: number;
  hasLinks: boolean;
  hasImages: boolean;
  replyCount: number;
  likeCount: number;
  userLevel: number;
  isUpReply: boolean;
}

// 扩展的评论质量指标接口
export interface CommentQualityMetrics extends CommentMetrics {
  qualityScore: number;    // 总体质量分数
  contentDepth: number;    // 内容深度分析
  professionalLevel: number; // 专业度评估
  interactionValue: number;  // 互动价值
  timeInvestment: number;    // 时间投入度
}

// 质量指标接口
export interface QualityIndicator {
  name: string;
  selector: string;
  valueType: 'number' | 'boolean' | 'string';
}

// 基础过滤选项接口
export interface FilterOptions {
  minQualityScore: number;
  requireLinks: boolean;
  requireImages: boolean;
  minReplyCount: number;
  minLikeCount: number;
  minUserLevel: number;
  onlyUpReplies: boolean;
  minLikeRate: number;        // 最低点赞率
  excludeFilteredComments: boolean;  // 排除精选评论
  excludeTopComments: boolean;      // 排除置顶评论
}

export interface CommentFilterConfig {
  minQualityScore: number;
  minContentDepth: number;
  minProfessionalLevel: number;
  minInteractionValue: number;
  minTimeInvestment: number;
  requireLinks: boolean;
  requireImages: boolean;
  minReplyCount: number;
  minLikeCount: number;
  minUserLevel: number;
  onlyUpReplies: boolean;
  commentToViewRatio: number;
  upInteractionFrequency: number;
  commentDepthLevel: number;
  minLikeRate: number;
  excludeFilteredComments: boolean;
  excludeTopComments: boolean;
} 