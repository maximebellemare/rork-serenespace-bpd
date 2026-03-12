import { MOCK_POSTS, MOCK_REPLIES } from '@/constants/community';
import {
  CommunityPost,
  PostReply,
  NewPostInput,
  NewReplyInput,
  PostCategory,
} from '@/types/community';

let posts = [...MOCK_POSTS];
let replies: Record<string, PostReply[]> = JSON.parse(JSON.stringify(MOCK_REPLIES));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPosts(category?: PostCategory | null, search?: string): Promise<CommunityPost[]> {
  await delay(300);
  let filtered = [...posts];

  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (search && search.trim().length > 0) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  return filtered;
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  await delay(200);
  return posts.find((p) => p.id === postId) ?? null;
}

export async function fetchReplies(postId: string): Promise<PostReply[]> {
  await delay(250);
  return replies[postId] ?? [];
}

export async function createPost(input: NewPostInput): Promise<CommunityPost> {
  await delay(400);
  const newPost: CommunityPost = {
    id: `p_${Date.now()}`,
    title: input.title,
    body: input.body,
    category: input.category,
    author: {
      id: 'current_user',
      displayName: input.isAnonymous ? 'Anonymous' : 'You',
      isAnonymous: input.isAnonymous,
    },
    createdAt: Date.now(),
    isPinned: false,
    hasContentWarning: input.hasContentWarning,
    contentWarningText: input.contentWarningText,
    replyCount: 0,
    reactions: [
      { type: 'heart', count: 0, userReacted: false },
      { type: 'hug', count: 0, userReacted: false },
      { type: 'relate', count: 0, userReacted: false },
    ],
  };
  posts = [newPost, ...posts];
  console.log('[CommunityService] Created post:', newPost.id);
  return newPost;
}

export async function createReply(input: NewReplyInput): Promise<PostReply> {
  await delay(350);
  const newReply: PostReply = {
    id: `r_${Date.now()}`,
    postId: input.postId,
    body: input.body,
    author: {
      id: 'current_user',
      displayName: input.isAnonymous ? 'Anonymous' : 'You',
      isAnonymous: input.isAnonymous,
    },
    createdAt: Date.now(),
    reactions: [{ type: 'heart', count: 0, userReacted: false }],
  };

  if (!replies[input.postId]) {
    replies[input.postId] = [];
  }
  replies[input.postId].push(newReply);

  const post = posts.find((p) => p.id === input.postId);
  if (post) {
    post.replyCount += 1;
  }

  console.log('[CommunityService] Created reply:', newReply.id, 'for post:', input.postId);
  return newReply;
}

export async function toggleReaction(
  postId: string,
  reactionType: string,
  replyId?: string
): Promise<void> {
  await delay(150);

  if (replyId) {
    const postReplies = replies[postId];
    if (postReplies) {
      const reply = postReplies.find((r) => r.id === replyId);
      if (reply) {
        const reaction = reply.reactions.find((r) => r.type === reactionType);
        if (reaction) {
          reaction.userReacted = !reaction.userReacted;
          reaction.count += reaction.userReacted ? 1 : -1;
        }
      }
    }
  } else {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      const reaction = post.reactions.find((r) => r.type === reactionType);
      if (reaction) {
        reaction.userReacted = !reaction.userReacted;
        reaction.count += reaction.userReacted ? 1 : -1;
      }
    }
  }
  console.log('[CommunityService] Toggled reaction:', reactionType, 'on post:', postId);
}
