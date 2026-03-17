import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface MissionData {
  id: string;
  island_id: string;
  title: string;
  description: string;
  type: string;
  content: any;
  progress: {
    status: string;
    requirement: string;
    progress_data: any;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed = 35, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed(''); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, active]);
  return { displayed, done };
}

/* ─── Shared styles ─── */
const dialogBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.97)',
  border: '3px solid #484848', borderRadius: 12,
  boxShadow: '0 0 0 3px #181818, 4px 4px 0 #A0A0A0',
  padding: '20px 24px', position: 'relative',
};
const btnPrimary: React.CSSProperties = {
  fontFamily: "'DotGothic16', monospace", fontSize: 15,
  padding: '12px 32px', border: '3px solid #484848', borderRadius: 8,
  background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
  color: '#303030', fontWeight: 'bold', cursor: 'pointer',
  boxShadow: '2px 2px 0 #181818',
};
const btnSuccess: React.CSSProperties = {
  ...btnPrimary,
  background: 'linear-gradient(135deg, #22C55E, #BBF7D0)',
};

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const fetchMission = () => {
    api.get<MissionData>(`/missions/${id}`).then(data => {
      setMission(data);
      if (data.progress?.status === 'completed') setCompleted(true);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMission(); }, [id]);

  const startMission = async () => {
    await api.post(`/missions/${id}/start`);
    fetchMission();
  };

  const completeMission = async () => {
    await api.post(`/missions/${id}/complete`);
    setCompleted(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    fetchMission();
  };

  const updateProgress = async (data: any) => {
    await api.put(`/missions/${id}/progress`, { progress_data: data });
    fetchMission();
  };

  if (loading || !mission) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 55%, #228B22 100%)' }}>
        <div style={{ fontSize: 24, animation: 'float 2s ease-in-out infinite' }}>로딩 중...</div>
      </div>
    );
  }

  const status = mission.progress?.status || 'not_started';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 55%, #228B22 100%)',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(255,255,255,0.95)', borderBottom: '3px solid #484848',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 0 #181818', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => navigate(`/islands/${mission.island_id}`)} style={{
          fontFamily: "'DotGothic16', monospace", fontSize: 13,
          padding: '6px 14px', border: '2px solid #484848', borderRadius: 6,
          background: '#F8F8F8', color: '#484848', cursor: 'pointer',
          boxShadow: '1px 1px 0 #181818',
        }}>← 미션 목록</button>
        <div style={{ flex: 1, fontSize: 15, color: '#303030', fontWeight: 'bold' }}>{mission.title}</div>
        <div style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          border: '2px solid #484848',
          background: completed ? '#22C55E' : status === 'in_progress' ? '#3B82F6' : '#F8F8F8',
          color: completed || status === 'in_progress' ? '#fff' : '#484848',
          fontWeight: 'bold',
        }}>
          {completed ? '완료' : status === 'in_progress' ? '진행중' : '미시작'}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '32px auto 0', padding: '0 20px 80px' }}>

        {/* Completed celebration - item toast style */}
        {completed && (
          <div style={{
            ...dialogBox,
            textAlign: 'center', padding: '32px 24px', marginBottom: 24,
            border: '3px solid #22C55E',
            boxShadow: '0 0 0 3px #16A34A, 4px 4px 0 #A0A0A0',
          }}>
            <div style={{ fontSize: 56, marginBottom: 12, animation: 'itemBounce 600ms ease-in-out infinite alternate' }}>🎉</div>
            <div style={{ fontSize: 20, color: '#303030', fontWeight: 'bold', marginBottom: 8 }}>미션 완료!</div>
            <div style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 20 }}>축하합니다! 이 미션을 성공적으로 완료했습니다.</div>
            <button onClick={() => navigate(`/islands/${mission.island_id}`)} style={btnSuccess}>
              🏝️ 미션 목록으로
            </button>
          </div>
        )}

        {/* Start mission - NPC dialogue style */}
        {status === 'not_started' && !completed && (
          <div style={{ position: 'relative', marginBottom: 24 }}>
            {/* NPC */}
            <div style={{ fontSize: 48, marginBottom: -20, marginLeft: 16, position: 'relative', zIndex: 2,
              animation: 'float 3s ease-in-out infinite', filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.2))' }}>🧑‍🏫</div>

            <div style={dialogBox}>
              <div style={{
                position: 'absolute', top: -14, left: 80,
                background: '#F59E0B', color: '#303030',
                fontSize: 12, padding: '2px 10px', borderRadius: 4,
                boxShadow: '1px 1px 0 #181818', fontWeight: 'bold',
              }}>미션 안내</div>

              <MissionDescription text={mission.description} />

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={startMission} style={btnPrimary}>⚡ 미션 시작!</button>
              </div>
            </div>
          </div>
        )}

        {/* Mission content */}
        {(status === 'in_progress' || status === 'completed') && !completed && (
          <div>
            {/* Description dialogue */}
            <div style={{ ...dialogBox, marginBottom: 20 }}>
              <div style={{
                position: 'absolute', top: -14, left: 16,
                background: '#3B82F6', color: '#F8F8F8',
                fontSize: 12, padding: '2px 10px', borderRadius: 4,
                boxShadow: '1px 1px 0 #181818',
              }}>미션 설명</div>
              <div style={{ fontSize: 14, color: '#303030', lineHeight: 1.7 }}>{mission.description}</div>
            </div>

            {/* Content area */}
            <div style={dialogBox}>
              {mission.type === 'info' && mission.content?.quizzes && (
                <QuizMission content={mission.content} onComplete={completeMission} />
              )}
              {mission.type === 'info' && !mission.content?.quizzes && (
                <InfoMission content={mission.content} onComplete={completeMission} />
              )}
              {mission.type === 'task' && (
                <TaskMission
                  content={mission.content}
                  progressData={mission.progress?.progress_data}
                  onUpdateProgress={updateProgress}
                  onComplete={completeMission}
                />
              )}
              {mission.type === 'communication' && (
                <CommMission content={mission.content} onComplete={completeMission} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Item toast overlay */}
      {showToast && (
        <>
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 25, animation: 'fadeIn 300ms ease',
          }} onClick={() => setShowToast(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.97)',
            border: '3px solid #484848', borderRadius: 12,
            boxShadow: '0 0 0 3px #181818, 4px 4px 0 #A0A0A0',
            padding: '32px 48px', textAlign: 'center', zIndex: 30,
            animation: 'popIn 400ms cubic-bezier(0.34,1.56,0.64,1)',
          }} onClick={() => setShowToast(false)}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: 'itemBounce 600ms ease-in-out infinite alternate' }}>🏅</div>
            <div style={{ fontSize: 18, color: '#303030', fontWeight: 'bold' }}>
              <span style={{ color: '#3B82F6' }}>{mission.title}</span> 미션 클리어!
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ─── Mission Description with typewriter ─── */
function MissionDescription({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text, 35);
  return (
    <div style={{ fontSize: 15, color: '#303030', lineHeight: 1.7, minHeight: '2.4em' }}>
      {displayed}
      {!done && <span style={{ animation: 'bounceArr 600ms ease-in-out infinite' }}>|</span>}
    </div>
  );
}

/* ─── Info Mission ─── */
function InfoMission({ content, onComplete }: { content: any; onComplete: () => void }) {
  if (!content?.blocks) return <p style={{ color: '#303030' }}>콘텐츠가 없습니다.</p>;

  return (
    <div>
      {content.blocks.map((block: any, i: number) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {block.type === 'text' && (
            <div style={{ lineHeight: 1.8, color: '#303030', whiteSpace: 'pre-wrap', fontSize: 14 }}>
              {renderMarkdown(block.body)}
            </div>
          )}
          {block.type === 'image' && (
            <img src={block.url} alt={block.alt || ''} style={{ maxWidth: '100%', borderRadius: 8, border: '2px solid #484848' }} />
          )}
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button onClick={onComplete} style={{
          ...btnStyle,
          background: 'linear-gradient(135deg, #22C55E, #BBF7D0)',
        }}>✅ 읽기 완료</button>
      </div>
    </div>
  );
}

/* ─── Task Mission (Checklist) ─── */
function TaskMission({ content, progressData, onUpdateProgress, onComplete }: {
  content: any; progressData: any;
  onUpdateProgress: (data: any) => void; onComplete: () => void;
}) {
  const steps: Array<{ id: string; title: string; description: string }> = content?.steps || [];
  const [checked, setChecked] = useState<string[]>(progressData?.completedSteps || []);

  const toggleStep = async (stepId: string) => {
    const next = checked.includes(stepId)
      ? checked.filter(s => s !== stepId)
      : [...checked, stepId];
    setChecked(next);
    await onUpdateProgress({ completedSteps: next });
  };

  const allDone = steps.length > 0 && steps.every(s => checked.includes(s.id));

  return (
    <div>
      <div style={{ fontSize: 15, color: '#303030', fontWeight: 'bold', marginBottom: 16 }}>📋 체크리스트</div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          width: '100%', height: 12, background: '#D1D5DB',
          border: '2px solid #484848', borderRadius: 6, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #22C55E, #BBF7D0)',
            width: `${steps.length > 0 ? Math.round((checked.length / steps.length) * 100) : 0}%`,
            transition: 'width 600ms cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A0A0A0', marginTop: 3 }}>
          <span>{checked.length}/{steps.length} 완료</span>
        </div>
      </div>

      {steps.map((step, i) => {
        const done = checked.includes(step.id);
        return (
          <div
            key={step.id}
            onClick={() => toggleStep(step.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 0',
              borderBottom: i < steps.length - 1 ? '1px dashed #D1D5DB' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              border: done ? '3px solid #22C55E' : '3px solid #484848',
              background: done ? '#22C55E' : '#F8F8F8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 'bold',
              transition: 'all 200ms ease',
            }}>
              {done && '✓'}
            </div>
            <div>
              <div style={{
                fontSize: 14, color: '#303030', fontWeight: 'bold',
                textDecoration: done ? 'line-through' : 'none',
                opacity: done ? 0.5 : 1,
              }}>{step.title}</div>
              <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 2 }}>{step.description}</div>
            </div>
          </div>
        );
      })}

      {allDone && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={onComplete} style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #22C55E, #BBF7D0)',
          }}>🎯 미션 완료!</button>
        </div>
      )}
    </div>
  );
}

/* ─── Communication Mission (NPC 소개 + 대화 + 퀴즈) ─── */
function CommMission({ content, onComplete }: { content: any; onComplete: () => void }) {
  const npc = content?.npc;
  const dialogue: string[] = content?.dialogue || [];
  const quiz = content?.quiz;

  const [phase, setPhase] = useState<'intro' | 'dialogue' | 'quiz' | 'result'>('intro');
  const [dialogIdx, setDialogIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Fallback for old-style communication missions without NPC data
  if (!npc) {
    return (
      <div>
        <div style={{ fontSize: 15, color: '#303030', fontWeight: 'bold', marginBottom: 16 }}>💬 커뮤니케이션 미션</div>
        <div style={{ background: '#F8F8F8', border: '2px dashed #484848', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ lineHeight: 1.8, color: '#303030', fontSize: 14 }}>{content?.activityDescription || '활동 안내가 없습니다.'}</p>
        </div>
        {content?.requiredEvidence === 'text' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#484848' }}>🔑 키워드 입력</label>
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="키워드를 입력하세요"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '2px solid #484848', background: '#F8F8F8',
                fontFamily: "'DotGothic16', monospace", fontSize: 14, color: '#303030', outline: 'none' }} />
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <button onClick={onComplete} disabled={content?.requiredEvidence === 'text' && !keyword.trim()}
            style={{ ...btnStyle, background: (content?.requiredEvidence === 'text' && !keyword.trim()) ? '#D1D5DB' : 'linear-gradient(135deg, #22C55E, #BBF7D0)',
              cursor: (content?.requiredEvidence === 'text' && !keyword.trim()) ? 'not-allowed' : 'pointer' }}>✅ 완료</button>
        </div>
      </div>
    );
  }

  const nametagColors: Record<string, string> = {
    blue: '#3B82F6', red: '#EF4444', green: '#22C55E', gold: '#F59E0B',
  };
  const nametagColor = nametagColors[npc.color] || '#484848';

  return (
    <div>
      {/* ─── Phase: NPC 소개 ─── */}
      {phase === 'intro' && (
        <div style={{ animation: 'fadeIn 400ms ease' }}>
          {/* NPC Portrait Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12,
              border: `3px solid ${nametagColor}`, background: '#D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, boxShadow: '0 0 0 2px #181818',
              animation: 'float 3s ease-in-out infinite',
            }}>{npc.emoji}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: nametagColor, color: '#fff',
                  fontSize: 12, padding: '2px 10px', borderRadius: 4,
                  boxShadow: '1px 1px 0 #181818',
                }}>{npc.team}</span>
                <span style={{
                  background: '#484848', color: '#F8F8F8',
                  fontSize: 12, padding: '2px 10px', borderRadius: 4,
                  boxShadow: '1px 1px 0 #181818',
                }}>{npc.position}</span>
              </div>
              <div style={{ fontSize: 20, color: '#303030', fontWeight: 'bold' }}>{npc.name}</div>
            </div>
          </div>

          {/* Bio */}
          <div style={{
            background: '#F8F8F8', border: '2px solid #D1D5DB',
            borderRadius: 8, padding: 16, marginBottom: 16,
          }}>
            <NpcBio text={npc.bio} />
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {(npc.tags || []).map((tag: string, i: number) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 12px', fontSize: 12,
                border: '2px solid #484848', borderRadius: 20,
                background: '#F8F8F8', color: '#303030',
                boxShadow: '1px 1px 0 #A0A0A0',
              }}>#{tag}</span>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setPhase('dialogue')} style={btnStyle}>
              💬 대화 시작하기
            </button>
          </div>
        </div>
      )}

      {/* ─── Phase: NPC 대화 ─── */}
      {phase === 'dialogue' && (
        <div style={{ animation: 'fadeIn 300ms ease' }}>
          {/* NPC portrait + dialogue box */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 8, flexShrink: 0,
              border: `2px solid ${nametagColor}`, background: '#D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>{npc.emoji}</div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -12, left: 0,
                background: nametagColor, color: '#fff',
                fontSize: 11, padding: '1px 8px', borderRadius: 4,
                boxShadow: '1px 1px 0 #181818',
              }}>{npc.name}</div>
              <div style={{
                background: '#F8F8F8', border: '2px solid #484848',
                borderRadius: '2px 12px 12px 12px', padding: '16px 14px',
                marginTop: 4, minHeight: 60,
              }}>
                <DialogueLine text={dialogue[dialogIdx] || ''} />
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            {dialogue.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === dialogIdx ? nametagColor : '#D1D5DB',
                border: '1px solid #484848',
                transition: 'background 200ms ease',
              }} />
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            {dialogIdx < dialogue.length - 1 ? (
              <button onClick={() => setDialogIdx(dialogIdx + 1)} style={btnStyle}>
                다음 ▼
              </button>
            ) : (
              <button onClick={() => setPhase(quiz ? 'quiz' : 'result')} style={{
                ...btnStyle, background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
              }}>
                {quiz ? '🧠 퀴즈 풀기!' : '✅ 완료'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Phase: 퀴즈 ─── */}
      {phase === 'quiz' && quiz && (
        <div style={{ animation: 'fadeIn 300ms ease' }}>
          {/* Question */}
          <div style={{
            background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
            border: '3px solid #F59E0B', borderRadius: 12,
            padding: '16px 20px', marginBottom: 20,
            boxShadow: '0 0 0 2px #181818',
          }}>
            <div style={{ fontSize: 12, color: '#92400E', fontWeight: 'bold', marginBottom: 6 }}>🧠 퀴즈</div>
            <div style={{ fontSize: 16, color: '#303030', fontWeight: 'bold', lineHeight: 1.6 }}>{quiz.question}</div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {(quiz.options as string[]).map((option: string, i: number) => {
              const isCorrect = i === quiz.correctIndex;
              const isSelected = selectedAnswer === i;
              let bg = '#F8F8F8';
              let borderColor = '#484848';
              let shadow = '2px 2px 0 #A0A0A0';

              if (answered) {
                if (isCorrect) {
                  bg = '#DCFCE7'; borderColor = '#22C55E'; shadow = '0 0 0 2px #16A34A, 2px 2px 0 #A0A0A0';
                } else if (isSelected && !isCorrect) {
                  bg = '#FEE2E2'; borderColor = '#EF4444'; shadow = '0 0 0 2px #DC2626, 2px 2px 0 #A0A0A0';
                }
              } else if (isSelected) {
                bg = '#E0F2FE'; borderColor = '#3B82F6'; shadow = '0 0 0 2px #2563EB, 2px 2px 0 #A0A0A0';
              }

              return (
                <button
                  key={i}
                  onClick={() => { if (!answered) setSelectedAnswer(i); }}
                  disabled={answered}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px',
                    border: `3px solid ${borderColor}`, borderRadius: 10,
                    background: bg, boxShadow: shadow,
                    fontFamily: "'DotGothic16', monospace", fontSize: 15,
                    color: '#303030', cursor: answered ? 'default' : 'pointer',
                    textAlign: 'left', width: '100%',
                    transition: 'all 150ms ease',
                  }}
                >
                  {/* Number circle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${borderColor}`,
                    background: isSelected ? (answered ? (isCorrect ? '#22C55E' : '#EF4444') : '#3B82F6') : '#D1D5DB',
                    color: isSelected ? '#fff' : '#484848',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 'bold',
                  }}>
                    {answered && isCorrect ? '✓' : answered && isSelected && !isCorrect ? '✗' : i + 1}
                  </div>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Submit / Result */}
          {!answered && selectedAnswer !== null && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setAnswered(true)} style={{
                ...btnStyle, background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
              }}>정답 확인!</button>
            </div>
          )}

          {answered && (
            <div style={{ animation: 'popIn 400ms cubic-bezier(0.34,1.56,0.64,1)' }}>
              {/* Result banner */}
              <div style={{
                background: selectedAnswer === quiz.correctIndex
                  ? 'linear-gradient(135deg, #DCFCE7, #BBF7D0)'
                  : 'linear-gradient(135deg, #FEE2E2, #FECACA)',
                border: `3px solid ${selectedAnswer === quiz.correctIndex ? '#22C55E' : '#EF4444'}`,
                borderRadius: 12, padding: '16px 20px', marginBottom: 16,
                boxShadow: `0 0 0 2px ${selectedAnswer === quiz.correctIndex ? '#16A34A' : '#DC2626'}`,
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>
                  {selectedAnswer === quiz.correctIndex ? '🎉 정답!' : '😅 아쉬워요!'}
                </div>
                <div style={{ fontSize: 14, color: '#303030', lineHeight: 1.7 }}>
                  {quiz.explanation}
                </div>
              </div>

              {/* NPC reaction */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  border: `2px solid ${nametagColor}`, background: '#D1D5DB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>{npc.emoji}</div>
                <div style={{
                  background: '#F8F8F8', border: '2px solid #484848',
                  borderRadius: '2px 12px 12px 12px', padding: '12px 14px',
                  fontSize: 14, color: '#303030', lineHeight: 1.6,
                }}>
                  {selectedAnswer === quiz.correctIndex
                    ? `와! 정답이에요! 저에 대해 잘 알고 계시네요~ 앞으로 잘 부탁드려요! 😊`
                    : `정답은 "${quiz.options[quiz.correctIndex]}"이에요! 다음에 저한테 직접 물어봐주세요~ 😄`}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button onClick={onComplete} style={{
                  ...btnStyle, background: 'linear-gradient(135deg, #22C55E, #BBF7D0)',
                }}>🏅 미션 완료!</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── NPC Bio with typewriter ─── */
function NpcBio({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text, 30);
  return (
    <div style={{ fontSize: 14, color: '#303030', lineHeight: 1.8 }}>
      {displayed}
      {!done && <span style={{ animation: 'bounceArr 600ms ease-in-out infinite' }}>|</span>}
    </div>
  );
}

/* ─── Dialogue line with typewriter ─── */
function DialogueLine({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text, 30);
  return (
    <div style={{ fontSize: 15, color: '#303030', lineHeight: 1.7 }}>
      {displayed}
      {!done && <span style={{ animation: 'bounceArr 600ms ease-in-out infinite' }}>|</span>}
    </div>
  );
}

/* ─── Quiz Mission (다중 퀴즈) ─── */
function QuizMission({ content, onComplete }: { content: any; onComplete: () => void }) {
  const quizzes: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> = content?.quizzes || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  if (quizzes.length === 0) return <p style={{ color: '#303030' }}>퀴즈가 없습니다.</p>;

  const quiz = quizzes[currentIdx];

  const handleNext = () => {
    if (selectedAnswer === quiz.correctIndex) setCorrectCount(c => c + 1);
    if (currentIdx < quizzes.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const finalCorrect = correctCount + (selectedAnswer === quiz.correctIndex ? 1 : 0);
    return (
      <div style={{ textAlign: 'center', animation: 'popIn 400ms cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, color: '#303030', fontWeight: 'bold', marginBottom: 8 }}>퀴즈 완료!</div>
        <div style={{ fontSize: 16, color: '#484848', marginBottom: 20 }}>
          {quizzes.length}문제 중 {finalCorrect}문제 정답!
        </div>
        <button onClick={onComplete} style={{ ...btnStyle, background: 'linear-gradient(135deg, #22C55E, #BBF7D0)' }}>
          🏅 미션 완료!
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 진행 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#484848', fontWeight: 'bold' }}>
          🧠 퀴즈 {currentIdx + 1} / {quizzes.length}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {quizzes.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === currentIdx ? '#3B82F6' : i < currentIdx ? '#22C55E' : '#D1D5DB',
              border: '1px solid #484848',
            }} />
          ))}
        </div>
      </div>

      {/* 질문 */}
      <div style={{
        background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
        border: '3px solid #F59E0B', borderRadius: 12,
        padding: '16px 20px', marginBottom: 20,
        boxShadow: '0 0 0 2px #181818',
      }}>
        <div style={{ fontSize: 16, color: '#303030', fontWeight: 'bold', lineHeight: 1.6 }}>{quiz.question}</div>
      </div>

      {/* 보기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {quiz.options.map((option: string, i: number) => {
          const isCorrect = i === quiz.correctIndex;
          const isSelected = selectedAnswer === i;
          let bg = '#F8F8F8';
          let borderColor = '#484848';

          if (answered) {
            if (isCorrect) { bg = '#DCFCE7'; borderColor = '#22C55E'; }
            else if (isSelected && !isCorrect) { bg = '#FEE2E2'; borderColor = '#EF4444'; }
          } else if (isSelected) { bg = '#E0F2FE'; borderColor = '#3B82F6'; }

          return (
            <button key={i} onClick={() => { if (!answered) setSelectedAnswer(i); }} disabled={answered}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', border: `3px solid ${borderColor}`, borderRadius: 10,
                background: bg, fontFamily: "'DotGothic16', monospace", fontSize: 15,
                color: '#303030', cursor: answered ? 'default' : 'pointer',
                textAlign: 'left', width: '100%', transition: 'all 150ms ease',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${borderColor}`,
                background: isSelected ? (answered ? (isCorrect ? '#22C55E' : '#EF4444') : '#3B82F6') : '#D1D5DB',
                color: isSelected ? '#fff' : '#484848',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 'bold',
              }}>
                {answered && isCorrect ? '✓' : answered && isSelected && !isCorrect ? '✗' : i + 1}
              </div>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {/* 정답 확인 */}
      {!answered && selectedAnswer !== null && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => setAnswered(true)} style={{
            ...btnStyle, background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
          }}>정답 확인!</button>
        </div>
      )}

      {/* 결과 + 다음 */}
      {answered && (
        <div style={{ animation: 'popIn 400ms cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{
            background: selectedAnswer === quiz.correctIndex
              ? 'linear-gradient(135deg, #DCFCE7, #BBF7D0)'
              : 'linear-gradient(135deg, #FEE2E2, #FECACA)',
            border: `3px solid ${selectedAnswer === quiz.correctIndex ? '#22C55E' : '#EF4444'}`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>
              {selectedAnswer === quiz.correctIndex ? '🎉 정답!' : '😅 아쉬워요!'}
            </div>
            <div style={{ fontSize: 14, color: '#303030', lineHeight: 1.7 }}>{quiz.explanation}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleNext} style={{
              ...btnStyle, background: currentIdx < quizzes.length - 1
                ? 'linear-gradient(135deg, #3B82F6, #60A5FA)'
                : 'linear-gradient(135deg, #22C55E, #BBF7D0)',
            }}>
              {currentIdx < quizzes.length - 1 ? '다음 퀴즈 →' : '🏅 미션 완료!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
const btnStyle: React.CSSProperties = {
  fontFamily: "'DotGothic16', monospace", fontSize: 15,
  padding: '12px 32px', border: '3px solid #484848', borderRadius: 8,
  color: '#303030', fontWeight: 'bold', cursor: 'pointer',
  boxShadow: '2px 2px 0 #181818',
};

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 18, marginTop: 20, marginBottom: 8, color: '#303030' }}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 16, marginTop: 12, marginBottom: 6, color: '#303030' }}>{line.slice(4)}</h3>;
    if (line.startsWith('- **')) {
      const m = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
      if (m) return <div key={i} style={{ marginBottom: 4 }}>• <strong>{m[1]}</strong>{m[2] ? `: ${m[2]}` : ''}</div>;
    }
    if (line.startsWith('- ')) return <div key={i} style={{ marginBottom: 4, paddingLeft: 8 }}>• {line.slice(2)}</div>;
    if (line.match(/^\d+\./)) return <div key={i} style={{ marginBottom: 4, paddingLeft: 8 }}>{line}</div>;
    if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
    return <div key={i}>{line}</div>;
  });
}
