import { CommentMetrics } from './comment';

export interface VideoMetrics {
  viewCount: number;
  likeCount: number;
  comments: Array<{
    rpid: number;
    content: {
      message: string;
    };
    like: number;
    replyCount: number;
  }>;
}

// 视频质量判定阈值
export interface VideoQualityThreshold {
  minCommentToViewRatio: number;     // 最小评论播放比(默认0.03，即3%)
  minFirstPageReplyCount: number;    // 首页评论最小回复数(默认20)
  minQualityCommentRatio: number;    // 高质量评论占比(默认0.3，即30%)
} 