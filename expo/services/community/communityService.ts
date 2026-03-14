import { communityRepository } from '@/services/repositories';
import {
  CommunityPost,
  PostReply,
  NewPostInput,
  NewReplyInput,
  PostCategory,
  ReportInput,
  BlockedUser,
  SupportCircle,
  CirclePost,
  CommunityChallenge,
  ChallengeProgress,
} from '@/types/community';
import {
  MOCK_CHALLENGES,
  MOCK_CHALLENGE_PROGRESS,
  MOCK_CIRCLE_POSTS,
} from '@/constants/community';

export async function fetchPosts(category?: PostCategory | null, search?: string): Promise<CommunityPost[]> {
  return communityRepository.getPosts(category, search);
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  return communityRepository.getPost(postId);
}

export async function fetchReplies(postId: string): Promise<PostReply[]> {
  return communityRepository.getReplies(postId);
}

export async function createPost(input: NewPostInput): Promise<CommunityPost> {
  return communityRepository.createPost(input);
}

export async function createReply(input: NewReplyInput): Promise<PostReply> {
  return communityRepository.createReply(input);
}

export async function toggleReaction(
  postId: string,
  reactionType: string,
  replyId?: string
): Promise<void> {
  return communityRepository.toggleReaction(postId, reactionType, replyId);
}

export async function reportContent(input: ReportInput): Promise<void> {
  return communityRepository.reportContent(input);
}

export async function blockUser(userId: string): Promise<void> {
  return communityRepository.blockUser(userId);
}

export async function unblockUser(userId: string): Promise<void> {
  return communityRepository.unblockUser(userId);
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return communityRepository.getBlockedUsers();
}

export async function fetchCircles(): Promise<SupportCircle[]> {
  return communityRepository.getCircles();
}

export async function joinCircle(circleId: string): Promise<void> {
  return communityRepository.joinCircle(circleId);
}

export async function leaveCircle(circleId: string): Promise<void> {
  return communityRepository.leaveCircle(circleId);
}

let challenges = [...MOCK_CHALLENGES];
let challengeProgress: Record<string, ChallengeProgress[]> = JSON.parse(JSON.stringify(MOCK_CHALLENGE_PROGRESS));
let circlePosts: Record<string, CirclePost[]> = JSON.parse(JSON.stringify(MOCK_CIRCLE_POSTS));

export async function fetchChallenges(): Promise<CommunityChallenge[]> {
  await new Promise((r) => setTimeout(r, 200));
  console.log('[CommunityService] Fetched', challenges.length, 'challenges');
  return [...challenges];
}

export async function joinChallenge(challengeId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  const challenge = challenges.find((c) => c.id === challengeId);
  if (challenge) {
    challenge.isJoined = true;
    challenge.participantCount += 1;
    if (!challengeProgress[challengeId]) {
      challengeProgress[challengeId] = [];
    }
    challengeProgress[challengeId].push({
      challengeId,
      userId: 'current_user',
      displayName: 'You',
      completedDays: 0,
      totalDays: challenge.durationDays,
      lastCheckedIn: 0,
      isCurrentUser: true,
    });
  }
  console.log('[CommunityService] Joined challenge:', challengeId);
}

export async function leaveChallenge(challengeId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  const challenge = challenges.find((c) => c.id === challengeId);
  if (challenge) {
    challenge.isJoined = false;
    challenge.participantCount = Math.max(0, challenge.participantCount - 1);
    if (challengeProgress[challengeId]) {
      challengeProgress[challengeId] = challengeProgress[challengeId].filter((p) => !p.isCurrentUser);
    }
  }
  console.log('[CommunityService] Left challenge:', challengeId);
}

export async function checkInChallenge(challengeId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  const progress = challengeProgress[challengeId];
  if (progress) {
    const userProgress = progress.find((p) => p.isCurrentUser);
    if (userProgress) {
      userProgress.completedDays += 1;
      userProgress.lastCheckedIn = Date.now();
    }
  }
  console.log('[CommunityService] Checked in challenge:', challengeId);
}

export async function fetchChallengeProgress(challengeId: string): Promise<ChallengeProgress[]> {
  await new Promise((r) => setTimeout(r, 150));
  return challengeProgress[challengeId] ?? [];
}

export async function fetchCirclePosts(circleId: string): Promise<CirclePost[]> {
  await new Promise((r) => setTimeout(r, 250));
  const posts = circlePosts[circleId] ?? [];
  console.log('[CommunityService] Fetched', posts.length, 'circle posts for', circleId);
  return posts;
}

export async function createCirclePost(circleId: string, title: string, body: string, type: CirclePost['type']): Promise<CirclePost> {
  await new Promise((r) => setTimeout(r, 300));
  const newPost: CirclePost = {
    id: `cp_${Date.now()}`,
    circleId,
    title,
    body,
    author: { id: 'current_user', displayName: 'You', isAnonymous: false },
    createdAt: Date.now(),
    replyCount: 0,
    reactions: [{ type: 'heart', count: 0, userReacted: false }],
    supportReactions: [
      { type: 'understand', count: 0, userReacted: false },
      { type: 'experienced', count: 0, userReacted: false },
      { type: 'sending-support', count: 0, userReacted: false },
      { type: 'helped-me', count: 0, userReacted: false },
    ],
    type,
  };
  if (!circlePosts[circleId]) {
    circlePosts[circleId] = [];
  }
  circlePosts[circleId] = [newPost, ...circlePosts[circleId]];
  console.log('[CommunityService] Created circle post:', newPost.id);
  return newPost;
}
