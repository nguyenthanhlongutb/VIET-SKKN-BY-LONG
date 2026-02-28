'use client';
import { useRef } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import { PdfFile } from '@/types/skkn';

const MAX_FILES = 5;
const WARN_TOTAL_MB = 40; // warn if total exceeds 40MB (Gemini inline_data limit)

export default function Section3Supplement() {
    const { formData, updateField, referencePdfs, setReferencePdfs } = useSKKN();
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        const remaining = MAX_FILES - referencePdfs.length;
        const toAdd = files.slice(0, remaining);

        const converted: PdfFile[] = await Promise.all(toAdd.map(file => new Promise<PdfFile>((resolve, reject) => {
            // No per-file size limit — Gemini can handle large PDFs
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1] || '';
                resolve({ name: file.name, base64, size: file.size });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        })));

        setReferencePdfs(prev => [...prev, ...converted]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function removePdf(name: string) {
        setReferencePdfs(prev => prev.filter(p => p.name !== name));
    }

    const sizeKB = (b: number) => b < 1024 * 1024 ? `${Math.round(b / 1024)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Desired pages */}
            <div>
                <label style={lbl}>Số trang mong muốn <span style={{ color: '#fbbf24' }}>≥</span></label>
                <input type="number" value={formData.desiredPages}
                    onChange={e => updateField('desiredPages', e.target.value)}
                    placeholder="30" min={15} max={80} className="input-field" />
            </div>

            {/* Number of solutions */}
            <div>
                <label style={lbl}>Số biện pháp/giải pháp trong C.b <span style={{ color: '#fbbf24' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={formData.numSolutions || '3'}
                        onChange={e => updateField('numSolutions', e.target.value)}
                        min={1} max={8} placeholder="3" className="input-field"
                        style={{ width: 70 }} />
                    <span style={{ fontSize: 10, color: '#64748b' }}>biện pháp (1-8), AI sẽ viết đúng số này</span>
                </div>
            </div>

            {/* Topic focus */}
            <div>
                <label style={lbl}>Đặc thù / Trọng tâm đề tài</label>
                <textarea value={formData.topicFocus}
                    onChange={e => updateField('topicFocus', e.target.value)}
                    placeholder="Mô tả đặc điểm nổi bật, hướng tiếp cận, điểm mới..."
                    rows={3} className="input-field" style={{ resize: 'none' }} />
            </div>

            {/* PDF Upload */}
            <div>
                <label style={lbl}>
                    📎 Tài liệu tham khảo (PDF){' '}
                    <span style={{ color: '#64748b', fontWeight: 400 }}>tối đa {MAX_FILES} file (không giới hạn kích thước)</span>
                </label>
                {referencePdfs.reduce((s, p) => s + p.size, 0) > WARN_TOTAL_MB * 1024 * 1024 && (
                    <p style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}>⚠ Tổng dung lượng lớn — có thể ảnh hưởng tốc độ gửi API</p>
                )}

                {referencePdfs.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        {referencePdfs.map(pdf => (
                            <div key={pdf.name} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#0f172a', borderRadius: 6, padding: '5px 8px', marginBottom: 4,
                                border: '1px solid #1e3a5f',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <span style={{ fontSize: 14 }}>📄</span>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: 10, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {pdf.name}
                                        </p>
                                        <p style={{ fontSize: 9, color: '#64748b' }}>{sizeKB(pdf.size)}</p>
                                    </div>
                                </div>
                                <button onClick={() => removePdf(pdf.name)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {referencePdfs.length < MAX_FILES ? (
                    <>
                        <input ref={fileInputRef} type="file" accept=".pdf" multiple
                            onChange={handlePdfUpload}
                            style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%', padding: '7px', borderRadius: 6,
                                border: '1.5px dashed #2a3547', background: '#0f172a',
                                color: '#64748b', fontSize: 10, cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a3547')}
                        >
                            + Thêm file PDF tham khảo ({referencePdfs.length}/{MAX_FILES} — không giới hạn kích thước)
                        </button>
                        <p style={{ fontSize: 9, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                            AI sẽ đọc các tài liệu PDF này và tích hợp nội dung vào SKKN của bạn
                        </p>
                    </>
                ) : (
                    <p style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>
                        ✓ Đã đạt tối đa {MAX_FILES} file
                    </p>
                )}
            </div>
        </div>
    );
}

const lbl: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: 4,
};
