'use client';

export function WeatherCard({ data }: { data: Record<string, unknown> }) {
  const temp = Number(data.temp || 0);
  const conditions = String(data.conditions || '');
  const high = data.high !== undefined ? Number(data.high) : null;
  const low = data.low !== undefined ? Number(data.low) : null;
  const rainChance = data.rainChance !== undefined ? Number(data.rainChance) : null;
  const icon = String(data.icon || '\u2600\uFE0F');

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl px-3.5 py-3 shadow-sm text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[28px] font-bold">{temp}&deg;C</p>
          <p className="text-[13px] text-blue-100">{conditions}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
      <div className="flex gap-3 mt-2 text-[12px] text-blue-100">
        {high !== null && low !== null && (
          <span>H: {high}&deg; L: {low}&deg;</span>
        )}
        {rainChance !== null && (
          <span>&#x1F327;&#xFE0F; {rainChance}%</span>
        )}
      </div>
    </div>
  );
}
