'use client';

export function FinanceCard({ data }: { data: Record<string, unknown> }) {
  const period = String(data.period || '');
  const totalSpend = Number(data.totalSpend || 0);
  const changePct = Number(data.changePct || 0);
  const balance = Number(data.balance || 0);
  const categories = (data.topCategories as Array<{ name: string; amount: number }>) || (data.categories as Array<{ name: string; amount: number }>) || [];
  const anomalies = (data.anomalies as string[]) || [];

  const maxCat = Math.max(...categories.map(c => c.amount), 1);
  const catColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

  return (
    <div className="bg-white rounded-2xl px-3.5 py-3 shadow-sm border border-gray-100">
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{period}</p>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[22px] font-bold text-gray-900">
          &pound;{totalSpend.toFixed(0)}
        </span>
        <span className={`text-[13px] font-medium ${changePct > 0 ? 'text-red-500' : 'text-green-500'}`}>
          {changePct > 0 ? '+' : ''}{changePct.toFixed(0)}%
        </span>
      </div>

      {/* Category bars */}
      <div className="mt-3 space-y-1.5">
        {categories.map((cat, i) => (
          <div key={cat.name} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-20 truncate">{cat.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(cat.amount / maxCat) * 100}%`,
                  backgroundColor: catColors[i % catColors.length],
                }}
              />
            </div>
            <span className="text-[11px] text-gray-600 w-12 text-right">&pound;{cat.amount.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
              <span>&#x26A0;&#xFE0F;</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Balance */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[12px] text-gray-500">Current balance</span>
        <span className="text-[15px] font-semibold text-gray-900">&pound;{balance.toLocaleString()}</span>
      </div>
    </div>
  );
}
