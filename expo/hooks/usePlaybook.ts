import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { generatePlaybook, getQuickAccessPlaybook } from '@/services/playbook/playbookEngine';
import type { PlaybookReport, PlaybookQuickAccess } from '@/types/playbook';

export function usePlaybook(): PlaybookReport {
  const { journalEntries, messageDrafts } = useApp();

  return useMemo(
    () => generatePlaybook(journalEntries, messageDrafts),
    [journalEntries, messageDrafts],
  );
}

export function usePlaybookQuickAccess(currentDistress: number): PlaybookQuickAccess {
  const { journalEntries, messageDrafts } = useApp();

  return useMemo(
    () => getQuickAccessPlaybook(journalEntries, messageDrafts, currentDistress),
    [journalEntries, messageDrafts, currentDistress],
  );
}
