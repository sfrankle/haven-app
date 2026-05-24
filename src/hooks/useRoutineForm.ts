import { useState, useCallback } from 'react';
import type { RoutineItemInput, ScheduleableBlock } from '@/lib/db/query-types';

export interface DraftRoutineItem {
  /** Local-only React key */
  key: string;
  name: string;
  entryTypeId: number | null;
  labelIds: number[];
  prescribedDetail: string;
  instructionNote: string;
}

export function makeDraftItem(): DraftRoutineItem {
  return {
    key: Date.now().toString() + Math.random().toString(36).slice(2),
    name: '',
    entryTypeId: null,
    labelIds: [],
    prescribedDetail: '',
    instructionNote: '',
  };
}

export function draftFromRoutineItem(item: {
  id: number;
  name: string;
  entryTypeId: number;
  labelIds: number[];
  prescribedDetail: string | null;
  instructionNote: string | null;
}): DraftRoutineItem {
  return {
    key: String(item.id),
    name: item.name,
    entryTypeId: item.entryTypeId,
    labelIds: item.labelIds,
    prescribedDetail: item.prescribedDetail ?? '',
    instructionNote: item.instructionNote ?? '',
  };
}

export function toRoutineItemInputs(items: DraftRoutineItem[]): RoutineItemInput[] {
  return items
    .filter((item): item is DraftRoutineItem & { entryTypeId: number } => item.entryTypeId !== null)
    .map((item) => ({
      name: item.name.trim(),
      entryTypeId: item.entryTypeId,
      labelIds: item.labelIds.length ? item.labelIds : undefined,
      prescribedDetail: item.prescribedDetail.trim() || null,
      instructionNote: item.instructionNote.trim() || null,
    }));
}

export interface UseRoutineFormResult {
  name: string;
  setName: (v: string) => void;
  selectedBlocks: Set<ScheduleableBlock>;
  setSelectedBlocks: React.Dispatch<React.SetStateAction<Set<ScheduleableBlock>>>;
  toggleBlock: (block: ScheduleableBlock) => void;
  associatedFocusId: number | undefined;
  setAssociatedFocusId: (id: number | undefined) => void;
  frequencyNote: string;
  setFrequencyNote: (v: string) => void;
  items: DraftRoutineItem[];
  setItems: React.Dispatch<React.SetStateAction<DraftRoutineItem[]>>;
  addItem: () => void;
  removeItem: (key: string) => void;
  moveItem: (index: number, direction: 'up' | 'down') => void;
  updateItem: (key: string, patch: Partial<DraftRoutineItem>) => void;
  canSave: boolean;
}

export function useRoutineForm(): UseRoutineFormResult {
  const [name, setName] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<Set<ScheduleableBlock>>(new Set());
  const [associatedFocusId, setAssociatedFocusId] = useState<number | undefined>(undefined);
  const [frequencyNote, setFrequencyNote] = useState('');
  const [items, setItems] = useState<DraftRoutineItem[]>([]);

  const toggleBlock = useCallback((block: ScheduleableBlock) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(block)) {
        next.delete(block);
      } else {
        next.add(block);
      }
      return next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, makeDraftItem()]);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }, []);

  const updateItem = useCallback((key: string, patch: Partial<DraftRoutineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }, []);

  const trimmedName = name.trim();
  const allItemsValid = items.every(
    (item) => item.name.trim().length > 0 && item.entryTypeId !== null
  );
  const canSave = trimmedName.length > 0 && allItemsValid;

  return {
    name,
    setName,
    selectedBlocks,
    setSelectedBlocks,
    toggleBlock,
    associatedFocusId,
    setAssociatedFocusId,
    frequencyNote,
    setFrequencyNote,
    items,
    setItems,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    canSave,
  };
}
