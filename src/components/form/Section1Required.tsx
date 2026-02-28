'use client';
import { useSKKN } from '@/context/SKKNContext';
import { GRADE_MAP, TeacherLevel } from '@/types/skkn';
import TitleAnalyzer from './TitleAnalyzer';

const TEACHER_LEVELS: TeacherLevel[] = ['Tiểu học', 'THCS', 'THPT'];

const F = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {children}
    </div>
);

const clsInput = (val: string, ph: string, onChange: (v: string) => void, type = 'text') => (
    <input type={type} value={val} placeholder={ph} onChange={e => onChange(e.target.value)}
        className="input-field" style={{ fontSize: '12px' }} />
);

export default function Section1Required() {
    const {
        formData, updateField,
        addCoAuthor, removeCoAuthor, updateCoAuthor,
        addCoAuthorClass, removeCoAuthorClass, updateCoAuthorClass,
        addExperimentalClass, removeExperimentalClass, updateExperimentalClass,
        addControlClass, removeControlClass, updateControlClass,
    } = useSKKN();

    const { coAuthors, experimentalClasses, controlClasses } = formData;
    const grades = GRADE_MAP[formData.teacherLevel as TeacherLevel];

    return (
        <div>
            <F label="Tên tác giả chính" required>
                <input type="text" value={formData.authorName}
                    onChange={e => updateField('authorName', e.target.value)}
                    placeholder="Nguyễn Văn A" className="input-field" />
            </F>
            <F label="Trường / Đơn vị" required>
                <input type="text" value={formData.school}
                    onChange={e => updateField('school', e.target.value)}
                    placeholder="Trường THCS Nậm Pồ" className="input-field" />
            </F>
            <F label="Địa điểm đơn vị" required>
                <input type="text" value={formData.location}
                    onChange={e => updateField('location', e.target.value)}
                    placeholder="Huyện Nậm Pồ, tỉnh Điện Biên" className="input-field" />
            </F>

            {/* Title + Analyzer */}
            <F label="Tên đề tài SKKN" required>
                <textarea value={formData.title}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="Ứng dụng phương pháp dạy học tích cực..." rows={3}
                    className="input-field" style={{ resize: 'none' }} />
                <TitleAnalyzer
                    title={formData.title}
                    subject={formData.subject}
                    gradeLevel={formData.gradeLevel}
                />
            </F>

            <F label="Môn học / Lĩnh vực" required>
                <input type="text" value={formData.subject}
                    onChange={e => updateField('subject', e.target.value)}
                    placeholder="Toán học" className="input-field" />
            </F>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <F label="GV khối" required>
                    <select value={formData.teacherLevel}
                        onChange={e => {
                            const lvl = e.target.value as TeacherLevel;
                            updateField('teacherLevel', lvl);
                            updateField('gradeLevel', String(GRADE_MAP[lvl][0]));
                        }}
                        className="input-field">
                        {TEACHER_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </F>
                <F label="Khối lớp" required>
                    <select value={formData.gradeLevel}
                        onChange={e => updateField('gradeLevel', e.target.value)}
                        className="input-field">
                        {grades.map(g => <option key={g} value={String(g)}>Lớp {g}</option>)}
                    </select>
                </F>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <F label="Tháng thi SKKN" required>
                    <select value={formData.examMonth}
                        onChange={e => updateField('examMonth', e.target.value)}
                        className="input-field">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={String(m)}>Tháng {m}</option>
                        ))}
                    </select>
                </F>
                <F label="Năm" required>
                    <select value={formData.examYear}
                        onChange={e => updateField('examYear', e.target.value)}
                        className="input-field">
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                </F>
            </div>
            <p style={{ fontSize: '11px', color: '#60a5fa', marginBottom: '10px', marginTop: '-4px' }}>
                💡 Thực nghiệm cần trước kì thi 2–3 học kì
            </p>

            <F label="Ứng dụng AI vào SKKN">
                <textarea value={formData.aiApplicationInfo}
                    onChange={e => updateField('aiApplicationInfo', e.target.value)}
                    placeholder="Dùng ChatGPT soạn bài, dùng AI tạo bài tập..."
                    rows={2} className="input-field" style={{ resize: 'none' }} />
            </F>
            <F label="Bộ SGK sử dụng">
                <input type="text" value={formData.textbook}
                    onChange={e => updateField('textbook', e.target.value)}
                    placeholder="Kết nối tri thức với cuộc sống" className="input-field" />
            </F>

            {/* ── Co-Authors with Experimental Classes ─────────────────────── */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Đồng tác giả</label>
                    <button onClick={addCoAuthor} className="btn-add">+ Thêm ĐTG</button>
                </div>
                {coAuthors.map((ca, idx) => (
                    <div key={ca.id} style={{ border: '1px solid #2a3547', borderRadius: 7, padding: '8px', marginBottom: 8, background: '#0f172a' }}>
                        {/* Name + School row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '4px', marginBottom: 6, alignItems: 'center' }}>
                            {clsInput(ca.name, `Tên ĐTG ${idx + 1}`, v => updateCoAuthor(ca.id, 'name', v))}
                            {clsInput(ca.school, 'Trường/Đơn vị', v => updateCoAuthor(ca.id, 'school', v))}
                            <button onClick={() => removeCoAuthor(ca.id)} className="btn-remove">✕</button>
                        </div>
                        {/* Co-author exp classes */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 600 }}>🔬 Lớp TN tại trường ĐTG</span>
                                <button onClick={() => addCoAuthorClass(ca.id)}
                                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: '#052e16', color: '#34d399', cursor: 'pointer' }}>
                                    + Lớp
                                </button>
                            </div>
                            {(ca.expClasses || []).length === 0 && (
                                <p style={{ fontSize: 9, color: '#4b5563', fontStyle: 'italic' }}>Chưa có lớp TN — bấm + Lớp để thêm</p>
                            )}
                            {(ca.expClasses || []).map(cl => (
                                <div key={cl.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 52px 1fr auto', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                                    {clsInput(cl.className, 'Tên lớp', v => updateCoAuthorClass(ca.id, cl.id, 'className', v))}
                                    {clsInput(cl.studentCount, 'Sĩ số', v => updateCoAuthorClass(ca.id, cl.id, 'studentCount', v), 'number')}
                                    {clsInput(cl.studentStatus, 'Tình trạng HS', v => updateCoAuthorClass(ca.id, cl.id, 'studentStatus', v))}
                                    <button onClick={() => removeCoAuthorClass(ca.id, cl.id)} className="btn-remove">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Experimental Classes */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#34d399' }}>🔬 Lớp thực nghiệm (chính)</label>
                    <button onClick={addExperimentalClass} className="btn-add">+ Thêm</button>
                </div>
                {experimentalClasses.map(cls => (
                    <div key={cls.id} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr auto', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                        {clsInput(cls.className, 'Tên lớp', v => updateExperimentalClass(cls.id, 'className', v))}
                        {clsInput(cls.studentCount, 'Sĩ số', v => updateExperimentalClass(cls.id, 'studentCount', v), 'number')}
                        {clsInput(cls.studentStatus, 'Tình trạng HS', v => updateExperimentalClass(cls.id, 'studentStatus', v))}
                        <button onClick={() => removeExperimentalClass(cls.id)} className="btn-remove">✕</button>
                    </div>
                ))}
            </div>

            {/* Control Classes */}
            <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#fb923c' }}>📊 Lớp đối chứng</label>
                    <button onClick={addControlClass} className="btn-add">+ Thêm</button>
                </div>
                {controlClasses.map(cls => (
                    <div key={cls.id} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr auto', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                        {clsInput(cls.className, 'Tên lớp', v => updateControlClass(cls.id, 'className', v))}
                        {clsInput(cls.studentCount, 'Sĩ số', v => updateControlClass(cls.id, 'studentCount', v), 'number')}
                        {clsInput(cls.studentStatus, 'Tình trạng HS', v => updateControlClass(cls.id, 'studentStatus', v))}
                        <button onClick={() => removeControlClass(cls.id)} className="btn-remove">✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
