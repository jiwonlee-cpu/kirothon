import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getUser, removeToken } from '../auth';

interface IslandData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  missionCount: number;
  requiredCount: number;
  completedRequiredCount: number;
  completedCount: number;
  isCompleted: boolean;
}

/* ─── Island visual configs: position, terrain shape, decorations ─── */
const islandConfigs = [
  {
    // HR 섬 — 중앙 상단, 큰 메인 섬
    top: '8%', left: '50%', translateX: '-50%',
    width: 220, height: 180,
    terrain: '#5DB075', terrainDark: '#3D8B55', sand: '#F4D58D', sandDark: '#D4A843',
    trees: ['🌳', '🌲', '🏢', '🌳'],
    treePositions: [{ top: 12, left: 20 }, { top: 8, right: 25 }, { bottom: 45, left: 35 }, { top: 20, right: 55 }],
    deco: [{ emoji: '🌸', top: 50, left: 10, size: 14 }, { emoji: '🪨', bottom: 50, right: 15, size: 16 }],
    flagColor: '#22C55E',
  },
  {
    // 머니터링 섬 — 왼쪽 중간
    top: '38%', left: '12%', translateX: '0',
    width: 190, height: 160,
    terrain: '#4A9EDB', terrainDark: '#2E7BB8', sand: '#F4D58D', sandDark: '#D4A843',
    trees: ['📊', '🌴', '💻', '🌴'],
    treePositions: [{ top: 15, left: 25 }, { top: 10, right: 20 }, { bottom: 48, right: 40 }, { bottom: 42, left: 15 }],
    deco: [{ emoji: '🐚', bottom: 48, left: 50, size: 12 }, { emoji: '⚓', bottom: 52, right: 20, size: 14 }],
    flagColor: '#3B82F6',
  },
  {
    // 플랜팃 섬 — 오른쪽 중간
    top: '35%', left: '68%', translateX: '0',
    width: 185, height: 155,
    terrain: '#7BC67E', terrainDark: '#4DA651', sand: '#F4D58D', sandDark: '#D4A843',
    trees: ['🌱', '🌿', '🌻', '🌾'],
    treePositions: [{ top: 12, left: 30 }, { top: 18, right: 22 }, { bottom: 50, left: 20 }, { bottom: 45, right: 35 }],
    deco: [{ emoji: '🦋', top: 5, left: 50, size: 14 }, { emoji: '🍄', bottom: 55, left: 45, size: 13 }],
    flagColor: '#F59E0B',
  },
  {
    // finter 섬 — 하단 중앙
    top: '62%', left: '42%', translateX: '0',
    width: 180, height: 150,
    terrain: '#E07B5D', terrainDark: '#C25A3C', sand: '#F4D58D', sandDark: '#D4A843',
    trees: ['💰', '🏦', '🌴', '🔥'],
    treePositions: [{ top: 14, left: 28 }, { top: 10, right: 30 }, { bottom: 48, left: 18 }, { bottom: 44, right: 22 }],
    deco: [{ emoji: '💎', top: 40, right: 10, size: 14 }, { emoji: '🪙', bottom: 55, left: 35, size: 13 }],
    flagColor: '#EF4444',
  },
];

/* ─── Dotted path between islands ─── */
const paths = [
  { from: { x: 50, y: 22 }, to: { x: 22, y: 45 } },   // HR → 머니터링
  { from: { x: 50, y: 22 }, to: { x: 75, y: 42 } },   // HR → 플랜팃
  { from: { x: 22, y: 50 }, to: { x: 48, y: 68 } },   // 머니터링 → finter
  { from: { x: 75, y: 45 }, to: { x: 52, y: 68 } },   // 플랜팃 → finter
];

export default function WorldMapPage() {
  const navigate = useNavigate();
  const [islands, setIslands] = useState<IslandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const user = getUser();

  useEffect(() => {
    api.get<IslandData[]>('/islands').then(setIslands).finally(() => setLoading(false));
  }, []);

  const totalMissions = islands.reduce((s, i) => s + i.missionCount, 0);
  const totalCompleted = islands.reduce((s, i) => s + i.completedCount, 0);
  const overallProgress = totalMissions > 0 ? Math.round((totalCompleted / totalMissions) * 100) : 0;
  const handleLogout = () => { removeToken(); navigate('/login'); };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1B6CA8' }}>
        <div style={{ fontSize: 24, animation: 'float 2s ease-in-out infinite' }}>🏝️ 월드맵 로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1B6CA8', position: 'relative', overflow: 'hidden' }}>

      {/* ═══ Ocean background with animated waves ═══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Deep ocean gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, #2E8BC0 0%, #1B6CA8 40%, #145A8A 70%, #0D3B66 100%)',
        }} />
        {/* Water sparkles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${10 + Math.random() * 80}%`,
            left: `${Math.random() * 100}%`,
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
          }} />
        ))}
        {/* Wave lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`wave-${i}`} style={{
            position: 'absolute',
            top: `${15 + i * 15}%`,
            left: '-10%', width: '120%', height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,${0.06 + i * 0.01}) 30%, rgba(255,255,255,${0.08 + i * 0.01}) 50%, rgba(255,255,255,${0.06 + i * 0.01}) 70%, transparent 100%)`,
            borderRadius: 2,
            animation: `float ${6 + i}s ease-in-out infinite ${i * 0.8}s`,
          }} />
        ))}
      </div>

      {/* ═══ Clouds ═══ */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 15, left: '3%', fontSize: 52, opacity: 0.5, animation: 'float 6s ease-in-out infinite' }}>☁️</div>
        <div style={{ position: 'absolute', top: 50, right: '8%', fontSize: 40, opacity: 0.35, animation: 'float 8s ease-in-out infinite 2s' }}>☁️</div>
        <div style={{ position: 'absolute', top: 25, left: '55%', fontSize: 32, opacity: 0.3, animation: 'float 7s ease-in-out infinite 1s' }}>☁️</div>
        <div style={{ position: 'absolute', top: 70, left: '25%', fontSize: 28, opacity: 0.25, animation: 'float 9s ease-in-out infinite 3s' }}>☁️</div>
      </div>

      {/* ═══ Top HUD bar ═══ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.95)', borderBottom: '3px solid #484848',
        padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 0 #181818',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            border: '2px solid #484848', background: '#D1D5DB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🧑</div>
          <div>
            <div style={{ fontSize: 13, color: '#303030', fontWeight: 'bold' }}>{user?.name || '탐험가'}</div>
            <div style={{ fontSize: 10, color: '#A0A0A0' }}>온보딩 모험가</div>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: 260, margin: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#484848', marginBottom: 2 }}>
            <span>🗺️ 전체 진행도</span>
            <span>{totalCompleted}/{totalMissions}</span>
          </div>
          <div style={{ width: '100%', height: 12, background: '#D1D5DB', border: '2px solid #484848', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
              width: `${overallProgress}%`,
              transition: 'width 800ms cubic-bezier(0.34,1.56,0.64,1)',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 1, left: 3, right: 3, height: 3, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
            </div>
          </div>
        </div>

        <button onClick={handleLogout} style={{
          fontFamily: "'DotGothic16', monospace", fontSize: 11,
          padding: '5px 12px', border: '2px solid #484848', borderRadius: 6,
          background: '#F8F8F8', color: '#484848', cursor: 'pointer', boxShadow: '1px 1px 0 #181818',
        }}>로그아웃</button>
      </div>

      {/* ═══ MAP AREA ═══ */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: '100%', maxWidth: 900, margin: '0 auto',
        height: 'calc(100vh - 52px)',
        minHeight: 600,
      }}>
        {/* ─── Dotted paths between islands ─── */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          {paths.map((p, i) => (
            <line key={i}
              x1={`${p.from.x}%`} y1={`${p.from.y}%`}
              x2={`${p.to.x}%`} y2={`${p.to.y}%`}
              stroke="rgba(255,255,255,0.35)" strokeWidth="3"
              strokeDasharray="8 8" strokeLinecap="round"
            />
          ))}
          {/* Path endpoint dots */}
          {paths.flatMap((p, i) => [
            <circle key={`s${i}`} cx={`${p.from.x}%`} cy={`${p.from.y}%`} r="4" fill="rgba(255,255,255,0.5)" />,
            <circle key={`e${i}`} cx={`${p.to.x}%`} cy={`${p.to.y}%`} r="4" fill="rgba(255,255,255,0.5)" />,
          ])}
        </svg>

        {/* ─── Floating sea decorations ─── */}
        <div style={{ position: 'absolute', top: '30%', left: '42%', fontSize: 20, opacity: 0.5, animation: 'float 5s ease-in-out infinite 1s', zIndex: 2 }}>🚢</div>
        <div style={{ position: 'absolute', top: '55%', left: '15%', fontSize: 16, opacity: 0.4, animation: 'float 7s ease-in-out infinite 2s', zIndex: 2 }}>🐟</div>
        <div style={{ position: 'absolute', top: '75%', right: '20%', fontSize: 18, opacity: 0.4, animation: 'float 6s ease-in-out infinite', zIndex: 2 }}>🐠</div>
        <div style={{ position: 'absolute', top: '85%', left: '35%', fontSize: 14, opacity: 0.3, animation: 'float 8s ease-in-out infinite 3s', zIndex: 2 }}>🌊</div>
        <div style={{ position: 'absolute', top: '15%', left: '85%', fontSize: 16, opacity: 0.3, animation: 'float 5s ease-in-out infinite 1.5s', zIndex: 2 }}>🦅</div>

        {/* ─── Islands ─── */}
        {islands.map((island, idx) => {
          const cfg = islandConfigs[idx] || islandConfigs[0];
          const progress = island.requiredCount > 0
            ? Math.round((island.completedRequiredCount / island.requiredCount) * 100) : 0;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={island.id}
              onClick={() => navigate(`/islands/${island.id}`)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                position: 'absolute',
                top: cfg.top, left: cfg.left,
                transform: `translateX(${cfg.translateX}) ${isHovered ? 'scale(1.08)' : 'scale(1)'}`,
                cursor: 'pointer',
                zIndex: isHovered ? 15 : 10,
                transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), z-index 0s',
                animation: `float ${4 + idx * 0.7}s ease-in-out infinite ${idx * 0.6}s`,
              }}
            >
              {/* Island terrain */}
              <div style={{
                width: cfg.width, height: cfg.height,
                position: 'relative',
              }}>
                {/* Water shadow / reflection */}
                <div style={{
                  position: 'absolute', bottom: -8, left: '10%', width: '80%', height: 20,
                  background: 'rgba(0,0,0,0.15)', borderRadius: '50%',
                  filter: 'blur(6px)',
                }} />

                {/* Sand beach ring */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '5%', width: '90%', height: '75%',
                  background: `radial-gradient(ellipse at 50% 60%, ${cfg.sand} 0%, ${cfg.sandDark} 100%)`,
                  borderRadius: '45% 55% 50% 50% / 40% 40% 60% 60%',
                  border: `3px solid ${cfg.sandDark}`,
                  boxShadow: `0 0 0 2px rgba(0,0,0,0.2)`,
                }} />

                {/* Green terrain on top */}
                <div style={{
                  position: 'absolute', bottom: '12%', left: '10%', width: '80%', height: '70%',
                  background: `radial-gradient(ellipse at 45% 40%, ${cfg.terrain} 0%, ${cfg.terrainDark} 100%)`,
                  borderRadius: '42% 58% 45% 55% / 45% 50% 50% 55%',
                  border: `3px solid ${cfg.terrainDark}`,
                  boxShadow: `inset 0 -8px 16px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.2)`,
                }}>
                  {/* Grass highlight */}
                  <div style={{
                    position: 'absolute', top: '15%', left: '20%', width: '40%', height: '25%',
                    background: 'rgba(255,255,255,0.15)', borderRadius: '50%',
                    filter: 'blur(4px)',
                  }} />
                </div>

                {/* Main icon */}
                <div style={{
                  position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
                  fontSize: 44, filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.3))',
                  zIndex: 5,
                }}>{island.icon}</div>

                {/* Trees / decorations */}
                {cfg.trees.map((tree, ti) => {
                  const pos = cfg.treePositions[ti];
                  return (
                    <div key={ti} style={{
                      position: 'absolute', ...pos,
                      fontSize: 18 + Math.random() * 4, zIndex: 4,
                      filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.2))',
                    }}>{tree}</div>
                  );
                })}

                {/* Extra deco */}
                {cfg.deco.map((d, di) => (
                  <div key={di} style={{
                    position: 'absolute', ...d,
                    fontSize: d.size, zIndex: 3, opacity: 0.7,
                  }}>{d.emoji}</div>
                ))}

                {/* Completed star */}
                {island.isCompleted && (
                  <div style={{
                    position: 'absolute', top: -6, right: 10,
                    background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    border: '2px solid #F59E0B', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, boxShadow: '0 0 0 2px #181818, 0 0 12px rgba(250,204,21,0.5)',
                    animation: 'sparkle 2s ease-in-out infinite', zIndex: 6,
                  }}>⭐</div>
                )}

                {/* Flag */}
                <div style={{
                  position: 'absolute', top: 2, left: 20,
                  width: 3, height: 28, background: '#5C3A1E',
                  borderRadius: 2, zIndex: 6,
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 3,
                    width: 16, height: 10,
                    background: cfg.flagColor,
                    clipPath: 'polygon(0 0, 100% 25%, 80% 50%, 100% 75%, 0 100%)',
                  }} />
                </div>
              </div>

              {/* Name plate */}
              <div style={{
                marginTop: 4, textAlign: 'center',
              }}>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.95)',
                  border: '2px solid #484848', borderRadius: 8,
                  padding: '4px 14px',
                  boxShadow: '0 0 0 2px #181818, 2px 2px 0 #A0A0A0',
                }}>
                  <div style={{ fontSize: 13, color: '#303030', fontWeight: 'bold' }}>{island.name}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 6, padding: '0 30px' }}>
                <div style={{
                  width: '100%', height: 8, background: 'rgba(255,255,255,0.3)',
                  border: '2px solid rgba(255,255,255,0.5)', borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: `linear-gradient(90deg, ${cfg.flagColor}, rgba(255,255,255,0.8))`,
                    width: `${progress}%`, transition: 'width 600ms ease',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 }}>
                  {island.completedCount}/{island.missionCount}
                </div>
              </div>

              {/* Hover tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: -50, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.97)',
                  border: '2px solid #484848', borderRadius: 8,
                  padding: '6px 12px', whiteSpace: 'nowrap',
                  boxShadow: '0 0 0 2px #181818, 2px 2px 0 #A0A0A0',
                  animation: 'popIn 200ms ease-out',
                  zIndex: 20,
                }}>
                  <div style={{ fontSize: 11, color: '#303030', lineHeight: 1.5 }}>{island.description}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ NPC Guide dialogue at bottom ═══ */}
      {showGuide && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 25,
          background: 'rgba(255,255,255,0.97)',
          borderTop: '3px solid #484848',
          boxShadow: '0 -2px 0 #181818',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            flexShrink: 0, width: 52, height: 52,
            borderRadius: 8, border: '2px solid #484848',
            background: '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>🧑‍💼</div>

          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -26, left: 0,
              background: '#3B82F6', color: '#F8F8F8',
              fontSize: 11, padding: '1px 8px', borderRadius: 4,
              boxShadow: '1px 1px 0 #181818',
            }}>HR 안내원</div>
            <div style={{ fontSize: 14, color: '#303030', lineHeight: 1.6 }}>
              {user?.name || '탐험가'}님, 월드맵에 오신 걸 환영해요! 섬을 클릭해서 미션을 시작하세요. 🏝️
            </div>
          </div>

          <span
            onClick={() => setShowGuide(false)}
            style={{ cursor: 'pointer', fontSize: 14, color: '#303030', animation: 'bounceArr 600ms ease-in-out infinite', flexShrink: 0 }}
          >▼</span>
        </div>
      )}
    </div>
  );
}
