'use client';
import { useState } from 'react';
import { useSKKN } from '@/context/SKKNContext';

type Mode = 'idle' | 'loading' | 'done' | 'error';

export default function AIToolsPanel() {
    const { generatedContent, formData } = useSKKN();

    const [evalMode, setEvalMode] = useState<Mode>('idle');
    const [evalHtml, setEvalHtml] = useState('');
    const [plagMode, setPlagMode] = useState<Mode>('idle');
    const [plagHtml, setPlagHtml] = useState('');
    const [active, setActive] = useState<'eval' | 'plag'>('eval');

    const hasContent = Boolean(generatedContent);

    async function runEvaluate() {
        if (!hasContent) return;
        setEvalMode('loading');
        setEvalHtml('');
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: generatedContent, formData }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEvalHtml(data.html || '');
            setEvalMode('done');
        } catch (e) {
            setEvalMode('error');
            setEvalHtml(`<p style="color:#ef4444">Lỗi: ${e instanceof Error ? e.message : 'Unknown'}</p>`);
        }
    }

    async function runPlagiarism() {
        if (!hasContent) return;
        setPlagMode('loading');
        setPlagHtml('');
        try {
            const res = await fetch('/api/plagiarism', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: generatedContent, formData }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlagHtml(data.html || '');
            setPlagMode('done');
        } catch (e) {
            setPlagMode('error');
            setPlagHtml(`<p style="color:#ef4444">Lỗi: ${e instanceof Error ? e.message : 'Unknown'}</p>`);
        }
    }

    const btn = (label: string, onClick: () => void, loading: boolean, disabled: boolean, color = '#3b82f6') => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                width: '100%', padding: '8px 10px', borderRadius: 7, border: 'none',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 12,
                background: disabled ? '#2a3547' : `linear-gradient(135deg, ${color}, ${color}99)`,
                color: disabled ? '#64748b' : '#fff',
                boxShadow: disabled ? 'none' : `0 3px 10px ${color}44`,
                marginBottom: 8, transition: 'all 0.2s',
            }}
        >
            {loading ? '⏳ Đang phân tích...' : label}
        </button>
    );

    const resultBox = (html: string, mode: Mode) => {
        if (mode === 'idle') return null;
        return (
            <div style={{
                background: '#0f172a', borderRadius: 6, padding: 10,
                border: '1px solid #2a3547', marginTop: 8,
                maxHeight: '55vh', overflowY: 'auto', overflowX: 'hidden',
            }}>
                {mode === 'loading' ? (
                    <div style={{ textAlign: 'center', color: '#60a5fa', padding: 20, fontSize: 12 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
                        AI đang phân tích...<br />
                        <span style={{ color: '#64748b', fontSize: 11 }}>Có thể mất 30-60 giây</span>
                    </div>
                ) : (
                    <div
                        dangerouslySetInnerHTML={{ __html: html }}
                        style={{ fontSize: 11, lineHeight: 1.6, color: '#cbd5e1' }}
                        className="ai-tools-result"
                    />
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {([['eval', '📊 Đánh giá'], ['plag', '🔍 Đạo văn & AI']] as const).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setActive(k)}
                        style={{
                            flex: 1, padding: '5px 4px', borderRadius: 6, border: 'none',
                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            background: active === k ? '#1e40af' : '#1c2333',
                            color: active === k ? '#bfdbfe' : '#64748b',
                            transition: 'all 0.15s',
                        }}
                    >{label}</button>
                ))}
            </div>

            {!hasContent && (
                <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
                    ⚠ Hãy tạo SKKN trước để sử dụng công cụ AI
                </p>
            )}

            {/* EVALUATE TAB */}
            {active === 'eval' && (
                <div>
                    <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
                        AI chấm điểm SKKN theo <strong style={{ color: '#60a5fa' }}>6 tiêu chí VB 2989</strong>, thang 100 điểm. Đưa ra ưu điểm, hạn chế, gợi ý và đoạn văn mẫu đã nâng cấp.
                    </p>
                    {btn('🎯 Đánh giá SKKN (Chấm điểm /100)', runEvaluate, evalMode === 'loading', !hasContent, '#6366f1')}
                    {evalMode === 'done' && btn('🔄 Đánh giá lại', runEvaluate, evalMode === 'loading', !hasContent, '#6366f1')}
                    {resultBox(evalHtml, evalMode)}
                </div>
            )}

            {/* PLAGIARISM TAB */}
            {active === 'plag' && (
                <div>
                    <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
                        Phân tích <strong style={{ color: '#f59e0b' }}>tỉ lệ đạo văn</strong> và <strong style={{ color: '#ef4444' }}>nội dung AI viết</strong>. Flagged đoạn nghi vấn và tự động viết lại.
                    </p>
                    <div style={{
                        background: '#1c1a0a', border: '1px solid #f59e0b44',
                        borderRadius: 6, padding: '6px 8px', marginBottom: 8, fontSize: 10, color: '#fbbf24',
                    }}>
                        ⚠ Đây là ước tính dựa trên phân tích ngôn ngữ học, không phải quét internet thực sự.
                    </div>
                    {btn('🔍 Kiểm tra Đạo văn & AI viết', runPlagiarism, plagMode === 'loading', !hasContent, '#f59e0b')}
                    {plagMode === 'done' && btn('🔄 Kiểm tra lại', runPlagiarism, plagMode === 'loading', !hasContent, '#f59e0b')}
                    {resultBox(plagHtml, plagMode)}
                </div>
            )}

            <style>{`
                .ai-tools-result h2 { font-size:12px; color:#e2e8f0; margin:8px 0 4px; font-weight:700; }
                .ai-tools-result h3 { font-size:11px; color:#93c5fd; margin:6px 0 3px; font-weight:700; border-bottom:1px solid #1e3a5f; padding-bottom:2px; }
                .ai-tools-result table { width:100%; border-collapse:collapse; margin:4px 0; }
                .ai-tools-result th { background:#1e3a5f; color:#bfdbfe; padding:4px 6px; font-size:10px; text-align:left; }
                .ai-tools-result td { padding:4px 6px; font-size:10px; border-bottom:1px solid #1e2a3a; }
                .ai-tools-result ul,.ai-tools-result ol { padding-left:14px; margin:4px 0; }
                .ai-tools-result li { margin:2px 0; font-size:10px; }
                .ai-tools-result blockquote { background:#1e2a3a; border-left:3px solid #ef4444; padding:6px 8px; margin:4px 0; font-style:italic; font-size:10px; }
                .ai-tools-result strong { color:#fbbf24; }
                .ai-tools-result p { margin:3px 0; }
            `}</style>
        </div>
    );
}
