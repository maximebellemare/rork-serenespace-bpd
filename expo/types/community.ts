export type PostCategory =
  | 'relationships'
  | 'daily-struggles'
  | 'success-stories'
  | 'coping-skills'
  | 'questions'
  | 'therapy-dbt'
  | 'venting'
  | 'daily-check-in'
  | 'progress-wins'
  | 'ask-community';

export type SituationTag =
  | 'relationship-conflict'
  | 'feeling-rejected'
  | 'shame-regret'
  | 'overwhelmed'
  | 'daily-check-in'
  | 'celebrating-progress'
  | 'asking-advice';

export type ReplyLabel =
  | 'what-helped-me'
  | 'a-skill-that-worked'
  | 'another-perspective'
  | 'personal-experience';

export type SupportReactionType = 'understand' | 'experienced' | 'sending-support' | 'helped-me';

export interface PostAuthor {
  id: string;
  displayName: string;
  isAnonymous: boolean;
  isTrustedHelper?: boolean;
  helpfulReplyCount?: number;
}

export interface SupportiveReaction {
  type: 'heart' | 'hug' | 'strength' | 'seen' | 'relate';
  count: number;
  userReacted: boolean;
}

export interface SupportReaction {
  type: SupportReactionType;
  count: number;
  userReacted: boolean;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  situationTag?: SituationTag;
  author: PostAuthor;
  createdAt: number;
  isPinned: boolean;
  hasContentWarning: boolean;
  contentWarningText?: string;
  replyCount: number;
  reactions: SupportiveReaction[];
  supportReactions: SupportReaction[];
  emotions?: string[];
  supportType?: string;
  suggestedToolId?: string;
  suggestedToolName?: string;
}

export interface PostReply {
  id: string;
  postId: string;
  body: string;
  author: PostAuthor;
  createdAt: number;
  reactions: SupportiveReaction[];
  supportReactions: SupportReaction[];
  label?: ReplyLabel;
  isHelpful?: boolean;
}

export interface NewPostInput {
  title: string;
  body: string;
  category: PostCategory;
  isAnonymous: boolean;
  hasContentWarning: boolean;
  contentWarningText?: string;
  situationTag?: SituationTag;
  emotions?: string[];
  supportType?: string;
}

export interface NewReplyInput {
  postId: string;
  body: string;
  isAnonymous: boolean;
  label?: ReplyLabel;
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

export interface SupportCircle {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  memberCount: number;
  isJoined: boolean;
  recentActivity: number;
  tags: string[];
}

export interface CirclePost {
  id: string;
  circleId: string;
  title: string;
  body: string;
  author: PostAuthor;
  createdAt: number;
  replyCount: number;
  reactions: SupportiveReaction[];
  supportReactions: SupportReaction[];
}

export interface CommunityGuideline {
  title: string;
  description: string;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: string;
  suggestion?: string;
}

export interface PostSuggestion {
  type: 'context' | 'support-type' | 'clarity';
  message: string;
}

export interface CommunityMatchPreferences {
  interests: PostCategory[];
  emotionalPatterns: string[];
  preferredCircles: string[];
}
