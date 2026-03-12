import { storageService } from '@/services/storage/storageService';
import {
  RelationshipProfile,
  RelationshipEvent,
  RelationshipType,
} from '@/types/relationship';

const PROFILES_KEY = 'steady_relationship_profiles';
const EVENTS_KEY = 'steady_relationship_events';

export async function getRelationshipProfiles(): Promise<RelationshipProfile[]> {
  const data = await storageService.get<RelationshipProfile[]>(PROFILES_KEY);
  console.log('[RelationshipService] Loaded', data?.length ?? 0, 'profiles');
  return data ?? [];
}

export async function saveRelationshipProfiles(profiles: RelationshipProfile[]): Promise<void> {
  await storageService.set(PROFILES_KEY, profiles);
  console.log('[RelationshipService] Saved', profiles.length, 'profiles');
}

export async function addRelationshipProfile(
  name: string,
  relationshipType: RelationshipType,
  notes?: string,
): Promise<RelationshipProfile> {
  const profiles = await getRelationshipProfiles();
  const now = Date.now();
  const newProfile: RelationshipProfile = {
    id: `rel_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    relationshipType,
    createdAt: now,
    updatedAt: now,
    emotionalTriggers: [],
    communicationPatterns: [],
    conflictPatterns: [],
    positiveInteractions: [],
    notes: notes ?? '',
  };
  const updated = [newProfile, ...profiles];
  await saveRelationshipProfiles(updated);
  console.log('[RelationshipService] Added profile:', newProfile.id, name);
  return newProfile;
}

export async function updateRelationshipProfile(
  id: string,
  updates: Partial<Omit<RelationshipProfile, 'id' | 'createdAt'>>,
): Promise<RelationshipProfile[]> {
  const profiles = await getRelationshipProfiles();
  const updated = profiles.map(p =>
    p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
  );
  await saveRelationshipProfiles(updated);
  console.log('[RelationshipService] Updated profile:', id);
  return updated;
}

export async function deleteRelationshipProfile(id: string): Promise<RelationshipProfile[]> {
  const profiles = await getRelationshipProfiles();
  const updated = profiles.filter(p => p.id !== id);
  await saveRelationshipProfiles(updated);

  const events = await getRelationshipEvents();
  const filteredEvents = events.filter(e => e.profileId !== id);
  await saveRelationshipEvents(filteredEvents);

  console.log('[RelationshipService] Deleted profile:', id);
  return updated;
}

export async function getRelationshipEvents(): Promise<RelationshipEvent[]> {
  const data = await storageService.get<RelationshipEvent[]>(EVENTS_KEY);
  console.log('[RelationshipService] Loaded', data?.length ?? 0, 'events');
  return data ?? [];
}

export async function saveRelationshipEvents(events: RelationshipEvent[]): Promise<void> {
  await storageService.set(EVENTS_KEY, events);
  console.log('[RelationshipService] Saved', events.length, 'events');
}

export async function addRelationshipEvent(event: Omit<RelationshipEvent, 'id'>): Promise<RelationshipEvent> {
  const events = await getRelationshipEvents();
  const newEvent: RelationshipEvent = {
    ...event,
    id: `revt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  const updated = [newEvent, ...events];
  await saveRelationshipEvents(updated);
  console.log('[RelationshipService] Added event for profile:', event.profileId, event.type);
  return newEvent;
}

export async function getEventsForProfile(profileId: string): Promise<RelationshipEvent[]> {
  const events = await getRelationshipEvents();
  return events
    .filter(e => e.profileId === profileId)
    .sort((a, b) => b.timestamp - a.timestamp);
}
