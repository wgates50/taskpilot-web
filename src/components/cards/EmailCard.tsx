'use client';

export function EmailCard({ data }: { data: Record<string, unknown> }) {
  const from = String(data.from || data.sender || '');
  const subject = String(data.subject || '');
  const snippet = String(data.snippet || data.summary || data.text || '');
  const url = data.url ? String(data.url) : null;
  const urgency = String(data.urgency || data.priority || '');
  const isUrgent = urgency === 'high' || Boolean(data.urgent);

  return (
    <div className={`rounded-xl px-3.5 py-3 border shadow-sm ${isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5 shrink-0">📧</span>
        <div className="flex-1 min-w-0">
          {from && (
            <p className="text-[11px] text-gray-400 truncate">{from}</p>
          )}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
              <p className="text-[13px] font-semibold text-gray-900 hover:text-blue-700 leading-snug">{subject}</p>
            </a>
          ) : (
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{subject}</p>
          )}
          {snippet && (
            <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{snippet}</p>
          )}
          {isUrgent && (
            <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Needs attention
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
