import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDQVAHOAVTMH_Pg7V4h_xQegU0m582arIU');

// ── EXACT scoring rubric (deterministic) ────────────────────────────────────
// Each criterion has fixed thresholds so scores don't vary between runs
const SCORING_RULES = `
TIÊU CHÍ 1 — Tính rõ ràng, cụ thể (25 điểm):
  - Tên nêu rõ PHƯƠNG PHÁP + ĐỐI TƯỢNG HS + MÔN HỌC: 21-25 điểm
  - Tên nêu rõ 2 trong 3 yếu tố trên: 14-20 điểm
  - Tên chỉ nêu 1 yếu tố hoặc quá chung chung: 7-13 điểm
  - Tên mơ hồ, không xác định được đối tượng/môn: 0-6 điểm

TIÊU CHÍ 2 — Tính mới, sáng tạo (20 điểm):
  - Có phương pháp/công nghệ/ứng dụng mới (AI, STEM, game...): 17-20 điểm
  - Kết hợp 2+ phương pháp quen thuộc theo hướng mới: 12-16 điểm
  - Một phương pháp quen thuộc, cải tiến nhỏ: 7-11 điểm
  - Không có điểm mới, nhắc lại phương pháp cũ: 0-6 điểm

TIÊU CHÍ 3 — Phù hợp CT 2018 và môn học (20 điểm):
  - Tên rõ ràng hướng phát triển năng lực/phẩm chất CT 2018: 17-20 điểm
  - Tên hướng đến dạy học tích cực nhưng chưa rõ CT 2018: 12-16 điểm
  - Tên trung lập, có thể áp dụng CT cũ hoặc mới: 7-11 điểm
  - Tên không liên quan hoặc mâu thuẫn CT 2018: 0-6 điểm

TIÊU CHÍ 4 — Tính thực tiễn, khả thi (20 điểm):
  - Có thể triển khai ngay, phù hợp trường vùng khó/Điện Biên: 17-20 điểm
  - Khả thi chung nhưng chưa rõ bối cảnh: 12-16 điểm
  - Cần nhiều điều kiện đặc biệt: 7-11 điểm
  - Không thực tế hoặc quá lý thuyết: 0-6 điểm

TIÊU CHÍ 5 — Độ ngắn gọn, súc tích (15 điểm):
  - Tên 6-12 từ, đúng trọng tâm: 13-15 điểm
  - Tên 4-5 từ (quá ngắn) hoặc 13-18 từ: 8-12 điểm
  - Tên 19-25 từ (hơi dài): 4-7 điểm
  - Tên >25 từ (quá dài) hoặc <4 từ: 0-3 điểm
`;

export async function POST(req: NextRequest) {
  try {
    const { title, subject, gradeLevel, mode } = await req.json();
    const isAnalyze = mode === 'analyze';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0,     // ← deterministic: same input → same output
        topP: 0.1,
        topK: 1,
      },
    });

    const wordCount = title ? title.trim().split(/\s+/).length : 0;

    const prompt = isAnalyze
      ? `Bạn là HĐKH chấm SKKN. Chấm điểm theo ĐÚNG TIÊU CHÍ bên dưới (KHÔNG thay đổi ngưỡng điểm).

THÔNG TIN:
- Tên SKKN: "${title}"
- Số từ: ${wordCount} từ
- Môn: ${subject || 'chưa rõ'} | Khối: ${gradeLevel || 'chưa rõ'}

${SCORING_RULES}

Chấm điểm CHÍNH XÁC theo ngưỡng trên, tổng = tổng 5 tiêu chí. 
Trả về JSON (không có text ngoài JSON):
{
  "totalScore": <tổng 5 tiêu chí, số nguyên>,
  "breakdown": [
    {"criterion": "Tính rõ ràng, cụ thể", "max": 25, "score": <số>, "comment": "<1 câu nhận xét về ${title}>"},
    {"criterion": "Tính mới, sáng tạo", "max": 20, "score": <số>, "comment": "<1 câu>"},
    {"criterion": "Phù hợp CT 2018 và môn học", "max": 20, "score": <số>, "comment": "<1 câu>"},
    {"criterion": "Tính thực tiễn, khả thi", "max": 20, "score": <số>, "comment": "<1 câu>"},
    {"criterion": "Độ ngắn gọn, súc tích", "max": 15, "score": <số>, "comment": "<1 câu>"}
  ],
  "rating": "<Xuất sắc nếu ≥85, Tốt nếu 70-84, Khá nếu 55-69, Trung bình nếu 40-54, Yếu nếu <40>",
  "strengths": ["<điểm mạnh cụ thể>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm yếu cụ thể>", "<điểm yếu 2>"],
  "alternatives": [
    {"title": "<tên cải tiến 1, 6-12 từ, môn ${subject}>", "score": <tự chấm theo tiêu chí>, "reason": "<lý do điểm cao hơn>"},
    {"title": "<tên cải tiến 2>", "score": <số>, "reason": "<lý do>"},
    {"title": "<tên hoàn toàn mới 1>", "score": <số>, "reason": "<lý do>"},
    {"title": "<tên hoàn toàn mới 2>", "score": <số>, "reason": "<lý do>"},
    {"title": "<tên hoàn toàn mới 3>", "score": <số>, "reason": "<lý do>"}
  ]
}`
      : `Gợi ý 8 tên SKKN hay cho môn ${subject || 'chưa rõ'} lớp ${gradeLevel || 'chưa rõ'}.
${title ? `Xoay quanh chủ đề: "${title}"` : 'Chủ đề tự chọn, sáng tạo.'}

${SCORING_RULES}

Với mỗi tên, chấm điểm theo tiêu chí trên. Trả về JSON:
{
  "suggestions": [
    {"title": "<tên SKKN 6-12 từ>", "score": <tự chấm>, "reason": "<lý do điểm cao>"},
    ...8 mục
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
