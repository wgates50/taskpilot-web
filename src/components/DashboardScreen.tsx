'use client';

import { useState } from 'react';
import { TASKS, TASK_GROUPS, type TaskMeta } from '@/lib/tasks';

type View = 'list' | 'relationships';

export function DashboardScreen() {
  const [view, setView] = useState<View>('list');

  const groups = ['calendar', 'reading', 'finance', 'career'] as const;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 pt-4 pb-3 sticky top-0 z-10 bg-white">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Dashboard</h1>

        {/* Health bar */}
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[12px] text-gray-500">All {TASKS.length} tasks healthy</span>
        </div>

        {/* View toggle */}
        <div className="flex mt-3 bg-gray-100 rounded-lg p-0.5">
          {(['list', 'relationships'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {v === 'list' ? 'Task List' : 'Relationships'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {view === 'list' ? (
          <div className="space-y-4 mt-3">
            {groups.map(groupId => {
              const group = TASK_GROUPS[groupId];
              const tasks = TASKS.filter(t => t.group === groupId);
              return (
                <div key={groupId}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-[13px] font-semibold text-gray-700">{group.name}</span>
                    <span className="text-[11px] text-gray-400">{tasks.length} tasks</span>
                  </div>
                  {tasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <RelationshipView />
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskMeta }) {
  return (
    <div className="flex items-center gap-3 py-2.5 pl-5 border-b border-gray-50">
      <span className="text-lg">{task.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-gray-800">{task.name}</span>
          {task.tier === 'background' && (
            <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-gray-100 text-gray-400">BG</span>
          )}
        </div>
        <p className="text-[11px] text-gray-400">{task.schedule}</p>
      </div>
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
    </div>
  );
}

function RelationshipView() {
  const pipelines = [
    {
      name: 'Calendar Pipeline',
      color: '#3B82F6',
      flow: [
        { tasks: ['email-to-calendar', 'weekly-london-event-scanner', 'london-openings-scanner'], label: 'Data Collection' },
        { tasks: ['morning-brief', 'activity-suggester', 'weekly-planner'], label: 'Delivery' },
      ],
    },
    {
      name: 'Reading Pipeline',
      color: '#8B5CF6',
      flow: [
        { tasks: ['smart-reading-digest'], label: 'Digest' },
      ],
    },
    {
      name: 'Finance Pipeline',
      color: '#10B981',
      flow: [
        { tasks: ['finance-tracker'], label: 'Weekly' },
        { tasks: ['monthly-life-admin'], label: 'Monthly' },
      ],
    },
  ];

  const taskMap = Object.fromEntries(TASKS.map(t => [t.id, t]));

  return (
    <div className="space-y-4 mt-3">
      {pipelines.map(pipe => (
        <div key={pipe.name} className="rounded-xl border-2 p-3" style={{ borderColor: `${pipe.color}30` }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: pipe.color }}>{pipe.name}</p>
          <div className="flex items-center gap-2 overflow-x-auto">
            {pipe.flow.map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-gray-50 rounded-lg p-2 min-w-[120px]">
                  <p className="text-[10px] text-gray-400 font-medium mb-1">{stage.label}</p>
                  {stage.tasks.map(id => {
                    const t = taskMap[id];
                    return t ? (
                      <p key={id} className="text-[11px] text-gray-700">{t.icon} {t.name}</p>
                    ) : null;
                  })}
                </div>
                {i < pipe.flow.length - 1 && (
                  <span className="text-gray-300 text-lg shrink-0">&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Shared resource */}
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 mt-4">
        <p className="text-[13px] font-semibold text-gray-600 mb-1">Shared: Taste Profile</p>
        <p className="text-[11px] text-gray-400">
          Used by Morning Brief, Activity Suggester, Reading Digest, Event Scanner, and Weekly Planner to personalise recommendations.
        </p>
      </div>
    </div>
  );
}
