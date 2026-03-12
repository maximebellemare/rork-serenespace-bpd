export type PostCategory =
  | 'relationships'
  | 'daily-struggles'
  | 'success-stories'
  | 'coping-skills'
  | 'questions'
  | 'therapy-dbt'
  | 'venting';

export interface PostAuthor {
  id: string;
  displayName: string;
  isAnonymous: boolean;
}

export interface SupportiveReaction {
  type: 'heart' | 'hug' | 'strength' | 'seen' | 'relate';
  count: number;
  userReacted: boolean;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  author: PostAuthor;
  createdAt: number;
  isPinned: boolean;
  hasContentWarning: boolean;
  contentWarningText?: string;
  replyCount: number;
  reactions: SupportiveReaction[];
}

export interface PostReply {
  id: string;
  postId: string;
  body: string;
  author: PostAuthor;
  createdAt: number;
  reactions: SupportiveReaction[];
}

export interface NewPostInput {
  title: string;
  body: string;
  category: PostCategory;
  isAnonymous: boolean;
  hasContentWarning: boolean;
  contentWarningText?: string;
}

export interface NewReplyInput {
  postId: string;
  body: string;
  isAnonymous: boolean;
}

export type ReportReason =
  | 'harmful'
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'other';

export interface ReportInput {
  targetId: string;
  targetType: 'post' | 'reply';
  reason: ReportReason;
  details?: string;
}

export interface CategoryInfo {
  id: PostCategory;
  label: string;
  emoji: string;
  color: string;
}

export interface BlockedUser {
  userId: string;
  blockedAt: number;
}
