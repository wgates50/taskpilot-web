'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────────

interface SavedItem {
  id: string;
  title: string;
  venue: string | null;
  date: string | null;
  time: string | null;
  price: string | null;
  category: string | null;
  tags: string[];
  url: string | null;
  map_url: string | null;
  booking_url: string | null;
  image_url: string | null;
  reason: string | null;
  source_task_id: string | null;
  saved_at: string;
}

interface SaveItemInput {
  title: string;
  venue?: string | null;
  date?: string | null;
  time?: string | null;
  price?: string | null;
  category?: string | null;
  tags?: string[];
  url?: string | null;
  map_url?: string | null;
  booking_url?: string | null;
  image_url?: string | null;
  reason?: string | null;
  source_task_id?: string | null;
}

interface SavedItemsContextType {
  savedItems: SavedItem[];
  isSaved: (title: string, venue?: string) => boolean;
  getSavedId: (title: string, venue?: string) => string | null;
  saveItem: (item: SaveItemInput) => Promise<void>;
  unsaveItem: (id: string) => Promise<void>;
}

// ── Context ──────────────────────────────────────────────

const SavedItemsContext = createContext<SavedItemsContextType>({
  savedItems: [],
  isSaved: () => false,
  getSavedId: () => null,
  saveItem: async () => {},
  unsaveItem: async () => {},
});

export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    fetch('/api/saved')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setSavedItems(data.items || []))
      .catch(() => {});
  }, []);

  const isSaved = useCallback(
    (title: string, venue?: string): boolean => {
      return savedItems.some(
        s => s.title === title && (venue ? s.venue === venue : true)
      );
    },
    [savedItems]
  );

  const getSavedId = useCallback(
    (title: string, venue?: string): string | null => {
      const item = savedItems.find(
        s => s.title === title && (venue ? s.venue === venue : true)
      );
      return item?.id ?? null;
    },
    [savedItems]
  );

  const saveItem = useCallback(async (item: SaveItemInput) => {
    const newItem: SavedItem = {
      id: uuidv4(),
      title: item.title,
      venue: item.venue ?? null,
      date: item.date ?? null,
      time: item.time ?? null,
      price: item.price ?? null,
      category: item.category ?? null,
      tags: item.tags ?? [],
      url: item.url ?? null,
      map_url: item.map_url ?? null,
      booking_url: item.booking_url ?? null,
      image_url: item.image_url ?? null,
      reason: item.reason ?? null,
      source_task_id: item.source_task_id ?? null,
      saved_at: new Date().toISOString(),
    };
    // Optimistic update
    setSavedItems(prev => [newItem, ...prev]);
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setSavedItems(prev => prev.map(s => s.id === newItem.id ? data.item : s));
        }
      }
    } catch (e) {
      console.error('Failed to save item:', e);
    }
  }, []);

  const unsaveItem = useCallback(async (id: string) => {
    // Optimistic update
    setSavedItems(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`/api/saved/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to unsave item:', e);
    }
  }, []);

  return (
    <SavedItemsContext.Provider value={{ savedItems, isSaved, getSavedId, saveItem, unsaveItem }}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  return useContext(SavedItemsContext);
}
