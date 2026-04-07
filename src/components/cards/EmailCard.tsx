'use client';

import { useState } from 'react';

interface EmailItem {
  sender: string;
  subject: string;
  summary?: string;
  action_label?: string;
  action_url?: string;
  icon?: string;
  priority?: string;
}

export function EmailCard({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as EmailItem[]) || [];
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        if (dismissed.has(i)) return null;
        const isPriority = item.priority === 'high';

        return (
          <div key={i} className={`bg-white rounded-xl px-3.5 py-2.5 shadow-sm border ${
            isPriority ? 'border-amber-200' : 'border-gray-100'
          }`}>
            <div className="flex items-start gap-2.5">
              {isPriority && <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0 mt-2" />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 font-medium">{item.sender}</p>
                <p className="text-[13px] font-medium text-gray-800 leading-snug mt-0.5">{item.subject}</p>
                {item.summary && (
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.summary}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.action_url && item.action_label && (
                  <a
                    href={item.action_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    {item.action_label}
                  </a>
                )}
                <button
                  onClick={() => setDismissed(prev => new Set(prev).add(i))}
                  className="text-[11px] text-gray-300 hover:text-gray-500 p-1"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
