'use client';

interface DayDetailed {
  label?: string;
  day?: string;
  events: Array<{ title: string; time?: string }> | number;
  energy?: string;
  freeEvening?: boolean;
  suggestion?: string;
}

export function CalendarPreviewCard({ data }: { data: Record<string, unknown> }) {
  const topEnergy = String(data.energy || '');
  const days = (data.days as DayDetailed[]) || [];

  const energyColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    packed: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    balanced: 'bg-green-100 text-green-700',
    low: 'bg-green-100 text-green-700',
    'wide open': 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-white rounded-2xl px-3.5 py-3 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-semibold text-gray-900">Week Preview</span>
        {topEnergy && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${energyColors[topEnergy.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
            {topEnergy}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {days.map((day, i) => {
          const label = day.label || day.day || `Day ${i + 1}`;
          const isCountFormat = typeof day.events === 'number';
          const eventCount = isCountFormat ? (day.events as number) : (day.events as Array<unknown>)?.length || 0;
          const dayEnergy = day.energy || '';

          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-gray-700 w-10">{label}</span>

              {isCountFormat ? (
                <>
                  {/* Compact bar format */}
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min((eventCount / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 w-6 text-right">{eventCount}</span>
                  {dayEnergy && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${energyColors[dayEnergy.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                      {dayEnergy}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex-1">
                  {(day.events as Array<{ title: string; time?: string }>).map((ev, j) => (
                    <p key={j} className="text-[11px] text-gray-500">
                      {ev.time ? `${ev.time} \u2014 ` : ''}{ev.title}
                    </p>
                  ))}
                  {day.freeEvening && (
                    <p className="text-[11px] text-green-600">Free evening</p>
                  )}
                  {day.suggestion && (
                    <p className="text-[11px] text-violet-600 italic">{day.suggestion}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
