'use client';

import { useState, useEffect } from 'react';

type ProfileTab = 'interests' | 'venues' | 'evidence';

interface Interest {
  name: string;
  confidence: number;
  evidence: string;
}

interface Venue {
  name: string;
  type: string;
  frequency: string;
}

interface EvidenceEntry {
  id: number;
  task_id: string;
  type: string;
  detail: string;
  logged_at: string;
  flagged: boolean;
}

export function ProfileScreen() {
  const [tab, setTab] = useState<ProfileTab>('interests');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, evidenceRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/profile/evidence?limit=30'),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
        }
        if (evidenceRes.ok) {
          const data = await evidenceRes.json();
          setEvidence(data.log || []);
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const interests = (profile?.interests as Interest[]) || [];
  const venues = (profile?.venues as Venue[]) || [];

  const updateInterestConfidence = async (name: string, newConf: number) => {
    if (!profile) return;
    const updated = interests.map(i =>
      i.name === name ? { ...i, confidence: newConf } : i
    );
    const newProfile = { ...profile, interests: updated };
    setProfile(newProfile);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: newProfile }),
      });
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 pt-4 pb-3 sticky top-0 z-10 bg-white">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Your taste profile — shared across all tasks
        </p>

        {/* Tabs */}
        <div className="flex mt-3 bg-gray-100 rounded-lg p-0.5">
          {(['interests', 'venues', 'evidence'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors capitalize ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'evidence' ? 'Evidence Log' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'interests' && (
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-gray-400">
              Tap stars to adjust confidence. Tasks use these rankings for recommendations.
            </p>
            {interests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No interests yet. They&apos;ll appear as tasks learn your preferences.
              </p>
            ) : (
              interests.map(interest => (
                <div key={interest.name} className="border-b border-gray-50 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-gray-800">{interest.name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => updateInterestConfidence(interest.name, n)}
                          className="text-lg leading-none"
                        >
                          {n <= interest.confidence ? '\u2B50' : '\u2606'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {interest.evidence && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{interest.evidence}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'venues' && (
          <div className="mt-3 space-y-2">
            {venues.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No venues yet. They&apos;ll appear as the Activity Suggester tracks your visits.
              </p>
            ) : (
              venues.map(v => (
                <div key={v.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{v.name}</p>
                    <p className="text-[11px] text-gray-400">{v.type}</p>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {v.frequency === 'weekly' ? 'Weekly regular'
                      : v.frequency === 'monthly' ? 'Monthly visit'
                      : v.frequency === 'occasional' ? 'Occasional'
                      : v.frequency || 'Saved'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'evidence' && (
          <div className="mt-3 space-y-2">
            {evidence.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No evidence logged yet. Tasks will record learnings about your preferences here.
              </p>
            ) : (
              evidence.map(entry => (
                <div key={entry.id} className="border-l-2 border-blue-200 pl-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span>{new Date(entry.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span>&middot;</span>
                    <span className="font-medium text-blue-500">{entry.task_id}</span>
                  </div>
                  <p className="text-[12px] text-gray-700 mt-0.5">{entry.detail}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
