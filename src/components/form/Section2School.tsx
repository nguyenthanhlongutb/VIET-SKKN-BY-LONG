'use client';
import { useSKKN } from '@/context/SKKNContext';

export default function Section2School() {
    const { formData, updateField } = useSKKN();
    return (
        <div>
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    Thông tin khái quát về nhà trường
                </label>
                <textarea value={formData.schoolOverview}
                    onChange={e => updateField('schoolOverview', e.target.value)}
                    placeholder="Trường THCS ... được thành lập năm ..., có ... lớp với ... học sinh, đạt trường chuẩn quốc gia ..."
                    rows={4} className="input-field" style={{ resize: 'none' }} />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    Điều kiện cơ sở vật chất (CSVC)
                </label>
                <textarea value={formData.facilities}
                    onChange={e => updateField('facilities', e.target.value)}
                    placeholder="Phòng học máy tính, máy chiếu, kết nối internet, thư viện ..."
                    rows={3} className="input-field" style={{ resize: 'none' }} />
            </div>
        </div>
    );
}
