import { CategoryInfo, CommunityPost, PostReply } from '@/types/community';
import Colors from '@/constants/colors';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'relationships', label: 'Relationships', emoji: '💛', color: '#E8A87C' },
  { id: 'daily-struggles', label: 'Daily Struggles', emoji: '🌧', color: '#95A5A6' },
  { id: 'success-stories', label: 'Success Stories', emoji: '🌟', color: '#00B894' },
  { id: 'coping-skills', label: 'Coping Skills', emoji: '🧘', color: Colors.primary },
  { id: 'questions', label: 'Questions', emoji: '💭', color: '#6C5CE7' },
  { id: 'therapy-dbt', label: 'Therapy / DBT', emoji: '📖', color: '#0984E3' },
  { id: 'venting', label: 'Venting', emoji: '🔥', color: Colors.accent },
];

export const REACTION_LABELS: Record<string, { emoji: string; label: string }> = {
  heart: { emoji: '💛', label: 'Love' },
  hug: { emoji: '🤗', label: 'Hug' },
  strength: { emoji: '💪', label: 'Strength' },
  seen: { emoji: '👁', label: 'Seen' },
  relate: { emoji: '🤝', label: 'Relate' },
};

const now = Date.now();
const hour = 3600000;
const day = 86400000;

export const MOCK_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    title: 'Learning to pause before I text back changed everything',
    body: 'I used to send walls of text the moment I felt abandoned. My therapist suggested waiting even 2 minutes before responding. At first it felt impossible — like the urgency would eat me alive. But after a few weeks of practicing, I noticed something: most of the time, what I wanted to say after waiting was completely different from my first impulse. The pause gave my wise mind a chance to show up. If you struggle with impulsive texting, try starting with just 30 seconds. It gets easier.',
    category: 'coping-skills',
    author: { id: 'u1', displayName: 'healing_slowly', isAnonymous: false },
    createdAt: now - 2 * hour,
    isPinned: true,
    hasContentWarning: false,
    replyCount: 14,
    reactions: [
      { type: 'heart', count: 42, userReacted: false },
      { type: 'relate', count: 31, userReacted: true },
      { type: 'strength', count: 18, userReacted: false },
    ],
  },
  {
    id: 'p2',
    title: 'Does anyone else feel like they become a different person in every relationship?',
    body: 'I realized I mirror whoever I am close to. With my ex I was adventurous and spontaneous. With my current partner I am quiet and reserved. I do not know who I actually am outside of other people. My therapist says this is related to identity disturbance but knowing the label does not make it less scary. I just want to feel like a real consistent person.',
    category: 'relationships',
    author: { id: 'u2', displayName: 'Anonymous', isAnonymous: true },
    createdAt: now - 5 * hour,
    isPinned: false,
    hasContentWarning: false,
    replyCount: 23,
    reactions: [
      { type: 'relate', count: 67, userReacted: false },
      { type: 'hug', count: 29, userReacted: false },
      { type: 'seen', count: 44, userReacted: false },
    ],
  },
  {
    id: 'p3',
    title: 'I went a whole week without splitting on my partner',
    body: 'This might not sound like much to most people but for me this is huge. Usually by day 3 I have already idealized and devalued them at least once. This week I caught myself starting to split twice and used opposite action both times. I am really proud of myself and wanted to share with people who would understand.',
    category: 'success-stories',
    author: { id: 'u3', displayName: 'brave_steps', isAnonymous: false },
    createdAt: now - 8 * hour,
    isPinned: true,
    hasContentWarning: false,
    replyCount: 31,
    reactions: [
      { type: 'heart', count: 89, userReacted: true },
      { type: 'strength', count: 56, userReacted: false },
      { type: 'hug', count: 34, userReacted: false },
    ],
  },
  {
    id: 'p4',
    title: 'DBT interpersonal effectiveness — what actually works for you?',
    body: 'I have been learning DEAR MAN in my DBT group and I understand it intellectually but when I am actually in a conversation with someone I care about, it all goes out the window. The emotional intensity just takes over. What specific techniques have helped you actually use these skills in real time? Looking for practical tips not just theory.',
    category: 'therapy-dbt',
    author: { id: 'u4', displayName: 'dbt_journey', isAnonymous: false },
    createdAt: now - 12 * hour,
    isPinned: false,
    hasContentWarning: false,
    replyCount: 19,
    reactions: [
      { type: 'relate', count: 38, userReacted: false },
      { type: 'heart', count: 15, userReacted: false },
    ],
  },
  {
    id: 'p5',
    title: 'Having a really hard day and just need to be heard',
    body: 'Everything feels too much today. I woke up already feeling like I was going to cry and I have no idea why. My favorite person has not texted me back in 6 hours and I know logically they are probably busy but my brain keeps telling me they hate me and are going to leave. I used the grounding exercise in this app which helped a little. Just needed to write this somewhere safe.',
    category: 'venting',
    author: { id: 'u5', displayName: 'Anonymous', isAnonymous: true },
    createdAt: now - 1 * day,
    isPinned: false,
    hasContentWarning: false,
    replyCount: 27,
    reactions: [
      { type: 'hug', count: 53, userReacted: false },
      { type: 'seen', count: 41, userReacted: false },
      { type: 'heart', count: 22, userReacted: false },
    ],
  },
  {
    id: 'p6',
    title: 'How do you explain BPD to people who do not have it?',
    body: 'I am tired of people thinking BPD means I am manipulative or dramatic. I want to help the people in my life understand what I go through but every time I try to explain it I either shut down or overshare. Has anyone found a good way to have this conversation? Maybe a resource or analogy that helped?',
    category: 'questions',
    author: { id: 'u6', displayName: 'open_heart', isAnonymous: false },
    createdAt: now - 1.5 * day,
    isPinned: false,
    hasContentWarning: false,
    replyCount: 35,
    reactions: [
      { type: 'relate', count: 72, userReacted: false },
      { type: 'heart', count: 28, userReacted: false },
      { type: 'strength', count: 19, userReacted: false },
    ],
  },
  {
    id: 'p7',
    title: 'Grocery shopping felt like climbing a mountain today',
    body: 'The sensory overload was real. Bright lights, loud music, too many people. I almost left my cart and walked out. But I stayed. I used the 5-4-3-2-1 grounding technique right there in the cereal aisle and finished my shopping. Small victory but I am counting it.',
    category: 'daily-struggles',
    author: { id: 'u7', displayName: 'one_day', isAnonymous: false },
    createdAt: now - 2 * day,
    isPinned: false,
    hasContentWarning: false,
    replyCount: 18,
    reactions: [
      { type: 'strength', count: 45, userReacted: false },
      { type: 'heart', count: 33, userReacted: false },
      { type: 'hug', count: 12, userReacted: false },
    ],
  },
];

export const MOCK_REPLIES: Record<string, PostReply[]> = {
  p1: [
    {
      id: 'r1',
      postId: 'p1',
      body: 'This resonates so much. The pause tool in this app has genuinely helped me. Even 30 seconds makes a difference when your emotions are at a 10.',
      author: { id: 'u8', displayName: 'gentle_mind', isAnonymous: false },
      createdAt: now - 1 * hour,
      reactions: [{ type: 'heart', count: 8, userReacted: false }],
    },
    {
      id: 'r2',
      postId: 'p1',
      body: 'I needed to hear this today. I almost sent a really intense message to my ex this morning and managed to wait. The message I eventually sent was so much more grounded. Thank you for sharing.',
      author: { id: 'u9', displayName: 'Anonymous', isAnonymous: true },
      createdAt: now - 30 * 60000,
      reactions: [
        { type: 'hug', count: 5, userReacted: false },
        { type: 'relate', count: 11, userReacted: false },
      ],
    },
  ],
  p3: [
    {
      id: 'r3',
      postId: 'p3',
      body: 'This IS huge! Do not minimize it. Catching yourself mid-split is one of the hardest things to do. You should be so proud. 💛',
      author: { id: 'u10', displayName: 'recovery_road', isAnonymous: false },
      createdAt: now - 6 * hour,
      reactions: [{ type: 'heart', count: 22, userReacted: false }],
    },
  ],
  p5: [
    {
      id: 'r4',
      postId: 'p5',
      body: 'You are heard. The waiting for a text back spiral is so painful. Your feelings are valid even when your brain is lying to you about what the silence means. Sending you a big hug.',
      author: { id: 'u11', displayName: 'safe_space', isAnonymous: false },
      createdAt: now - 20 * hour,
      reactions: [
        { type: 'hug', count: 16, userReacted: false },
        { type: 'heart', count: 9, userReacted: false },
      ],
    },
    {
      id: 'r5',
      postId: 'p5',
      body: 'I feel this in my bones. The "no reason" sadness days are the worst because you cannot even problem-solve your way out. Just know you are not alone in this.',
      author: { id: 'u12', displayName: 'Anonymous', isAnonymous: true },
      createdAt: now - 18 * hour,
      reactions: [{ type: 'relate', count: 14, userReacted: false }],
    },
  ],
};

export const REPORT_REASONS = [
  { id: 'harmful' as const, label: 'Harmful or unsafe content', emoji: '⚠️' },
  { id: 'spam' as const, label: 'Spam or self-promotion', emoji: '🚫' },
  { id: 'harassment' as const, label: 'Harassment or bullying', emoji: '🛑' },
  { id: 'misinformation' as const, label: 'Dangerous misinformation', emoji: '❌' },
  { id: 'other' as const, label: 'Other concern', emoji: '💬' },
];

export const COMMUNITY_GUIDELINES = [
  {
    title: 'Be kind and supportive',
    description: 'This is a space for mutual support. Treat everyone with compassion, even when you disagree. Remember that everyone here is navigating something difficult.',
  },
  {
    title: 'Respect anonymity',
    description: 'Never try to identify anonymous posters. Everyone deserves the safety of sharing without fear of being recognized.',
  },
  {
    title: 'No diagnosis or medical advice',
    description: 'Share your experiences, not prescriptions. We are peers, not professionals. Encourage others to work with their care team.',
  },
  {
    title: 'Use content warnings',
    description: 'If your post discusses self-harm, substance use, or other potentially triggering topics, please toggle the content warning when posting.',
  },
  {
    title: 'No judgment or stigma',
    description: 'Do not use stigmatizing language about BPD or any mental health condition. We are here to support, not to label.',
  },
  {
    title: 'Protect your boundaries',
    description: 'You do not owe anyone your story. Share only what feels safe. It is okay to step back from a conversation at any time.',
  },
  {
    title: 'Report harmful content',
    description: 'If you see content that feels unsafe, harmful, or violates these guidelines, please report it. We take community safety seriously.',
  },
  {
    title: 'No self-promotion or spam',
    description: 'This is a peer support space, not a marketplace. Keep conversations focused on genuine support and shared experience.',
  },
];
