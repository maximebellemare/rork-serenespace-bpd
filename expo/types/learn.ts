export interface LessonSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'callout' | 'takeaway' | 'exercise';
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  readingTime: number;
  sections: LessonSection[];
  relatedToolIds: string[];
  relatedExerciseIds: string[];
  tags: string[];
}

export interface LessonCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessonCount: number;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  lastReadAt: number;
  bookmarked: boolean;
}

export interface LearnState {
  progress: Record<string, LessonProgress>;
  recentlyViewed: string[];
  bookmarkedIds: string[];
}
