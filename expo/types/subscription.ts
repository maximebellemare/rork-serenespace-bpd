export type SubscriptionTier = 'free' | 'premium';

export type SubscriptionPeriod = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  period: SubscriptionPeriod;
  price: number;
  priceLabel: string;
  savings?: string;
  popular?: boolean;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  plan: SubscriptionPlan | null;
  expiresAt: number | null;
  startedAt: number | null;
  trialEndsAt: number | null;
  isTrialActive: boolean;
}

export type PremiumFeature =
  | 'unlimited_ai'
  | 'predictive_insights'
  | 'therapy_plan'
  | 'relationship_analysis'
  | 'ai_summaries'
  | 'advanced_progress'
  | 'emotional_simulator'
  | 'weekly_reflection'
  | 'therapist_report'
  | 'relationship_copilot'
  | 'emotional_profile'
  | 'emotional_timeline'
  | 'reflection_mirror'
  | 'long_term_memory';

export interface PremiumFeatureInfo {
  id: PremiumFeature;
  title: string;
  description: string;
  icon: string;
}

export const PREMIUM_FEATURES: PremiumFeatureInfo[] = [
  {
    id: 'unlimited_ai',
    title: 'Unlimited AI Companion',
    description: 'No daily conversation limits with your personal AI support',
    icon: 'sparkles',
  },
  {
    id: 'weekly_reflection',
    title: 'Weekly Reflections',
    description: 'Thoughtful summaries of your emotional week',
    icon: 'file-text',
  },
  {
    id: 'relationship_copilot',
    title: 'Relationship Copilot',
    description: 'Guided support during relationship-triggered distress',
    icon: 'heart',
  },
  {
    id: 'predictive_insights',
    title: 'Predictive Insights',
    description: 'Early detection of emotional patterns before they escalate',
    icon: 'eye',
  },
  {
    id: 'therapist_report',
    title: 'Therapist Reports',
    description: 'Structured summaries to bring into therapy sessions',
    icon: 'clipboard',
  },
  {
    id: 'advanced_progress',
    title: 'Advanced Progress Dashboard',
    description: 'Detailed metrics, trends, and growth tracking',
    icon: 'trending-up',
  },
  {
    id: 'emotional_profile',
    title: 'Emotional Pattern Intelligence',
    description: 'Deep understanding of your triggers, chains, and coping',
    icon: 'brain',
  },
  {
    id: 'therapy_plan',
    title: 'Adaptive Therapy Plans',
    description: 'Personalized weekly plans that evolve with you',
    icon: 'calendar',
  },
  {
    id: 'emotional_simulator',
    title: 'Response Simulator',
    description: 'Explore different ways to respond before acting',
    icon: 'git-branch',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    period: 'monthly',
    price: 9.99,
    priceLabel: '$9.99/mo',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    period: 'yearly',
    price: 59.99,
    priceLabel: '$59.99/yr',
    savings: 'Save 50%',
    popular: true,
  },
];

export const FREE_DAILY_AI_LIMIT = 5;
