'use client';

export function JobCard({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title || data.role || '');
  const company = String(data.company || '');
  const location = String(data.location || '');
  const salary = data.salary ? String(data.salary) : null;
  const url = data.url ? String(data.url) : null;
  const tags = (data.tags as string[]) || [];
  const reason = data.reason ? String(data.reason) : null;
  const source = data.source ? String(data.source) : null;

  return (
    <div className="bg-white rounded-2xl px-3.5 py-3 shadow-sm border border-gray-100">
      {tags.length > 0 && (
        <div className="flex gap-1 mb-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-[14px] font-semibold text-gray-900">{title}</p>
      <p className="text-[12px] text-gray-500 mt-0.5">{company}</p>
      <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-0.5">
        {location && <span>{location}</span>}
        {salary && <><span>&middot;</span><span className="text-green-600 font-medium">{salary}</span></>}
        {source && <><span>&middot;</span><span>{source}</span></>}
      </div>

      {reason && (
        <p className="text-[11px] text-blue-600 mt-1.5 italic">{reason}</p>
      )}

      {url && (
        <div className="mt-2.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-3 py-1.5 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            View Listing
          </a>
        </div>
      )}
    </div>
  );
}
