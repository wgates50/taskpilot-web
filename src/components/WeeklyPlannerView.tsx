'use client';

// WeeklyPlannerView — renders weekly-planner task messages as a structured view
// rather than plain chat bubbles. Passed messages + loading from ThreadDetail.

interface Block {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MessageRow {
  id: string;
  task_id: string;
  blocks: Block[];
  timestamp: string;
  is_from_user: boolean;
}

interface DayPlan {
  label: string;
  events?: { title: string; time?: string }[];
  suggestions?: string[];
  freeEvening?: boolean;
  note?: string;
}

function getText(data: Record<string, unknown>): string {
  return String(data.text ?? data.content ?? data.title ?? '');
}

function DayBlock({ day }: { day: DayPlan }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-0">
      <p className="text-[12px] font-semibold text-gray-700 mb-1">{day.label}</p>
      {day.events && day.events.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {day.events.map((ev, j) => (
            <p key={j} className="text-[12px] text-gray-600">
              {ev.time && <span className="text-gray-400 mr-1.5">{ev.time}</span>}
              {ev.title}
            </p>
          ))}
        </div>
      )}
      {day.suggestions && day.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {day.suggestions.map((s, j) => (
            <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{s}</span>
          ))}
        </div>
      )}
      {!day.events?.length && !day.suggestions?.length && (
        <p className="text-[12px] text-gray-400">{day.freeEvening ? 'Free evening' : 'Nothing scheduled'}</p>
      )}
    </div>
  );
}

function renderBlock(block: Block, i: number) {
  const data = (block.data as Record<string, unknown>) || (block as Record<string, unknown>);

  switch (block.type) {
    case 'header':
      return (
        <div key={i} className="px-4 pt-3 pb-1">
          <p className="text-[15px] font-semibold text-gray-900">{getText(data)}</p>
        </div>
      );
    case 'section_header':
      return (
        <div key={i} className="flex items-center gap-2 px-4 py-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{getText(data)}</p>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
      );
    case 'day_plan': {
      const day = data as unknown as DayPlan;
      return <DayBlock key={i} day={day} />;
    }
    case 'text':
      return (
        <div key={i} className="px-4 py-2">
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">{getText(data)}</p>
        </div>
      );
    default:
      return null;
  }
}

export function WeeklyPlannerView({ messages, loading }: { messages: MessageRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading weekly plan…
      </div>
    );
  }

  const taskMessages = messages.filter(m => !m.is_from_user);
  const latest = taskMessages[taskMessages.length - 1];

  if (!latest) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No weekly plan yet — runs Sundays at 2 PM.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mx-4 my-3 overflow-hidden">
        {latest.blocks.map((block, i) => renderBlock(block, i))}
      </div>
      <p className="text-center text-[10px] text-gray-400 pb-4">
        {new Date(latest.timestamp).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
      </p>
    </div>
  );
}
