import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { saveToken, saveUser } from '../auth';

/* ─── Typewriter effect ─── */
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return { displayed, done };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const greeting = useTypewriter('온보딩 어드벤처에 오신 걸 환영합니다! 모험을 시작하려면 로그인하세요.', 45);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.post<any>('/auth/login', { email, password });
      saveToken(result.accessToken);
      saveUser(result.user);
      navigate('/world');
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 55%, #228B22 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Floating clouds */}
      <div style={{ position: 'absolute', top: 40, left: '10%', fontSize: 48, opacity: 0.6, animation: 'float 4s ease-in-out infinite' }}>☁️</div>
      <div style={{ position: 'absolute', top: 80, right: '15%', fontSize: 36, opacity: 0.4, animation: 'float 5s ease-in-out infinite 1s' }}>☁️</div>
      <div style={{ position: 'absolute', top: 20, left: '50%', fontSize: 28, opacity: 0.3, animation: 'float 6s ease-in-out infinite 0.5s' }}>☁️</div>

      {/* Title area */}
      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'popIn 600ms cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏝️</div>
        <h1 style={{
          fontSize: 28, color: '#303030',
          textShadow: '2px 2px 0 rgba(255,255,255,0.5)',
          letterSpacing: 2,
        }}>온보딩 어드벤처</h1>
      </div>

      {/* NPC Guide with dialogue box */}
      <div style={{ position: 'relative', maxWidth: 520, width: '90%', marginBottom: 24 }}>
        {/* NPC sprite */}
        <div style={{
          position: 'absolute', top: -60, left: 24,
          fontSize: 56, animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.2))',
        }}>🧑‍💼</div>

        {/* Dialogue box */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          border: '3px solid #484848',
          borderRadius: 12,
          boxShadow: '0 0 0 3px #181818, 4px 4px 0 #A0A0A0',
          padding: '20px 24px',
          paddingTop: 28,
          position: 'relative',
          minHeight: 80,
        }}>
          {/* Name tag */}
          <div style={{
            position: 'absolute', top: -14, left: 90,
            background: '#3B82F6', color: '#F8F8F8',
            fontSize: 14, padding: '2px 12px', borderRadius: 4,
            letterSpacing: 1, boxShadow: '1px 1px 0 #181818',
          }}>HR 안내원</div>

          <div style={{
            fontFamily: "'DotGothic16', monospace",
            fontSize: 16, lineHeight: 1.7, color: '#303030',
            minHeight: '2.4em',
          }}>
            {greeting.displayed}
            {!greeting.done && <span style={{ animation: 'bounceArr 600ms ease-in-out infinite' }}>|</span>}
          </div>

          {greeting.done && !showForm && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <span
                onClick={() => setShowForm(true)}
                style={{
                  cursor: 'pointer', fontSize: 14, color: '#303030',
                  animation: 'bounceArr 600ms ease-in-out infinite',
                }}>▼ 계속하기</span>
            </div>
          )}
        </div>
      </div>

      {/* Login form as choice box style */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          maxWidth: 520, width: '90%',
          background: 'rgba(255,255,255,0.97)',
          border: '3px solid #484848',
          borderRadius: 12,
          boxShadow: '0 0 0 3px #181818, 4px 4px 0 #A0A0A0',
          padding: '24px',
          animation: 'popIn 300ms ease-out',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '2px solid #EF4444',
              borderRadius: 8, padding: '8px 12px', marginBottom: 16,
              color: '#EF4444', fontSize: 14, textAlign: 'center',
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#484848', marginBottom: 4 }}>📧 이메일</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="이메일을 입력하세요"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                border: '2px solid #484848', background: '#F8F8F8',
                fontFamily: "'DotGothic16', monospace", fontSize: 15, color: '#303030',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#484848', marginBottom: 4 }}>🔑 비밀번호</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="비밀번호를 입력하세요"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                border: '2px solid #484848', background: '#F8F8F8',
                fontFamily: "'DotGothic16', monospace", fontSize: 15, color: '#303030',
                outline: 'none',
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px',
            border: '3px solid #484848', borderRadius: 8,
            background: loading ? '#A0A0A0' : 'linear-gradient(135deg, #FACC15, #F59E0B)',
            fontFamily: "'DotGothic16', monospace", fontSize: 16,
            color: '#303030', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer',
            boxShadow: '2px 2px 0 #181818',
            transition: 'var(--tr-fast)',
          }}>
            {loading ? '로그인 중...' : '⚡ 모험 시작!'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#A0A0A0' }}>
            데모: newbie@demo.com / newbie123
          </div>
        </form>
      )}
    </div>
  );
}
