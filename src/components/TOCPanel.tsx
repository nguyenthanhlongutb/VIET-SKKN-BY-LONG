'use client';
import { useEffect, useRef, useState } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import AIToolsPanel from './AIToolsPanel';

type Tab = 'toc' | 'tools';

// The SKKN structure with SEC keys for streaming matching
const SKKN_STRUCTURE = [
    { title: 'Bìa & Thông tin chung', level: 1, secKey: 'SEC:bia' },
    { title: 'Mục lục', level: 1, secKey: 'SEC:mucluc' },
    { title: 'Danh mục chữ viết tắt', level: 1, secKey: 'SEC:mucluc' },
    { title: 'A. Mục đích, sự cần thiết', level: 1, secKey: 'SEC:A' },
    { title: 'B. Phạm vi triển khai', level: 1, secKey: 'SEC:B' },
    { title: 'C. Nội dung', level: 1, secKey: '' },
    { title: '  C.1. Tình trạng giải pháp', level: 2, secKey: 'SEC:C1' },
    { title: '  C.b. Nội dung giải pháp', level: 2, secKey: 'SEC:Cb' },
    { title: '  C.c. Khả năng áp dụng', level: 2, secKey: 'SEC:Cd' },
    { title: '  C.d. Hiệu quả, lợi ích', level: 2, secKey: 'SEC:Cd' },
    { title: '  C.e. Phạm vi ảnh hưởng', level: 2, secKey: 'SEC:Ceg' },
    { title: '  C.g. Kiến nghị, đề xuất', level: 2, secKey: 'SEC:Ceg' },
    { title: 'D. Danh sách đồng tác giả', level: 1, secKey: 'SEC:D' },
    { title: 'E. Phụ lục & Minh chứng', level: 1, secKey: 'SEC:E' },
];

const SECTION_LABEL: Record<string, string> = {
    'SEC:bia': 'Đang viết bìa...', 'SEC:mucluc': 'Đang viết mục lục...',
    'SEC:A': 'Đang viết phần A...', 'SEC:B': 'Đang viết phần B...',
    'SEC:C1': 'Đang viết C.1...', 'SEC:Cb': 'Đang viết C.b (giải pháp)...',
    'SEC:Cd': 'Đang viết C.c & C.d...', 'SEC:Ceg': 'Đang viết C.e & C.g...',
    'SEC:D': 'Đang viết đồng tác giả...', 'SEC:E': 'Đang viết phụ lục...',
};

export default function TOCPanel() {
    const { tocSections, activeTocId, setActiveTocId, generatedContent, isGenerating, writingSection } = useSKKN();
    const listRef = useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState<Tab>('toc');

    const handleClick = (id: string) => {
        setActiveTocId(id);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Track scroll position to highlight active section
    useEffect(() => {
        const handleScroll = () => {
            const sections = tocSections.map(s => ({ ...s, el: document.getElementById(s.id) }));
            let current = '';
            sections.forEach(({ id, el }) => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 120) current = id;
                }
            });
            if (current) setActiveTocId(current);
        };
        const scrollEl = document.querySelector('[data-scroll="center"]');
        if (scrollEl) {
            scrollEl.addEventListener('scroll', handleScroll, { passive: true });
            return () => scrollEl.removeEventListener('scroll', handleScroll);
        }
    }, [tocSections, setActiveTocId]);

    // When generating starts, switch to TOC tab
    useEffect(() => {
        if (isGenerating) setTab('toc');
    }, [isGenerating]);

    const isWritingSection = (secKey: string) => secKey && writingSection === secKey;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#161b27', minHeight: 0 }}>
            {/* Header */}
            <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #2a3547', background: '#1c2333', flexShrink: 0 }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>🛠 Công cụ SKKN</h2>
                <div style={{ display: 'flex', gap: 4 }}>
                    {([['toc', '📋 Mục lục'], ['tools', '🤖 Công cụ AI']] as [Tab, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            style={{
                                flex: 1, padding: '4px 6px', borderRadius: 6, border: 'none',
                                fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                background: tab === key ? 'linear-gradient(135deg, #1e40af, #3730a3)' : '#0f172a',
                                color: tab === key ? '#bfdbfe' : '#64748b',
                                boxShadow: tab === key ? '0 2px 6px #1e40af44' : 'none',
                                transition: 'all 0.15s',
                            }}
                        >{label}</button>
                    ))}
                </div>
            </div>

            {/* Streaming progress bar */}
            {isGenerating && writingSection && (
                <div style={{ padding: '6px 10px', background: '#0a1628', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>✍️</span>
                        <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>
                            {SECTION_LABEL[writingSection] || 'Đang viết...'}
                        </span>
                    </div>
                    <div style={{ marginTop: 4, height: 3, background: '#1e2a3a', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 2,
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            animation: 'progress-pulse 1.5s ease-in-out infinite',
                            width: '60%',
                        }} />
                    </div>
                </div>
            )}

            {/* TOC Tab */}
            {tab === 'toc' && (
                <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 6px' }}>
                    {/* No content yet: show structure guide with writing indicators */}
                    {!generatedContent && (
                        <div>
                            <p style={{ fontSize: '10px', color: '#64748b', padding: '4px 6px 8px', fontStyle: 'italic' }}>
                                {isGenerating ? '🤖 AI đang tạo SKKN theo từng phần...' : 'Cấu trúc SKKN chuẩn VB 2989:'}
                            </p>
                            {SKKN_STRUCTURE.map((item, i) => {
                                const isWriting = isWritingSection(item.secKey);
                                return (
                                    <div key={i} style={{
                                        padding: `4px ${item.level === 2 ? '8px' : '6px'}`,
                                        paddingLeft: item.level === 2 ? 16 : 6,
                                        marginBottom: 2, borderRadius: 4,
                                        background: isWriting ? '#0f1f3d' : 'transparent',
                                        border: isWriting ? '1px solid #1e40af' : '1px solid transparent',
                                        transition: 'all 0.3s',
                                    }}>
                                        <span style={{ fontSize: '11px', color: isWriting ? '#60a5fa' : item.level === 1 ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {isWriting && <span style={{ animation: 'blink 1s infinite' }}>✍️</span>}
                                            {item.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* With content: show dynamic TOC with writing indicators */}
                    {generatedContent && tocSections.length > 0 && tocSections.map(section => {
                        // Find matching secKey
                        const matchedSec = SKKN_STRUCTURE.find(s =>
                            s.title.toLowerCase().includes(section.title.toLowerCase().slice(0, 5))
                        );
                        const isWriting = matchedSec ? isWritingSection(matchedSec.secKey) : false;

                        return (
                            <div key={section.id}
                                onClick={() => handleClick(section.id)}
                                style={{
                                    padding: '5px 8px',
                                    paddingLeft: section.level === 1 ? 8 : section.level === 2 ? 16 : 24,
                                    marginBottom: 2, borderRadius: 5,
                                    borderLeft: activeTocId === section.id ? '2px solid #3b82f6'
                                        : isWriting ? '2px solid #60a5fa' : '2px solid transparent',
                                    cursor: 'pointer',
                                    background: isWriting ? '#0a1628' : activeTocId === section.id ? '#1e3a5f22' : 'transparent',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    fontSize: section.level === 1 ? '12px' : '11px',
                                    fontWeight: section.level === 1 ? 600 : 400,
                                    color: isWriting ? '#60a5fa' : activeTocId === section.id ? '#60a5fa' : section.level === 1 ? '#cbd5e1' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    {isWriting && <span>✍️</span>}
                                    {section.title.length > 36 ? section.title.substring(0, 33) + '...' : section.title}
                                </span>
                            </div>
                        );
                    })}

                    {generatedContent && tocSections.length === 0 && !isGenerating && (
                        <p style={{ fontSize: '11px', color: '#64748b', padding: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                            Đang xây dựng mục lục...
                        </p>
                    )}
                </div>
            )}

            {/* AI Tools Tab */}
            {tab === 'tools' && (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px' }}>
                    <AIToolsPanel />
                </div>
            )}

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes progress-pulse {
                    0%{transform:translateX(-100%)} 50%{transform:translateX(0%)} 100%{transform:translateX(100%)}
                }
            `}</style>
        </div>
    );
}
