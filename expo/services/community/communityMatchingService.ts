import { CommunityPost, PostCategory } from '@/types/community';

export interface MatchingContext {
  recentEmotions?: string[];
  recentCategories?: PostCategory[];
  journalThemes?: string[];
}

const EMOTION_TO_CATEGORY: Record<string, PostCategory[]> = {
  'abandonment anxiety': ['relationships', 'daily-struggles'],
  'rejection': ['relationships', 'daily-struggles'],
  'shame': ['daily-struggles', 'coping-skills'],
  'anger': ['daily-struggles', 'venting'],
  'loneliness': ['relationships', 'daily-check-in'],
  'confusion': ['ask-community', 'questions'],
  'hope': ['progress-wins', 'success-stories'],
  'relief': ['progress-wins', 'success-stories'],
};

export function getRecommendedPosts(
  posts: CommunityPost[],
  context: MatchingContext,
  limit: number = 5
): CommunityPost[] {
  console.log('[CommunityMatching] Getting recommendations with context:', context);

  const scored = posts.map((post) => {
    let score = 0;

    if (context.recentEmotions) {
      for (const emotion of context.recentEmotions) {
        const relatedCategories = EMOTION_TO_CATEGORY[emotion] ?? [];
        if (relatedCategories.includes(post.category)) {
          score += 3;
        }
        if (post.emotions?.includes(emotion)) {
          score += 5;
        }
      }
    }

    if (context.recentCategories?.includes(post.category)) {
      score += 2;
    }

    const totalReactions = post.supportReactions.reduce((sum, r) => sum + r.count, 0);
    score += Math.min(totalReactions / 10, 5);

    if (post.isPinned) score += 1;

    const ageHours = (Date.now() - post.createdAt) / 3600000;
    if (ageHours < 24) score += 2;
    else if (ageHours < 72) score += 1;

    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}

export function getSuggestedTool(post: CommunityPost): { toolId: string; toolName: string } | null {
  if (post.suggestedToolId && post.suggestedToolName) {
    return { toolId: post.suggestedToolId, toolName: post.suggestedToolName };
  }

  const tagToolMap: Record<string, { toolId: string; toolName: string }> = {
    'relationship-conflict': { toolId: 'check-the-facts', toolName: 'Check the Facts' },
    'feeling-rejected': { toolId: 'opposite-action', toolName: 'Opposite Action' },
    'shame-regret': { toolId: 'self-compassion', toolName: 'Self-Compassion' },
    'overwhelmed': { toolId: 'grounding', toolName: 'Grounding Exercise' },
  };

  if (post.situationTag && tagToolMap[post.situationTag]) {
    return tagToolMap[post.situationTag];
  }

  return null;
}
