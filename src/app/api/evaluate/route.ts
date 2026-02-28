import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDQVAHOAVTMH_Pg7V4h_xQegU0m582arIU');

// ── Fixed scoring rubric for consistent results ─────────────────────────────
const EVAL_RUBRIC = `
TIÊU CHÍ CHẤM ĐIỂM SKKN (thang 100, VB 2989/SGDĐT-QLĐT Điện Biên):

1. TÍNH MỚI, SÁNG TẠO (25 điểm):
   - Giải pháp hoàn toàn mới, chưa từng được công bố: 21-25 điểm
   - Giải pháp cải tiến đáng kể từ cái đã có: 14-20 điểm
   - Kết hợp 2+ phương pháp có sẵn theo cách mới: 8-13 điểm
   - Ít cải tiến, gần như sao chép: 0-7 điểm

2. TÍNH KHOA HỌC, LÝ LUẬN (20 điểm):
   - Cơ sở lý luận vững, trích dẫn nghiên cứu, logic chặt chẽ: 17-20 điểm
   - Lý luận đầy đủ nhưng thiếu trích dẫn: 12-16 điểm
   - Lý luận sơ lược: 7-11 điểm
   - Thiếu cơ sở lý luận: 0-6 điểm

3. TÍNH THỰC TIỄN, KHẢ THI (20 điểm):
   - Mô tả chi tiết từng bước, ví dụ cụ thể, áp dụng được ngay: 17-20 điểm
   - Mô tả đủ nhưng thiếu chi tiết: 12-16 điểm
   - Mô tả chung chung: 7-11 điểm
   - Không rõ cách triển khai: 0-6 điểm

4. HIỆU QUẢ, LỢI ÍCH (20 điểm):
   - Có số liệu cụ thể trước/sau, kiểm định thống kê, cải thiện rõ: 17-20 điểm
   - Số liệu đủ nhưng chưa kiểm định: 12-16 điểm
   - Số liệu mờ nhạt hoặc khảo sát nhỏ: 7-11 điểm
   - Không có số liệu: 0-6 điểm

5. PHẠM VI ẢNH HƯỞNG, KHẢ NĂNG NHÂN RỘNG (10 điểm):
   - Đã/có thể nhân rộng toàn tỉnh/quốc gia: 8-10 điểm
   - Nhân rộng trong huyện/thành phố: 5-7 điểm
   - Chỉ áp dụng trong trường: 2-4 điểm
   - Không rõ phạm vi: 0-1 điểm

6. HÌNH THỨC TRÌNH BÀY, CẤU TRÚC (5 điểm):
   - Đúng cấu trúc VB 2989, trình bày đẹp, đầy đủ phụ lục: 4-5 điểm
   - Đủ cấu trúc nhưng một số phần sơ sài: 2-3 điểm
   - Thiếu phần quan trọng hoặc trình bày kém: 0-1 điểm
`;

export async function POST(req: NextRequest) {
    try {
        const { content, formData } = await req.json();
        if (!content) return NextResponse.json({ error: 'Không có nội dung SKKN' }, { status: 400 });

        const plainText = content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 12000);

        // Count specific markers in content to assist scoring
        const hasTables = (content.match(/<table/gi) || []).length;
        const hasCharts = (content.match(/chart-directive/gi) || []).length;
        const hasImages = (content.match(/img-placeholder/gi) || []).length;
        const hasAppendix = content.toLowerCase().includes('phụ lục') ? 1 : 0;
        const hasStats = /\d{1,2}[.,]\d%/.test(content) ? 1 : 0;
        const wordCount = plainText.split(/\s+/).length;

        const prompt = `Bạn là HĐKH chấm SKKN theo VB 2989/SGDĐT-QLĐT Điện Biên. 
Chấm điểm CHÍNH XÁC theo tiêu chí bên dưới. KHÔNG tự ý thay đổi thang điểm.

THÔNG TIN SKKN:
- Đề tài: "${formData?.title || 'N/A'}" | Môn: ${formData?.subject || 'N/A'} | Lớp: ${formData?.gradeLevel || 'N/A'}
- Số từ ước tính: ${wordCount} từ
- Số bảng số liệu: ${hasTables} | Số biểu đồ: ${hasCharts} | Số ảnh minh chứng: ${hasImages}
- Có phụ lục: ${hasAppendix ? 'Có' : 'Không'} | Có số liệu cụ thể %: ${hasStats ? 'Có' : 'Không'}

${EVAL_RUBRIC}

NỘI DUNG SKKN (trích):
${plainText}

Trả về JSON hợp lệ (KHÔNG text ngoài JSON):
{
  "totalScore": <tổng 6 tiêu chí, nguyên>,
  "breakdown": [
    {"criterion": "Tính mới, sáng tạo", "max": 25, "score": <nguyên, trong range tiêu chí>, "comment": "<nhận xét cụ thể>"},
    {"criterion": "Tính khoa học, lý luận", "max": 20, "score": <nguyên>, "comment": "<nhận xét>"},
    {"criterion": "Tính thực tiễn, khả thi", "max": 20, "score": <nguyên>, "comment": "<nhận xét>"},
    {"criterion": "Hiệu quả, lợi ích", "max": 20, "score": <nguyên>, "comment": "<nhận xét>"},
    {"criterion": "Phạm vi ảnh hưởng", "max": 10, "score": <nguyên>, "comment": "<nhận xét>"},
    {"criterion": "Hình thức trình bày", "max": 5, "score": <nguyên>, "comment": "<nhận xét>"}
  ],
  "rating": "<Xuất sắc nếu ≥85, Tốt 70-84, Khá 55-69, Trung bình 40-54, Yếu <40>",
  "strengths": ["<ưu điểm 1>", "<ưu điểm 2>", "<ưu điểm 3>"],
  "weaknesses": ["<lỗi 1 + vị trí>", "<lỗi 2>", "<lỗi 3>"],
  "suggestions": ["<gợi ý cải thiện 1>", "<gợi ý 2>", "<gợi ý 3>", "<gợi ý 4>"],
  "improvedParagraph": "<Viết lại 1 đoạn yếu nhất trong SKKN, phiên bản đã nâng cấp, bằng HTML thuần>"
}`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 4096,
                temperature: 0,    // ← deterministic
                topP: 0.1,
                topK: 1,
            },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const json = JSON.parse(text);

        // Also generate HTML display
        const html = buildEvalHTML(json);
        return NextResponse.json({ html, json });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

function buildEvalHTML(data: {
    totalScore: number; rating: string;
    breakdown: { criterion: string; max: number; score: number; comment: string }[];
    strengths: string[]; weaknesses: string[]; suggestions: string[];
    improvedParagraph?: string;
}): string {
    const ratingColor: Record<string, string> = {
        'Xuất sắc': '#10b981', 'Tốt': '#3b82f6', 'Khá': '#f59e0b',
        'Trung bình': '#f97316', 'Yếu': '#ef4444',
    };
    const color = ratingColor[data.rating] || '#94a3b8';

    const bars = data.breakdown.map(b => {
        const pct = Math.round(b.score / b.max * 100);
        const c = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
        return `<tr>
<td style="padding:4px 6px;font-size:10px">${b.criterion}</td>
<td style="padding:4px 6px;font-size:10px;text-align:center"><strong style="color:${c}">${b.score}/${b.max}</strong></td>
<td style="padding:4px 6px">
  <div style="height:6px;background:#1e2a3a;border-radius:3px;overflow:hidden">
    <div style="width:${pct}%;height:100%;background:${c};border-radius:3px"></div>
  </div>
</td>
<td style="padding:4px 6px;font-size:9px;color:#64748b;font-style:italic">${b.comment}</td>
</tr>`;
    }).join('');

    return `
<h2 style="color:#000;font-weight:bold">KẾT QUẢ ĐÁNH GIÁ SKKN</h2>
<div style="display:flex;align-items:center;gap:12px;margin:10px 0;padding:10px;background:#0f172a;border-radius:8px;border:1px solid ${color}44">
  <span style="font-size:28px;font-weight:800;color:#e2e8f0">${data.totalScore}</span>
  <span style="color:#64748b;font-size:12px">/100</span>
  <span style="background:${color}22;color:${color};border:1px solid ${color};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">${data.rating}</span>
</div>
<h3 style="color:#000;font-weight:bold;margin:10px 0 4px">📊 Chi tiết điểm số</h3>
<table style="width:100%;border-collapse:collapse">${bars}</table>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0">
  <div style="background:#052e16;border-radius:6px;padding:8px">
    <p style="font-size:10px;color:#10b981;font-weight:700;margin-bottom:4px">✅ Ưu điểm</p>
    ${(data.strengths || []).map(s => `<p style="font-size:9px;color:#6ee7b7">• ${s}</p>`).join('')}
  </div>
  <div style="background:#2d1010;border-radius:6px;padding:8px">
    <p style="font-size:10px;color:#ef4444;font-weight:700;margin-bottom:4px">⚠ Hạn chế</p>
    ${(data.weaknesses || []).map(w => `<p style="font-size:9px;color:#fca5a5">• ${w}</p>`).join('')}
  </div>
</div>
<h3 style="color:#000;font-weight:bold;margin:8px 0 4px">💡 Gợi ý nâng cấp</h3>
<ol style="padding-left:14px">${(data.suggestions || []).map(s => `<li style="font-size:10px;margin:3px 0;color:#cbd5e1">${s}</li>`).join('')}</ol>
${data.improvedParagraph ? `<h3 style="color:#000;font-weight:bold;margin:8px 0 4px">✏ Đoạn văn đã nâng cấp mẫu</h3><div style="background:#0a1628;border-left:3px solid #3b82f6;padding:10px;border-radius:4px;font-size:10px;line-height:1.7;color:#cbd5e1">${data.improvedParagraph}</div>` : ''}`;
}
