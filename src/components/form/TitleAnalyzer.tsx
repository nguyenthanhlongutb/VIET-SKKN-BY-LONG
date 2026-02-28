'use client';
import { useState } from 'react';

interface Props {
    title: string;
    subject: string;
    gradeLevel: string;
}

interface Breakdown { criterion: string; max: number; score: number; comment: string; }
interface Alternative { title: string; score: number; reason: string; }
interface AnalysisResult {
    totalScore: number; rating: string;
    breakdown: Breakdown[]; strengths: string[]; weaknesses: string[];
    alternatives: Alternative[];
}
interface Suggestion { title: string; score: number; reason: string; }

const RATING_COLOR: Record<string, string> = {
    'Xuất sắc': '#10b981', 'Tốt': '#3b82f6', 'Khá': '#f59e0b',
    'Trung bình': '#f97316', 'Yếu': '#ef4444',
};

function ScoreBar({ score, max }: { score: number; max: number }) {
    const pct = Math.round(score / max * 100);
    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 6, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 10, color, fontWeight: 700, minWidth: 36 }}>{score}/{max}</span>
        </div>
    );
}

export default function TitleAnalyzer({ title, subject, gradeLevel }: Props) {
    const [loading, setLoading] = useState<'analyze' | 'suggest' | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [error, setError] = useState('');
    const [showMore, setShowMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    async function call(mode: 'analyze' | 'suggest') {
        setLoading(mode);
        setError('');
        try {
            const res = await fetch('/api/title-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subject, gradeLevel, mode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (mode === 'analyze') setAnalysis(data);
            else setSuggestions(prev => mode === 'suggest' ? data.suggestions || [] : prev);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Lỗi');
        } finally {
            setLoading(null);
        }
    }

    async function loadMore() {
        setLoadingMore(true);
        try {
            const res = await fetch('/api/title-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subject, gradeLevel, mode: 'suggest' }),
            });
            const data = await res.json();
            setSuggestions(prev => [...prev, ...(data.suggestions || [])]);
        } finally {
            setLoadingMore(false);
        }
    }

    const canRun = Boolean(title?.trim());

    return (
        <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    onClick={() => call('analyze')}
                    disabled={!canRun || loading !== null}
                    style={btnStyle(canRun && !loading, '#6366f1')}
                >
                    {loading === 'analyze' ? '⏳...' : '🔍 Phân tích tên'}
                </button>
                <button
                    onClick={() => { setSuggestions([]); call('suggest'); }}
                    disabled={loading !== null}
                    style={btnStyle(!loading, '#10b981')}
                >
                    {loading === 'suggest' ? '⏳...' : '💡 Gợi ý tên'}
                </button>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>⚠ {error}</p>}

            {/* Analysis Result */}
            {analysis && (
                <div style={resultBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>{analysis.totalScore}</span>
                        <span style={{ color: '#64748b', fontSize: 11 }}>/100</span>
                        <span style={{
                            background: RATING_COLOR[analysis.rating] + '22',
                            color: RATING_COLOR[analysis.rating] || '#94a3b8',
                            border: `1px solid ${RATING_COLOR[analysis.rating] || '#2a3547'}`,
                            borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                        }}>{analysis.rating}</span>
                    </div>

                    {analysis.breakdown.map((b, i) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>{b.criterion}</span>
                            </div>
                            <ScoreBar score={b.score} max={b.max} />
                            <p style={{ fontSize: 9, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{b.comment}</p>
                        </div>
                    ))}

                    {(analysis.strengths?.length > 0 || analysis.weaknesses?.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '8px 0' }}>
                            <div style={{ background: '#052e16', borderRadius: 5, padding: '6px 8px' }}>
                                <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginBottom: 3 }}>✅ Ưu điểm</p>
                                {analysis.strengths?.map((s, i) => <p key={i} style={{ fontSize: 9, color: '#6ee7b7' }}>• {s}</p>)}
                            </div>
                            <div style={{ background: '#2d1010', borderRadius: 5, padding: '6px 8px' }}>
                                <p style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 3 }}>⚠ Hạn chế</p>
                                {analysis.weaknesses?.map((w, i) => <p key={i} style={{ fontSize: 9, color: '#fca5a5' }}>• {w}</p>)}
                            </div>
                        </div>
                    )}

                    {analysis.alternatives?.length > 0 && (
                        <>
                            <p style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, margin: '6px 0 4px' }}>💡 Tên thay thế gợi ý:</p>
                            {analysis.alternatives.slice(0, showMore ? undefined : 3).map((a, i) => (
                                <div key={i} style={{ background: '#0f172a', borderRadius: 5, padding: '6px 8px', marginBottom: 4, border: '1px solid #1e3a5f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                        <span style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4, flex: 1 }}>{a.title}</span>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', flexShrink: 0 }}>{a.score}</span>
                                    </div>
                                    <p style={{ fontSize: 9, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{a.reason}</p>
                                </div>
                            ))}
                            {analysis.alternatives.length > 3 && (
                                <button onClick={() => setShowMore(!showMore)} style={btnStyle(true, '#2a3547', true)}>
                                    {showMore ? '▲ Thu gọn' : `▼ Xem thêm (${analysis.alternatives.length - 3})`}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div style={resultBox}>
                    <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>💡 Gợi ý tên SKKN ({suggestions.length}):</p>
                    {suggestions.map((s, i) => (
                        <div key={i} style={{ background: '#0f172a', borderRadius: 5, padding: '6px 8px', marginBottom: 4, border: '1px solid #052e16' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                <span style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4, flex: 1 }}>{s.title}</span>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', flexShrink: 0 }}>{s.score}</span>
                            </div>
                            <p style={{ fontSize: 9, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{s.reason}</p>
                        </div>
                    ))}
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        style={btnStyle(!loadingMore, '#10b981', true)}
                    >
                        {loadingMore ? '⏳ Đang tải...' : '▼ Xem thêm gợi ý'}
                    </button>
                </div>
            )}
        </div>
    );
}

function btnStyle(active: boolean | null, color: string, small = false) {
    return {
        flex: 1, padding: small ? '4px 8px' : '6px 8px', borderRadius: 6,
        border: 'none', cursor: active ? 'pointer' : 'not-allowed',
        fontSize: small ? 9 : 10, fontWeight: 700 as const,
        background: active ? `linear-gradient(135deg, ${color}, ${color}99)` : '#1c2333',
        color: active ? '#fff' : '#64748b',
        transition: 'all 0.15s', width: '100%', marginTop: small ? 4 : 0,
    } as React.CSSProperties;
}

const resultBox: React.CSSProperties = {
    marginTop: 8, background: '#161b27', borderRadius: 7,
    border: '1px solid #2a3547', padding: '10px',
    maxHeight: 380, overflowY: 'auto',
};
