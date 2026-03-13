import { RewardState, DEFAULT_REWARD_STATE } from '@/types/reward';
import { IStorageService } from '@/services/storage/storageService';

const REWARD_KEY = 'bpd_rewards';

export interface IRewardRepository {
  getState(): Promise<RewardState>;
  saveState(state: RewardState): Promise<void>;
}

export class LocalRewardRepository implements IRewardRepository {
  constructor(private storage: IStorageService) {}

  async getState(): Promise<RewardState> {
    const data = await this.storage.get<RewardState>(REWARD_KEY);
    console.log('[RewardRepository] Loaded state:', data?.unlockedMilestones?.length ?? 0, 'milestones');
    return data ?? { ...DEFAULT_REWARD_STATE };
  }

  async saveState(state: RewardState): Promise<void> {
    await this.storage.set(REWARD_KEY, state);
    console.log('[RewardRepository] Saved state:', state.unlockedMilestones.length, 'milestones');
  }
}
