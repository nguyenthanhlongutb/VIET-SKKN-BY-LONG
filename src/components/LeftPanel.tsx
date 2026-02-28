'use client';
import { useState } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import Section1Required from './form/Section1Required';
import Section2School from './form/Section2School';
import Section3Supplement from './form/Section3Supplement';

const SECTIONS = [
    { id: 1, label: '📝 Thông tin bắt buộc', color: '#60a5fa', Component: Section1Required },
    { id: 2, label: '🏫 Đặc điểm đơn vị', color: '#c084fc', Component: Section2School },
    { id: 3, label: '✨ Thông tin bổ sung', color: '#fbbf24', Component: Section3Supplement },
];

export default function LeftPanel() {
    const { formData, generateSKKN, isGenerating } = useSKKN();
    const [openSection, setOpenSection] = useState<number>(1);

    const isValid = formData.authorName && formData.school && formData.location &&
        formData.title && formData.subject && formData.gradeLevel;

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: '#161b27', minHeight: 0,
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 14px', borderBottom: '1px solid #2a3547',
                background: '#1c2333', flexShrink: 0,
            }}>
                <h1 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                    📄 Viết SKKN
                </h1>
                <p style={{ fontSize: '10px', color: '#64748b' }}>
                    Chuẩn VB 2989/SGDĐT-QLĐT · Điện Biên · CT 2018
                </p>
            </div>

            {/* Scrollable form — CRITICAL: minHeight:0 enables scroll inside flex child */}
            <div style={{
                flex: 1,
                minHeight: 0,          /* ← fixes flex overflow/scroll */
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}>
                {SECTIONS.map(({ id, label, color, Component }) => (
                    <div key={id} style={{ borderRadius: '8px', border: '1px solid #2a3547', overflow: 'visible', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => setOpenSection(openSection === id ? 0 : id)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', padding: '9px 12px',
                                background: '#1c2333', border: 'none', cursor: 'pointer',
                                borderRadius: openSection === id ? '8px 8px 0 0' : '8px',
                            }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{openSection === id ? '▲' : '▼'}</span>
                        </button>
                        {openSection === id && (
                            <div style={{
                                padding: '10px',
                                background: '#161b27',
                                borderTop: '1px solid #2a3547',
                                borderRadius: '0 0 8px 8px',
                            }}>
                                <Component />
                            </div>
                        )}
                    </div>
                ))}
                {/* bottom padding so last field isn't hidden under button */}
                <div style={{ height: 8, flexShrink: 0 }} />
            </div>

            {/* Generate Button */}
            <div style={{ padding: '10px', borderTop: '1px solid #2a3547', background: '#1c2333', flexShrink: 0 }}>
                {!isValid && (
                    <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px' }}>
                        ⚠ Điền đầy đủ các trường bắt buộc (*)
                    </p>
                )}
                <button
                    onClick={generateSKKN}
                    disabled={!isValid || isGenerating}
                    style={{
                        width: '100%', padding: '11px', borderRadius: '8px',
                        border: 'none', cursor: isValid && !isGenerating ? 'pointer' : 'not-allowed',
                        fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                        background: isValid && !isGenerating
                            ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                            : '#2a3547',
                        color: isValid && !isGenerating ? '#fff' : '#64748b',
                        boxShadow: isValid && !isGenerating ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
                    }}
                >
                    {isGenerating ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                            </svg>
                            Đang tạo SKKN...
                        </span>
                    ) : '🚀 Tạo SKKN'}
                </button>
                <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
            </div>
        </div>
    );
}
