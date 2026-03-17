import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface MissionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  sort_order: number;
  status: string;
  requirement: string;
}

interface IslandDetail {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const typeIcons: Record<string, string> = {
  info: '📖', task: '✅', quiz: '🧠', communication: '💬',
};
const typeLabels: Record<string, string> = {
  info: '정보', task: '실무', quiz: '퀴즈', communication: '대화',
};
const typeColors: Record<string, { bg: string; color: string }> = {
  info: { bg: '#3B82F6', color: '#fff' },
  task: { bg: '#22C55E', color: '#303030' },
  quiz: { bg: '#FACC15', color: '#303030' },
  communication: { bg: '#EF4444', color: '#fff' },
};

export default function IslandPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [island, setIsland] = useState<IslandDetail | null>(null);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ island: IslandDetail; missions: MissionItem[] }>(`/islands/${id}/missions`)
      .then(data => { setIsland(data.island); setMissions(data.missions); })
      .finally(() => setLoading(false));
  }, [id]);

  const completed = missions.filter(m => m.status === 'completed').length;
  const progress = missions.length > 0 ? Math.round((completed / missions.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 55%, #228B22 100%)' }}>
        <div style={{ fontSize: 24, animation: 'float 2s ease-in-out infinite' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 55%, #228B22 100%)',
      padding: '0 0 80px',
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(255,255,255,0.95)', borderBottom: '3px solid #484848',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 0 #181818', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => navigate('/world')} style={{
          fontFamily: "'DotGothic16', monospace", fontSize: 13,
          padding: '6px 14px', border: '2px solid #484848', borderRadius: 6,
          background: '#F8F8F8', color: '#484848', cursor: 'pointer',
          boxShadow: '1px 1px 0 #181818',
        }}>← 월드맵</button>

        <span style={{ fontSize: 28 }}>{island?.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, color: '#303030', fontWeight: 'bold' }}>{island?.name}</div>
          <div style={{ fontSize: 11, color: '#A0A0A0' }}>{island?.description}</div>
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#484848', marginBottom: 2 }}>{completed}/{missions.length} 완료</div>
          <div style={{
            width: 120, height: 12, background: '#D1D5DB',
            border: '2px solid #484848', borderRadius: 6, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #22C55E, #BBF7D0)',
              width: `${progress}%`, transition: 'width 600ms ease',
            }} />
          </div>
        </div>
      </div>

      {/* Quest list */}
      <div style={{ maxWidth: 640, margin: '32px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {missions.map((mission) => {
            const tc = typeColors[mission.type] || typeColors.info;
            const isDone = mission.status === 'completed';
            const isActive = mission.status === 'in_progress';

            return (
              <div
                key={mission.id}
                onClick={() => navigate(`/missions/${mission.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  border: isDone ? '3px solid #22C55E' : isActive ? '3px solid #3B82F6' : '3px solid #484848',
                  borderRadius: 12,
                  boxShadow: isDone
                    ? '0 0 0 3px #16A34A, 4px 4px 0 #A0A0A0'
                    : '0 0 0 3px #181818, 4px 4px 0 #A0A0A0',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'transform var(--tr-fast)',
                  opacity: isDone ? 0.75 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Mission icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 8,
                  border: '2px solid #484848', background: '#D1D5DB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0,
                }}>
                  {isDone ? '⭐' : typeIcons[mission.type] || '📋'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {/* Type badge */}
                    <span style={{
                      fontSize: 11, padding: '1px 8px', borderRadius: 4,
                      background: tc.bg, color: tc.color,
                      fontWeight: 'bold', letterSpacing: 1,
                    }}>{typeLabels[mission.type]}</span>

                    {mission.requirement === 'required' && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: '#EF4444', color: '#fff',
                      }}>필수</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 15, color: '#303030', fontWeight: 'bold',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>{mission.title}</div>
                </div>

                {/* Status indicator */}
                <div style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 20,
                  border: '2px solid #484848',
                  background: isDone ? '#22C55E' : isActive ? '#3B82F6' : '#F8F8F8',
                  color: isDone || isActive ? '#fff' : '#484848',
                  fontWeight: 'bold', flexShrink: 0,
                }}>
                  {isDone ? '완료' : isActive ? '진행중' : '미시작'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
