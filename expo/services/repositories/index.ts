import { storageService } from '@/services/storage/storageService';
import { LocalJournalRepository } from './journalRepository';
import { LocalMessageRepository } from './messageRepository';
import { LocalConversationRepository } from './conversationRepository';
import { LocalProfileRepository } from './profileRepository';
import { LocalLearnRepository } from './learnRepository';
import { LocalCommunityRepository } from './communityRepository';
import { LocalAuthRepository } from './authRepository';
import { LocalCheckInRepository } from './checkInRepository';
import { LocalMemoryRepository } from './memoryRepository';
import { LocalAnalyticsRepository } from './analyticsRepository';
import {
  IJournalRepository,
  IMessageRepository,
  IConversationRepository,
  IProfileRepository,
  ILearnRepository,
  ICommunityRepository,
  IAuthRepository,
  ICheckInRepository,
  IMemoryRepository,
  IAnalyticsRepository,
} from './types';

export const journalRepository: IJournalRepository = new LocalJournalRepository(storageService);
export const messageRepository: IMessageRepository = new LocalMessageRepository(storageService);
export const conversationRepository: IConversationRepository = new LocalConversationRepository(storageService);
export const profileRepository: IProfileRepository = new LocalProfileRepository(storageService);
export const learnRepository: ILearnRepository = new LocalLearnRepository(storageService);
export const communityRepository: ICommunityRepository = new LocalCommunityRepository();
export const authRepository: IAuthRepository = new LocalAuthRepository(storageService);
export const checkInRepository: ICheckInRepository = new LocalCheckInRepository(storageService);
export const memoryRepository: IMemoryRepository = new LocalMemoryRepository(storageService);
export const analyticsRepository: IAnalyticsRepository = new LocalAnalyticsRepository();

export type {
  IJournalRepository,
  IMessageRepository,
  IConversationRepository,
  IProfileRepository,
  ILearnRepository,
  ICommunityRepository,
  IAuthRepository,
  ICheckInRepository,
  IMemoryRepository,
  IAnalyticsRepository,
} from './types';
