import { VideoMetrics } from '../types/video';

export class VideoAnalyzer {
  private readonly DEBUG_PREFIX = '[B站评论过滤器][VideoAnalyzer]';

  // 从 URL 中提取 BV 号
  private getBvFromUrl(url: string): string | null {
    const match = url.match(/\/video\/(BV[\w]+)/);
    return match ? match[1] : null;
  }

  // 获取视频信息
  async getVideoMetrics(videoUrl: string): Promise<VideoMetrics | null> {
    try {
      const bvid = this.getBvFromUrl(videoUrl);
      if (!bvid) {
        console.error(`${this.DEBUG_PREFIX} 无效的视频URL:`, videoUrl);
        return null;
      }

      // 获取视频基本信息
      const videoInfoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const videoInfoResponse = await fetch(videoInfoUrl, {
        credentials: 'include',  // 添加凭证
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://www.bilibili.com'
        }
      });
      
      const videoInfo = await videoInfoResponse.json();
      if (videoInfo.code !== 0) {
        throw new Error(`获取视频信息失败: ${videoInfo.message}`);
      }

      // 获取评论列表
      const commentUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${videoInfo.data.aid}&sort=2`;
      const commentResponse = await fetch(commentUrl, {
        credentials: 'include',  // 添加凭证
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://www.bilibili.com'
        }
      });
      
      const commentData = await commentResponse.json();
      if (commentData.code !== 0) {
        throw new Error(`获取评论失败: ${commentData.message}`);
      }

      // 构建返回数据
      return {
        viewCount: videoInfo.data.stat.view,
        likeCount: videoInfo.data.stat.like,
        comments: commentData.data.replies?.map((reply: any) => ({
          rpid: reply.rpid,
          content: {
            message: reply.content.message
          },
          like: reply.like,
          replyCount: reply.rcount
        })) || []
      };

    } catch (error) {
      console.error(`${this.DEBUG_PREFIX} 获取视频数据失败:`, error);
      return null;
    }
  }

  // 添加 isQualityVideo 方法
  public async isQualityVideo(videoUrl: string): Promise<boolean> {
    try {
      const metrics = await this.getVideoMetrics(videoUrl);
      if (!metrics) return false;

      // 条件1: 点赞率检查
      const likeRatio = metrics.likeCount / metrics.viewCount;
      const passLikeRatio = likeRatio >= 0.03;
      
      console.log(`${this.DEBUG_PREFIX} 点赞率检查:`, {
        likeCount: metrics.likeCount,
        viewCount: metrics.viewCount,
        ratio: likeRatio,
        pass: passLikeRatio
      });

      if (!passLikeRatio) {
        return false;
      }

      // 条件2: 高质量评论数量检查
      const qualityComments = metrics.comments.filter(c => c.replyCount >= 30).length;
      const passCommentQuality = qualityComments >= 10;

      console.log(`${this.DEBUG_PREFIX} 评论质量检查:`, {
        qualityComments,
        threshold: 10,
        pass: passCommentQuality
      });

      return passCommentQuality;

    } catch (error) {
      console.error(`${this.DEBUG_PREFIX} 视频质量检查失败:`, error);
      return false;
    }
  }
} 