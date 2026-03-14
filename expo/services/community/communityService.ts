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
} from '@/types/community';

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
