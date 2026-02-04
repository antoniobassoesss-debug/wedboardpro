/**
 * useGuestAssignment Hook
 *
 * Manages guest-to-chair assignments in the layout:
 * - Fetches and caches guest data for the current event
 * - Assigns/unassigns guests to chairs
 * - Swaps guests between chairs
 * - Tracks assignment statistics
 * - Reads/writes assignment data from chair elements in canvasStore
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useCanvasStore, type Shape } from '../store/canvasStore';
import type { Guest, GuestAssignment, AllergyType } from '../types/guests';
import type { DietaryType } from '../types/elements';
import { fetchGuests as fetchGuestsApi, type WeddingGuest, type DietaryRestriction } from '../../client/api/weddingGuestsApi';

/**
 * Map dietary restrictions from API to the DietaryType used in the layout
 */
function mapDietaryType(restrictions: DietaryRestriction[]): DietaryType {
  if (restrictions.includes('vegan')) return 'vegan';
  if (restrictions.includes('vegetarian')) return 'vegetarian';
  if (restrictions.includes('halal')) return 'halal';
  if (restrictions.includes('kosher')) return 'kosher';
  return 'regular';
}

/**
 * Map dietary restrictions to allergy flags
 */
function mapAllergies(restrictions: DietaryRestriction[]): AllergyType[] {
  const allergies: AllergyType[] = [];
  if (restrictions.includes('gluten_free')) allergies.push('gluten');
  if (restrictions.includes('dairy_free')) allergies.push('dairy');
  if (restrictions.includes('nut_allergy')) allergies.push('nuts');
  return allergies;
}

/**
 * Map RSVP status from API to internal format
 */
function mapRsvpStatus(status: 'pending' | 'yes' | 'no'): 'confirmed' | 'pending' | 'declined' {
  switch (status) {
    case 'yes': return 'confirmed';
    case 'no': return 'declined';
    default: return 'pending';
  }
}

/**
 * Parse guest name into first and last name
 */
function parseGuestName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Convert WeddingGuest from API to Guest type used by layout
 */
function mapWeddingGuestToGuest(wg: WeddingGuest): Guest {
  const { firstName, lastName } = parseGuestName(wg.guest_name);
  return {
    id: wg.id,
    eventId: wg.event_id,
    firstName,
    lastName,
    email: wg.email || '',
    phone: wg.phone || '',
    rsvpStatus: mapRsvpStatus(wg.rsvp_status),
    plusOne: wg.plus_one_allowed,
    plusOneName: wg.plus_one_name,
    dietaryType: mapDietaryType(wg.dietary_restrictions),
    dietaryNotes: wg.dietary_notes,
    allergies: mapAllergies(wg.dietary_restrictions),
    tablePreferences: [],
    tableAvoidances: [],
    accessibilityNeeds: wg.needs_accessibility ? wg.accessibility_notes : null,
    assignedLayoutId: null,
    assignedChairId: null,
    notes: '',
    tags: wg.guest_group ? [wg.guest_group] : [],
    createdAt: wg.created_at,
    updatedAt: wg.updated_at,
  };
}

interface UseGuestAssignmentReturn {
  guests: Guest[];
  unassignedGuests: Guest[];
  assignedGuests: Guest[];
  isLoading: boolean;
  error: string | null;

  assignGuest: (guestId: string, chairId: string) => void;
  unassignGuest: (chairId: string) => void;
  swapGuests: (chairId1: string, chairId2: string) => void;
  reassignGuest: (guestId: string, newChairId: string) => void;

  getGuestForChair: (chairId: string) => Guest | null;
  getChairForGuest: (guestId: string) => string | null;

  getGuestAssignment: (chairId: string) => GuestAssignment | null;
  getAssignmentsForTable: (tableId: string) => GuestAssignment[];

  totalSeats: number;
  assignedCount: number;
  unassignedCount: number;
  occupancyRate: number;

  refreshGuests: () => void;
  clearAssignments: () => void;
}

export function useGuestAssignment(eventId?: string): UseGuestAssignmentReturn {
  // Get store state and actions
  const elements = useCanvasStore((state) => state.elements);
  const elementOrder = useCanvasStore((state) => state.elementOrder);
  const updateElement = useCanvasStore((state) => state.updateElement);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    console.log('[useGuestAssignment] fetchGuests called, eventId:', eventId);

    if (!eventId) {
      console.log('[useGuestAssignment] No eventId, skipping fetch');
      setGuests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useGuestAssignment] Fetching guests for event:', eventId);
      const result = await fetchGuestsApi(eventId, { limit: 1000 });
      console.log('[useGuestAssignment] API result:', result);

      if (result.error) {
        console.error('[useGuestAssignment] API error:', result.error);
        setError(result.error);
        setGuests([]);
      } else if (result.data) {
        console.log('[useGuestAssignment] Got guests:', result.data.guests.length);
        const mappedGuests = result.data.guests.map(mapWeddingGuestToGuest);
        setGuests(mappedGuests);
      }
    } catch (err: any) {
      console.error('[useGuestAssignment] Exception:', err);
      setError(err?.message || 'Failed to load guests');
      setGuests([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // Get all chair elements and their assignments from the store
  const chairElements = useMemo(() => {
    return elementOrder
      .map((id) => elements[id])
      .filter((el): el is Shape => !!el && !!el.chairData);
  }, [elements, elementOrder]);

  // Build a map of chairId -> guestId from chair elements
  const assignmentMap = useMemo((): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const chair of chairElements) {
      if (chair.chairData?.assignedGuestId) {
        map[chair.id] = chair.chairData.assignedGuestId;
      }
    }
    return map;
  }, [chairElements]);

  const getGuestForChair = useCallback((chairId: string): Guest | null => {
    const guestId = assignmentMap[chairId];
    if (!guestId) return null;
    return guests.find(g => g.id === guestId) || null;
  }, [guests, assignmentMap]);

  const getChairForGuest = useCallback((guestId: string): string | null => {
    const chairId = Object.keys(assignmentMap).find(
      key => assignmentMap[key] === guestId
    );
    return chairId || null;
  }, [assignmentMap]);

  const getGuestAssignment = useCallback((chairId: string): GuestAssignment | null => {
    const chair = elements[chairId];
    if (!chair?.chairData?.assignedGuestId) return null;

    const guest = guests.find(g => g.id === chair.chairData!.assignedGuestId);
    if (!guest) return null;

    return {
      chairId,
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      dietaryType: guest.dietaryType,
      allergyFlags: guest.allergies,
      assignedAt: new Date().toISOString(),
      assignedBy: 'current-user',
    };
  }, [elements, guests]);

  const getAssignmentsForTable = useCallback((tableId: string): GuestAssignment[] => {
    const tableAssignments: GuestAssignment[] = [];

    for (const chair of chairElements) {
      if (chair.chairData?.parentTableId === tableId && chair.chairData?.assignedGuestId) {
        const guest = guests.find(g => g.id === chair.chairData!.assignedGuestId);
        if (guest) {
          tableAssignments.push({
            chairId: chair.id,
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            dietaryType: guest.dietaryType,
            allergyFlags: guest.allergies,
            assignedAt: new Date().toISOString(),
            assignedBy: 'current-user',
          });
        }
      }
    }

    return tableAssignments;
  }, [chairElements, guests]);

  // Get guests that are not assigned to any chair (confirmed or pending, not declined)
  const unassignedGuests = useMemo(() => {
    const assignedGuestIds = new Set(Object.values(assignmentMap));
    return guests.filter(guest => {
      // Don't show guests who declined
      if (guest.rsvpStatus === 'declined') return false;
      return !assignedGuestIds.has(guest.id);
    });
  }, [guests, assignmentMap]);

  // Get guests that are assigned to chairs
  const assignedGuests = useMemo(() => {
    const assignedGuestIds = new Set(Object.values(assignmentMap));
    return guests.filter(guest => assignedGuestIds.has(guest.id));
  }, [guests, assignmentMap]);

  const totalSeats = chairElements.length;
  const assignedCount = Object.keys(assignmentMap).length;
  const unassignedCount = totalSeats - assignedCount;
  const occupancyRate = totalSeats > 0 ? (assignedCount / totalSeats) * 100 : 0;

  const assignGuest = useCallback((guestId: string, chairId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
      console.error('Guest not found:', guestId);
      return;
    }

    // If guest is already assigned elsewhere, unassign from old chair first
    const existingChairId = getChairForGuest(guestId);
    if (existingChairId && existingChairId !== chairId) {
      updateElement(existingChairId, {
        chairData: {
          ...elements[existingChairId]?.chairData,
          parentTableId: elements[existingChairId]?.chairData?.parentTableId || '',
          seatIndex: elements[existingChairId]?.chairData?.seatIndex || 0,
          assignedGuestId: null,
          assignedGuestName: null,
          dietaryType: null,
        },
      } as any);
    }

    // Assign guest to the new chair
    const chair = elements[chairId];
    if (!chair?.chairData) {
      console.error('Chair not found or no chairData:', chairId);
      return;
    }

    updateElement(chairId, {
      chairData: {
        ...chair.chairData,
        assignedGuestId: guest.id,
        assignedGuestName: `${guest.firstName} ${guest.lastName}`,
        dietaryType: guest.dietaryType,
      },
    } as any);

    console.log('[useGuestAssignment] Assigned guest', guest.firstName, 'to chair', chairId);
  }, [guests, getChairForGuest, elements, updateElement]);

  const unassignGuest = useCallback((chairId: string) => {
    const chair = elements[chairId];
    if (!chair?.chairData) return;

    updateElement(chairId, {
      chairData: {
        ...chair.chairData,
        assignedGuestId: null,
        assignedGuestName: null,
        dietaryType: null,
      },
    } as any);

    console.log('[useGuestAssignment] Unassigned guest from chair', chairId);
  }, [elements, updateElement]);

  const swapGuests = useCallback((chairId1: string, chairId2: string) => {
    const chair1 = elements[chairId1];
    const chair2 = elements[chairId2];

    if (!chair1?.chairData || !chair2?.chairData) return;

    const guest1Id = chair1.chairData.assignedGuestId;
    const guest1Name = chair1.chairData.assignedGuestName;
    const guest1Dietary = chair1.chairData.dietaryType;

    const guest2Id = chair2.chairData.assignedGuestId;
    const guest2Name = chair2.chairData.assignedGuestName;
    const guest2Dietary = chair2.chairData.dietaryType;

    // Swap: put guest2 in chair1
    updateElement(chairId1, {
      chairData: {
        ...chair1.chairData,
        assignedGuestId: guest2Id,
        assignedGuestName: guest2Name,
        dietaryType: guest2Dietary,
      },
    } as any);

    // Swap: put guest1 in chair2
    updateElement(chairId2, {
      chairData: {
        ...chair2.chairData,
        assignedGuestId: guest1Id,
        assignedGuestName: guest1Name,
        dietaryType: guest1Dietary,
      },
    } as any);

    console.log('[useGuestAssignment] Swapped guests between chairs', chairId1, chairId2);
  }, [elements, updateElement]);

  const reassignGuest = useCallback((guestId: string, newChairId: string) => {
    const existingChairId = getChairForGuest(guestId);
    if (existingChairId === newChairId) return;

    if (existingChairId) {
      unassignGuest(existingChairId);
    }
    assignGuest(guestId, newChairId);
  }, [getChairForGuest, assignGuest, unassignGuest]);

  const clearAssignments = useCallback(() => {
    for (const chair of chairElements) {
      if (chair.chairData?.assignedGuestId) {
        updateElement(chair.id, {
          chairData: {
            ...chair.chairData,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        } as any);
      }
    }
    console.log('[useGuestAssignment] Cleared all assignments');
  }, [chairElements, updateElement]);

  return {
    guests,
    unassignedGuests,
    assignedGuests,
    isLoading,
    error,

    assignGuest,
    unassignGuest,
    swapGuests,
    reassignGuest,

    getGuestForChair,
    getChairForGuest,
    getGuestAssignment,
    getAssignmentsForTable,

    totalSeats,
    assignedCount,
    unassignedCount,
    occupancyRate,

    refreshGuests: fetchGuests,
    clearAssignments,
  };
}

export default useGuestAssignment;
