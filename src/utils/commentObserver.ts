import { CommentAnalyzer } from './commentAnalyzer';
import { CommentFilter } from './commentFilter';

export class CommentObserver {
  private observer: MutationObserver;
  private commentAnalyzer: CommentAnalyzer;
  private commentFilter: CommentFilter;
  private observingElements: Set<Element> = new Set();

  constructor(filter: CommentFilter, analyzer: CommentAnalyzer) {
    this.commentFilter = filter;
    this.commentAnalyzer = analyzer;
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }

  public startObserving(targetNode: Element): void {
    if (this.observingElements.has(targetNode)) return;
    
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
    
    this.observingElements.add(targetNode);
    
    // 处理已存在的评论
    const comments = targetNode.querySelectorAll('.reply-item');
    comments.forEach(comment => {
      if (comment instanceof HTMLElement) {
        this.updateCommentQuality(comment);
      }
    });
  }

  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && this.isCommentElement(node)) {
          this.updateCommentQuality(node);
        }
      });
    });
  }

  private updateCommentQuality(commentElement: HTMLElement): void {
    const metrics = this.commentAnalyzer.analyzeComment(commentElement);
    const qualityScore = this.commentAnalyzer.calculateQualityScore(metrics);
    
    // 使用 filter 判断是否显示评论
    if (!this.commentFilter.shouldShowComment(metrics, qualityScore)) {
      commentElement.style.display = 'none';
    }
    
    // 添加质量分数属性
    commentElement.setAttribute('data-quality-score', qualityScore.toString());
  }

  private isCommentElement(element: HTMLElement): boolean {
    return element.classList.contains('reply-item');
  }

  public stopObserving(): void {
    this.observer.disconnect();
    this.observingElements.clear();
  }
} 