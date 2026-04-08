'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface SavedItem {
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

interface SavedItemsContextValue {
  items: SavedItem[];
  /** Check if a title+venue combo is already saved */
  isSaved: (title: string, venue?: string) => boolean;
  /** Get the saved item ID for a title+venue combo */
  getSavedId: (title: string, venue?: string) => string | null;
  /** Save an event — returns the saved item */
  saveItem: (data: Record<string, unknown>) => Promise<SavedItem | null>;
  /** Unsave by ID */
  unsaveItem: (id: string) => Promise<boolean>;
  /** Refresh the list from the API */
  refresh: () => Promise<void>;
  loading: boolean;
}

const SavedItemsContext = createContext<SavedItemsContextValue | null>(null);

export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/saved');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch saved items:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (title: string, venue?: string) => {
      return items.some(
        (item) => item.title === title && (item.venue || null) === (venue || null)
      );
    },
    [items]
  );

  const getSavedId = useCallback(
    (title: string, venue?: string) => {
      const found = items.find(
        (item) => item.title === title && (item.venue || null) === (venue || null)
      );
      return found?.id || null;
    },
    [items]
  );

  const saveItem = useCallback(
    async (data: Record<string, unknown>): Promise<SavedItem | null> => {
      try {
        const res = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const { item } = await res.json();
          setItems((prev) => {
            // Avoid duplicates
            if (prev.some((p) => p.id === item.id)) return prev;
            return [item, ...prev];
          });
          return item as SavedItem;
        }
      } catch (e) {
        console.error('Failed to save item:', e);
      }
      return null;
    },
    []
  );

  const unsaveItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      }
    } catch (e) {
      console.error('Failed to unsave item:', e);
    }
    return false;
  }, []);

  return (
    <SavedItemsContext.Provider value={{ items, isSaved, getSavedId, saveItem, unsaveItem, refresh, loading }}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const ctx = useContext(SavedItemsContext);
  if (!ctx) throw new Error('useSavedItems must be used within SavedItemsProvider');
  return ctx;
}
