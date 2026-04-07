'use client';

import { useState, useEffect, useRef } from 'react';
import { type TaskMeta } from '@/lib/tasks';
import { EventCard } from './cards/EventCard';
import { ArticleCard } from './cards/ArticleCard';
import { FinanceCard } from './cards/FinanceCard';
import { WeatherCard } from './cards/WeatherCard';
import { CalendarPreviewCard } from './cards/CalendarPreviewCard';
import { JobCard } from './cards/JobCard';
import { EmailCard } from './cards/EmailCard';
import { WeeklyPlannerView } from './WeeklyPlannerView';
import { v4 as uuidv4 } from 'uuid';

interface MessageRow {
  id: string;
  task_id: string;
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  timestamp: string;
  is_from_user: boolean;
}

interface Props {
  task: TaskMeta;
  onBack: () => void;
}

export function ThreadDetail({ task, onBack }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?taskId=${task.id}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (e) {
        console.error('Failed to fetch messages:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [task.id]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMsg: MessageRow = {
      id: uuidv4(),
      task_id: task.id,
      blocks: [{ type: 'text', data: { text } }],
      timestamp: new Date().toISOString(),
      is_from_user: true,
    };

    // Optimistic update
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    // Persist
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newMsg.id,
          taskId: task.id,
          blocks: newMsg.blocks,
          timestamp: newMsg.timestamp,
          isFromUser: true,
        }),
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const sendQuickReply = (text: string) => sendMessage(text);

  // Format time for message bubbles
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const getDateLabel = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  let lastDateLabel = '';

  // Use calendar grid layout for weekly planner
  if (task.id === 'weekly-planner') {
    return <WeeklyPlannerView task={task} onBack={onBack} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shrink-0">
        <button onClick={onBack} className="text-blue-600 text-lg font-medium">
          &larr;
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 truncate">{task.name}</span>
          <p className="text-[11px] text-gray-400 mt-0.5">{task.schedule}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No messages yet. This task will post here on its next run.
          </div>
        ) : (
          messages.map((msg) => {
            const dateLabel = getDateLabel(msg.timestamp);
            const showDate = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-gray-400 bg-white/80 px-3 py-0.5 rounded-full">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <div className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] ${msg.is_from_user ? '' : ''}`}>
                    {msg.blocks.map((block, i) => (
                      <MessageBlockRenderer key={i} block={block} isUser={msg.is_from_user} />
                    ))}
                    <p className={`text-[10px] mt-0.5 ${msg.is_from_user ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick replies */}
      {task.quickReplies.length > 0 && (
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0 bg-white/80">
          {task.quickReplies.map(reply => (
            <button
              key={reply}
              onClick={() => sendQuickReply(reply)}
              className="px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-full whitespace-nowrap hover:bg-blue-100 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2 pb-6 border-t bg-white shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Reply..."
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-30 shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Strip emoji characters from strings so section headers never show emoji
function stripEmojis(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2300}-\u{27BF}]|\uFE0F/gu, '').trim();
}

function MessageBlockRenderer({ block, isUser }: {
  block: { type: string; data: Record<string, unknown> };
  isUser: boolean;
}) {
  if (isUser && block.type === 'text') {
    return (
      <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-[14px]">
        {String(block.data.text)}
      </div>
    );
  }

  switch (block.type) {
    case 'text':
      return (
        <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2 text-[14px] text-gray-800 shadow-sm">
          {String(block.data.text)}
        </div>
      );
    case 'header':
      return (
        <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm">
          <p className="text-[15px] font-semibold text-gray-900">{String(block.data.text)}</p>
        </div>
      );
    case 'weather_card':
      return <WeatherCard data={block.data} />;
    case 'event_card':
      return <EventCard data={block.data} />;
    case 'article_card':
      return <ArticleCard data={block.data} />;
    case 'finance_card':
      return <FinanceCard data={block.data} />;
    case 'calendar_preview':
      return <CalendarPreviewCard data={block.data} />;
    case 'job_card':
      return <JobCard data={block.data} />;
    case 'email_card':
      return <EmailCard data={block.data} />;
    case 'section_header':
      return (
        <div className="pt-3 pb-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            {stripEmojis(String(block.data.text))}
          </p>
        </div>
      );
    default:
      return (
        <div className="bg-white rounded-2xl px-3.5 py-2 text-[13px] text-gray-600 shadow-sm">
          {JSON.stringify(block.data)}
        </div>
      );
  }
}
