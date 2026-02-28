'use client';
import { useRef, useCallback, useState } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import DocumentPreview from './preview/DocumentPreview';
import { exportToDocx } from '@/lib/exportDocx';

export default function CenterPanel() {
    const { formData, generatedContent, isGenerating } = useSKKN();
    const contentRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = useCallback(async () => {
        if (!generatedContent) return;
        setExporting(true);
        try {
            await exportToDocx(generatedContent, formData, formData.title || 'SKKN');
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    }, [generatedContent, formData]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#e8ecf4' }}>
            {/* Toolbar */}
            <div style={{
                padding: '8px 16px', borderBottom: '1px solid #d1d5db',
                background: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 8, flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>📑 Bản xem trước SKKN</span>
                    {generatedContent && (
                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20 }}>✓ Đã tạo</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {generatedContent && (
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 12px', background: '#2563eb',
                                color: '#fff', border: 'none', borderRadius: 6,
                                fontSize: '12px', fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
                                opacity: exporting ? 0.6 : 1, transition: 'background 0.15s',
                            }}
                        >
                            {exporting ? '⌛ Đang xuất...' : '⬇ Xuất .docx'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
                {isGenerating && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                        <div style={{ width: 60, height: 60, border: '4px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>Đang tạo SKKN với AI Gemini...</p>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4 }}>Quá trình có thể mất 30–90 giây, vui lòng chờ</p>
                        </div>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {!isGenerating && !generatedContent && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#94a3b8' }}>
                        <div style={{ fontSize: 72, opacity: 0.3 }}>📄</div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '17px', fontWeight: 700, color: '#475569' }}>Chưa có nội dung</p>
                            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: 6 }}>Điền thông tin bên trái → Nhấn "Tạo SKKN"</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12, maxWidth: 480 }}>
                            {['📝 Nhập thông tin', '🚀 AI tự viết', '📊 Biểu đồ tự động', '⬇ Xuất Word'].map((s, i) => (
                                <div key={i} style={{ padding: '10px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>{s}</div>
                            ))}
                        </div>
                    </div>
                )}

                {!isGenerating && generatedContent && (
                    <div ref={contentRef} style={{
                        background: '#fff', margin: '0 auto', maxWidth: '820px',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
                        borderRadius: 4,
                        padding: '56px 60px',
                        minHeight: 1000,
                    }}>
                        <DocumentPreview html={generatedContent} />
                    </div>
                )}
            </div>
        </div>
    );
}
