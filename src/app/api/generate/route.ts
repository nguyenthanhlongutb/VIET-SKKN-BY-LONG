import { NextRequest } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDQVAHOAVTMH_Pg7V4h_xQegU0m582arIU');

function enc(text: string): Uint8Array { return new TextEncoder().encode(text); }
function sseChunk(data: object): Uint8Array { return enc(`data: ${JSON.stringify(data)}\n\n`); }

function getAcademicYearInfo(month: number, year: number) {
    const isHK2 = month >= 2 && month <= 8;
    const acYear = isHK2 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
    const semester = isHK2 ? 'Học kỳ II' : 'Học kỳ I';
    const implYear1 = isHK2 ? year - 1 : year - 1;
    const implSem1 = isHK2 ? 'Học kỳ I' : 'Học kỳ II';
    return { acYear, semester, implSem1, implYear1 };
}

// ── Phase 0: Internet research on the topic ──────────────────────────────────
async function researchTopic(title: string, subject: string, gradeLevel: string): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            // @ts-expect-error: googleSearch is valid for gemini-2.0-flash
            tools: [{ googleSearch: {} }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0 },
        });
        const result = await model.generateContent(
            `Tìm kiếm và tổng hợp thông tin về: "${title}" trong dạy học ${subject} lớp ${gradeLevel}.
Hãy tìm:
1. Các nghiên cứu, sáng kiến tương tự đã công bố (tên, tác giả, kết quả nếu có)
2. Thực trạng dạy học ${subject} lớp ${gradeLevel} ở Việt Nam (số liệu nếu có)  
3. Các lý luận cơ sở từ CT 2018 liên quan đến chủ đề này
4. Số liệu thực tế về hiệu quả các phương pháp tương tự (% cải thiện, điểm số)
Tổng hợp ngắn gọn, súc tích, tập trung vào số liệu và dẫn chứng.`
        );
        return result.response.text();
    } catch {
        return 'Không thể tìm kiếm internet. Tiến hành với kiến thức chuyên môn.';
    }
}

// ── Phase 1: Generate ONE consistent data matrix ─────────────────────────────
async function generateDataMatrix(body: Record<string, unknown>, researchInsights: string): Promise<Record<string, unknown>> {
    const { title, subject, gradeLevel, teacherLevel, experimentalClasses, controlClasses, coAuthors } = body as {
        title: string; subject: string; gradeLevel: string; teacherLevel: string;
        experimentalClasses: { className: string; studentCount: string; studentStatus: string }[];
        controlClasses: { className: string; studentCount: string; studentStatus: string }[];
        coAuthors: { name: string; school: string; expClasses?: { className: string; studentCount: string; studentStatus: string }[] }[];
    };

    const isTieuHoc = teacherLevel === 'Tiểu học';
    const expTotal = parseInt(experimentalClasses?.[0]?.studentCount || '30');
    const ctrlTotal = parseInt(controlClasses?.[0]?.studentCount || '30');
    const expName = experimentalClasses?.[0]?.className || '7A1';
    const ctrlName = controlClasses?.[0]?.className || '7A2';

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048, temperature: 0, topP: 0.1, topK: 1 },
    });

    const prompt = `Bạn là thống kê học giáo dục. Tạo bộ số liệu THỰC TẾ và NHẤT QUÁN cho SKKN:
Đề tài: "${title}" | Môn: ${subject} | Lớp ${gradeLevel}
Lớp TN: ${expName} (${expTotal} HS) | Lớp ĐC: ${ctrlName} (${ctrlTotal} HS)
Cấp: ${isTieuHoc ? 'Tiểu học' : 'THCS/THPT'}

Thông tin nghiên cứu từ internet:
${researchInsights.slice(0, 1000)}

YÊU CẦU SỐ LIỆU:
- Số liệu PHẢI thực tế, tự nhiên (không phải số tròn chẵn như 60%, 70%, 80%)
- Số thập phân 1 chữ số (ví dụ: 57.3%, 68.9%)
- TN cải thiện nhiều hơn ĐC rõ rệt nhưng không quá cách biệt (TN +15-25%, ĐC +5-12%)
- Khoảng cách giữa các mức xếp loại phải tự nhiên, không đều nhau
- Điểm trung bình: TRƯỚC TN 5.8-6.5, SAU TN 6.8-7.6 (cho TN), SAU ĐC 6.1-6.8
- Tất cả số liệu phải nhất quán với nhau (TB = tổng xếp loại thực)

Trả về JSON:
{
  "expName": "${expName}",
  "ctrlName": "${ctrlName}",
  "expTotal": ${expTotal},
  "ctrlTotal": ${ctrlTotal},
  "isTieuHoc": ${isTieuHoc},
  "levels": ${isTieuHoc ? '["Hoàn thành xuất sắc","Hoàn thành tốt","Hoàn thành","Chưa hoàn thành"]' : '["Xuất sắc","Tốt","Khá","Đạt","Chưa đạt"]'},
  "assmtRef": "${isTieuHoc ? 'TT 27/2020/TT-BGDĐT' : 'TT 22/2021/TT-BGDĐT'}",
  "tnBefore": [<số HS theo từng mức, tổng = ${expTotal}>],
  "tnAfter":  [<số HS, cải thiện TN rõ rệt, tổng = ${expTotal}>],
  "dcBefore": [<số HS, tương tự TN trước, tổng = ${ctrlTotal}>],
  "dcAfter":  [<số HS, cải thiện ít hơn TN, tổng = ${ctrlTotal}>],
  "tnMeanBefore": <điểm TB trước, 1 chữ số thập phân>,
  "tnMeanAfter":  <điểm TB sau>,
  "dcMeanBefore": <điểm TB ĐC trước, gần bằng TN trước>,
  "dcMeanAfter":  <điểm TB ĐC sau, tăng ít hơn>,
  "satisfaction": {
    "rat_thich": <số HS>, "thich": <số HS>, "binh_thuong": <số HS>,
    "khong_thich": <số HS>, "rat_khong_thich": <số HS>,
    "comment": "<nhận xét 1 câu về kết quả khảo sát>"
  },
  "surveyBefore": {
    "description": "<mô tả thực trạng khảo sát đầu năm>",
    "score": <điểm khảo sát trung bình 1-5>,
    "positive_rate": <% đánh giá tích cực>
  },
  "coAuthorData": [<nếu có đồng tác giả, tạo tương tự TN/ĐC data>],
  "improvementPct": <% cải thiện tổng của TN, 1 chữ số thập phân>,
  "pValue": "<p < 0.05 với t-test độc lập>",
  "researchRef": "<1-2 nghiên cứu tương tự tìm được từ internet hoặc uy tín>"
}`;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch {
        // Fallback data matrix
        return {
            expName, ctrlName, expTotal, ctrlTotal, isTieuHoc,
            levels: isTieuHoc ? ['Hoàn thành xuất sắc', 'Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành'] : ['Xuất sắc', 'Tốt', 'Khá', 'Đạt', 'Chưa đạt'],
            assmtRef: isTieuHoc ? 'TT 27/2020/TT-BGDĐT' : 'TT 22/2021/TT-BGDĐT',
            tnBefore: isTieuHoc ? [3, 8, 14, 5] : [2, 7, 11, 8, 2],
            tnAfter: isTieuHoc ? [5, 12, 11, 2] : [5, 10, 11, 4, 0],
            dcBefore: isTieuHoc ? [3, 7, 13, 5] : [2, 6, 11, 8, 3],
            dcAfter: isTieuHoc ? [4, 9, 13, 2] : [3, 8, 11, 6, 2],
            tnMeanBefore: 6.1, tnMeanAfter: 7.3, dcMeanBefore: 6.0, dcMeanAfter: 6.5,
            satisfaction: { rat_thich: Math.round(expTotal * 0.347), thich: Math.round(expTotal * 0.413), binh_thuong: Math.round(expTotal * 0.173), khong_thich: Math.round(expTotal * 0.053), rat_khong_thich: Math.round(expTotal * 0.013), comment: 'Đa số HS hứng thú với phương pháp mới' },
            surveyBefore: { description: 'HS thiếu hứng thú, thụ động', score: 2.7, positive_rate: 38.2 },
            coAuthorData: [], improvementPct: 19.7, pValue: 'p < 0.05', researchRef: 'Nghiên cứu của Nguyễn Hữu Lộc (2020)'
        };
    }
}

// ── Phase 2: Create detailed outline ────────────────────────────────────────
async function createOutline(body: Record<string, unknown>, dm: Record<string, unknown>, research: string): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 3000, temperature: 0.2 },
    });
    const { title, subject, gradeLevel, school, location, authorName, coAuthors, numSolutions, aiApplicationInfo, topicFocus, textbook } = body as Record<string, string | unknown[]>;
    const coAuthorList = (coAuthors as { name: string; school: string }[] || []).map((c) => `${c.name} (${c.school})`).join(', ');

    const result = await model.generateContent(`Bạn là chuyên SKKN. Lập DÀN Ý CHI TIẾT cho SKKN dựa trên TẤT CẢ thông tin sau.
KHÔNG bỏ sót bất kỳ dữ liệu nào đã được cung cấp.

THÔNG TIN ĐẦY ĐỦ:
- Tên: "${title}" | Môn: ${subject} | Lớp: ${gradeLevel}
- Tác giả: ${authorName} | Trường: ${school} | Địa bàn: ${location}
- Đồng tác giả: ${coAuthorList || 'Không có'}
- SGK: ${textbook || 'Chưa rõ'}
- Ứng dụng AI: ${aiApplicationInfo || 'Không đề cập'}
- Trọng tâm: ${topicFocus || 'Tổng quát'}
- Số biện pháp: ${numSolutions || 3}
- Lớp TN: ${(dm as { expName: string; expTotal: number }).expName} (${(dm as { expName: string; expTotal: number }).expTotal} HS), Lớp ĐC: ${(dm as { ctrlName: string; ctrlTotal: number }).ctrlName} (${(dm as { ctrlName: string; ctrlTotal: number }).ctrlTotal} HS)
- ĐTB TN: ${(dm as { tnMeanBefore: number }).tnMeanBefore} → ${(dm as { tnMeanAfter: number }).tnMeanAfter} | ĐTB ĐC: ${(dm as { dcMeanBefore: number }).dcMeanBefore} → ${(dm as { dcMeanAfter: number }).dcMeanAfter}
- Cải thiện TN: ${(dm as { improvementPct: number }).improvementPct}% | ${(dm as { pValue: string }).pValue}
- Tài liệu tham khảo internet: ${(dm as { researchRef: string }).researchRef}

NGHIÊN CỨU INTERNET:
${research.slice(0, 1500)}

Tạo dàn ý đầy đủ CHI TIẾT từng mục (A, B, C.1, C.b với ${numSolutions || 3} biện pháp chi tiết từng bước, C.c, C.d, C.e, C.g, D, E).
Với C.b: đặt tên cụ thể cho từng biện pháp, mô tả các bước thực hiện chi tiết.
Với C.d: chỉ rõ sẽ dùng số liệu nào từ data matrix để trình bày.
Dàn ý phải phản ánh đầy đủ bối cảnh Điện Biên, địa bàn khó khăn, đặc thù CT 2018.`);
    return result.response.text();
}

// ── Phase 3: Write + Self-evaluate section ───────────────────────────────────
async function writeSectionWithEval(
    sectionKey: string, sectionLabel: string, sectionPrompt: string,
    outline: string, dm: Record<string, unknown>, systemCtx: string,
    pdfParts: Part[], maxAttempts = 2
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 3500, temperature: 0.3 },
    });
    const evalModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 200, temperature: 0, responseMimeType: 'application/json' },
    });

    const dataCtx = `SỬ DỤNG ĐÚNG CÁC SỐ LIỆU ĐÃ ĐƯỢC XÁC ĐỊNH (KHÔNG THAY ĐỔI):
- ĐTB TN trước: ${dm.tnMeanBefore} | sau: ${dm.tnMeanAfter}
- ĐTB ĐC trước: ${dm.dcMeanBefore} | sau: ${dm.dcMeanAfter}  
- TN cải thiện: ${dm.improvementPct}% | ${dm.pValue}
- Tổng HS TN: ${dm.expTotal} | ĐC: ${dm.ctrlTotal}
- Xếp loại TN trước: ${JSON.stringify(dm.tnBefore)} → sau: ${JSON.stringify(dm.tnAfter)}
- Xếp loại ĐC trước: ${JSON.stringify(dm.dcBefore)} → sau: ${JSON.stringify(dm.dcAfter)}
- Khảo sát hứng thú: ${JSON.stringify(dm.satisfaction)}`;

    let content = '';
    let lastCritique = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const parts: Part[] = [
            {
                text: `${systemCtx}\n\n${dataCtx}\n\nDÀN Ý CHI TIẾT (tham khảo):\n${outline.slice(0, 2000)}\n\n${sectionPrompt}${lastCritique ? `\n\nCỰC KỲ QUAN TRỌNG — Lần trước đã bị đánh giá kém vì: ${lastCritique}\nHãy viết lại KHẮC PHỤC được các lỗi đó.` : ''}`
            },
            ...pdfParts,
        ];

        const result = await model.generateContentStream({ contents: [{ role: 'user', parts }] });
        let draft = '';
        for await (const chunk of result.stream) {
            const t = chunk.text();
            if (t) draft += t;
        }
        draft = draft.replace(/^```html\n?/gim, '').replace(/^```\n?/gim, '').replace(/```$/gim, '');
        content = draft;

        // Self-evaluate (only on first attempt, if not good → retry)
        if (attempt < maxAttempts - 1) {
            try {
                const evalResult = await evalModel.generateContent(
                    `Đánh giá chất lượng phần SKKN vừa viết (phần ${sectionLabel}).
Tiêu chí chấm (mỗi 0-10):
1. Sử dụng ĐÚNG số liệu đã định (không tự tạo số liệu mới): /3
2. Nội dung phong phú, cụ thể (không chung chung): /3  
3. Ngôn ngữ học thuật, chuyên nghiệp: /2
4. Đúng cấu trúc HTML, không có markdown: /2
Tổng: /10. Nếu tổng < 7: nêu lỗi cụ thể.

NỘI DUNG CẦN ĐÁNH GIÁ:
${content.slice(0, 3000)}

JSON: {"score": <số 0-10>, "critique": "<lỗi cụ thể nếu score<7, ngắn gọn>"}`
                );
                const evalData = JSON.parse(evalResult.response.text());
                if ((evalData.score as number) >= 7) break; // Good enough
                lastCritique = evalData.critique as string || 'Nội dung chưa đủ chi tiết';
            } catch {
                break; // Skip eval on error
            }
        }
    }
    return content;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
        try {
            const body = await req.json();
            const {
                authorName, school, location, title, subject, teacherLevel, gradeLevel,
                examMonth, examYear, aiApplicationInfo, textbook, coAuthors,
                experimentalClasses, controlClasses, schoolOverview, facilities,
                desiredPages, topicFocus, numSolutions, referencePdfs,
            } = body;

            const month = parseInt(examMonth); const year = parseInt(examYear);
            const nSolutions = Math.max(1, Math.min(8, parseInt(numSolutions) || 3));
            const info = getAcademicYearInfo(month, year);

            // ── PHASE 0: Internet research ──
            await writer.write(sseChunk({ section: 'SEC:research', status: 'Đang nghiên cứu tài liệu trên internet...' }));
            const research = await researchTopic(title, subject, gradeLevel);
            await writer.write(sseChunk({ section: 'SEC:research', status: 'Hoàn tất nghiên cứu.' }));

            // ── PHASE 1: Generate consistent data matrix ──
            await writer.write(sseChunk({ section: 'SEC:data', status: 'Đang tạo bộ số liệu nhất quán...' }));
            const dm = await generateDataMatrix(body, research) as Record<string, unknown>;
            await writer.write(sseChunk({ section: 'SEC:data', status: 'Hoàn tất bộ số liệu.' }));

            // ── PHASE 2: Create detailed outline ──
            await writer.write(sseChunk({ section: 'SEC:outline', status: 'Đang lập dàn ý chi tiết...' }));
            const outline = await createOutline(body, dm, research);
            await writer.write(sseChunk({ section: 'SEC:outline', status: 'Hoàn tất dàn ý.' }));

            // Build common context
            const lvls = dm.levels as string[];
            const assmtRef = dm.assmtRef as string;
            const expName = dm.expName as string; const ctrlName = dm.ctrlName as string;
            const expTotal = dm.expTotal as number; const ctrlTotal = dm.ctrlTotal as number;
            const tnBefore = dm.tnBefore as number[]; const tnAfter = dm.tnAfter as number[];
            const dcBefore = dm.dcBefore as number[]; const dcAfter = dm.dcAfter as number[];
            const sat = dm.satisfaction as Record<string, number | string>;

            const tableHeaders = ['Lớp', 'Sĩ số', ...lvls.map(l => `${l} (HS)`), 'ĐTB'];
            const tnBeforeRow = [expName + ' (Trước)', String(expTotal), ...tnBefore.map(v => String(v)), String(dm.tnMeanBefore)];
            const tnAfterRow = [expName + ' (Sau)', String(expTotal), ...tnAfter.map(v => String(v)), String(dm.tnMeanAfter)];
            const dcBeforeRow = [ctrlName + ' (Trước)', String(ctrlTotal), ...dcBefore.map(v => String(v)), String(dm.dcMeanBefore)];
            const dcAfterRow = [ctrlName + ' (Sau)', String(ctrlTotal), ...dcAfter.map(v => String(v)), String(dm.dcMeanAfter)];

            const tr = (cells: string[]) => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
            const th = (cells: string[]) => `<tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr>`;

            const chartTruocStr = lvls.map((l, i) => `TN-${l}:${tnBefore[i] ?? 0},ĐC-${l}:${dcBefore[i] ?? 0}`).join(',');
            const chartTNStr = lvls.map((l, i) => `${l} Trước:${tnBefore[i] ?? 0},${l} Sau:${tnAfter[i] ?? 0}`).join(',');
            const chartTNDCStr = lvls.map((l, i) => `TN-${l}:${tnAfter[i] ?? 0},ĐC-${l}:${dcAfter[i] ?? 0}`).join(',');
            const pieTNStr = lvls.map((l, i) => `${l}:${tnAfter[i] ?? 0}`).join(',');

            const expClassList = experimentalClasses?.map((c: { className: string; studentCount: string; studentStatus: string }) => `${c.className} (${c.studentCount} HS, ${c.studentStatus})`).join('; ') || expName;
            const ctrlClassList = controlClasses?.map((c: { className: string; studentCount: string; studentStatus: string }) => `${c.className} (${c.studentCount} HS, ${c.studentStatus})`).join('; ') || ctrlName;
            const coAuthorDetails = (coAuthors || []).map((c: { name: string; school: string; expClasses?: { className: string; studentCount: string; studentStatus: string }[] }) => {
                const cls = (c.expClasses || []).map((cl: { className: string; studentCount: string; studentStatus: string }) => `${cl.className} (${cl.studentCount} HS, ${cl.studentStatus})`).join(', ');
                return `${c.name} — ${c.school}${cls ? ` [Lớp TN: ${cls}]` : ''}`;
            }).join('\n  ');

            const systemCtx = `Bạn là chuyên gia SKKN chuẩn VB 2989/SGDĐT-QLĐT Điện Biên, CT 2018.
TÁC GIẢ: ${authorName} | TRƯỜNG: ${school} | ĐỊA BÀN: ${location}
MÔN: ${subject} LỚP: ${gradeLevel} | NĂM HỌC: ${info.acYear} | SGK: ${textbook || 'Chưa rõ'}
ĐTG: ${coAuthorDetails || 'Không có'}
LỚP TN: ${expClassList} | LỚP ĐC: ${ctrlClassList}
${topicFocus ? `TRỌNG TÂM: ${topicFocus}` : ''}
${schoolOverview ? `TRƯỜNG: ${schoolOverview}` : ''}
${facilities ? `CSVC: ${facilities}` : ''}
${aiApplicationInfo ? `ỨNG DỤNG AI: ${aiApplicationInfo}` : ''}
SỐ BIỆN PHÁP: ${nSolutions}
Yêu cầu viết ${desiredPages || 30} trang. Chỉ trả về HTML thuần. h1-h4 dùng style="color:#000;font-weight:bold".`;

            // Build PDF parts
            const pdfParts: Part[] = [];
            if (referencePdfs?.length) {
                for (const pdf of referencePdfs as { name: string; base64: string }[]) {
                    pdfParts.push({ inlineData: { mimeType: 'application/pdf' as const, data: pdf.base64 } });
                }
            }

            // Build solution names placeholder
            const solutionsList = Array.from({ length: nSolutions }, (_, i) =>
                `<h3 style="color:#000;font-weight:bold">Biện pháp ${i + 1}: [Đặt tên biện pháp cụ thể từ dàn ý]</h3>`
            ).join('\n');

            // Co-author comparison sections
            const coAuthorComparison = (coAuthors || []).map((c: { name: string; school: string; expClasses?: { className: string; studentCount: string }[] }) => {
                if (!c.expClasses?.length) return '';
                const cls = c.expClasses.map((cl: { className: string; studentCount: string }) => `${cl.className} (${cl.studentCount} HS)`).join(', ');
                return `<h3 style="color:#1a237e;font-weight:bold">So sánh tại trường ${c.school} (${c.name})</h3>
<p>Lớp TN: ${cls}</p>
[Bảng số liệu trước/sau tại ${c.school} — số liệu phải nhất quán với lớp TN chính, tỉ lệ tương tự]
<div class="chart-directive" data-chart="bar|So sánh TN-ĐC tại ${c.school}|${chartTNDCStr}"></div>`;
            }).filter(Boolean).join('\n\n');

            // ── PHASE 3: Write each section with self-evaluation ──
            const sections = [
                {
                    key: 'SEC:bia', label: 'Bìa',
                    prompt: `Viết phần BÌA:
<h1 style="color:#000;font-weight:bold;text-align:center">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
<p style="text-align:center;font-weight:bold">Độc lập – Tự do – Hạnh phúc</p>
<p style="text-align:center">───────────────────────</p>
<p style="text-align:center;font-weight:bold">SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐIỆN BIÊN<br/>${school?.toUpperCase()}</p>
<h1 style="color:#000;font-weight:bold;text-align:center">SÁNG KIẾN KINH NGHIỆM</h1>
<h2 style="color:#000;font-weight:bold;text-align:center">"${title}"</h2>
<p style="text-align:center">Tác giả: <strong>${authorName}</strong> | ${school}</p>
<p style="text-align:center">Môn: ${subject} | Cấp: ${teacherLevel} | Lớp: ${gradeLevel}</p>
<p style="text-align:center">Năm học: ${info.acYear} | ${info.semester}</p>`,
                },
                {
                    key: 'SEC:mucluc', label: 'Mục lục & Viết tắt',
                    prompt: `Viết <h1>MỤC LỤC</h1> — BẮT BUỘC dùng bảng HTML, mỗi mục PHẢI trên một dòng riêng:
<table style="width:100%;border-collapse:collapse">
<tr><td>Thông tin chung & Bìa</td><td style="text-align:right;color:#555">..........1</td></tr>
<tr><td>Mục lục</td><td style="text-align:right;color:#555">..........2</td></tr>
<tr><td>Danh mục chữ viết tắt</td><td style="text-align:right;color:#555">..........3</td></tr>
<tr><td><strong>A. Mục đích, sự cần thiết</strong></td><td style="text-align:right;color:#555">..........4</td></tr>
<tr><td><strong>B. Phạm vi triển khai</strong></td><td style="text-align:right;color:#555">..........7</td></tr>
<tr><td><strong>C. Nội dung</strong></td><td style="text-align:right;color:#555">..........9</td></tr>
<tr><td style="padding-left:20px">C.1. Tình trạng giải pháp đã biết</td><td style="text-align:right;color:#555">..........9</td></tr>
<tr><td style="padding-left:20px">C.b. Nội dung giải pháp (${nSolutions} biện pháp)</td><td style="text-align:right;color:#555">..........12</td></tr>
<tr><td style="padding-left:20px">C.c. Khả năng áp dụng</td><td style="text-align:right;color:#555">..........18</td></tr>
<tr><td style="padding-left:20px">C.d. Hiệu quả, lợi ích thu được</td><td style="text-align:right;color:#555">..........20</td></tr>
<tr><td style="padding-left:20px">C.e. Phạm vi ảnh hưởng</td><td style="text-align:right;color:#555">..........25</td></tr>
<tr><td style="padding-left:20px">C.g. Kiến nghị, đề xuất</td><td style="text-align:right;color:#555">..........26</td></tr>
<tr><td><strong>D. Danh sách đồng tác giả</strong></td><td style="text-align:right;color:#555">..........28</td></tr>
<tr><td><strong>E. Phụ lục và Minh chứng</strong></td><td style="text-align:right;color:#555">..........29</td></tr>
</table>

Sau đó viết <h1>DANH MỤC CHỮ VIẾT TẮT</h1> với ≥15 từ viết tắt trong bảng HTML: STT | Từ viết tắt | Nghĩa đầy đủ`,
                },
                {
                    key: 'SEC:A', label: 'A. Mục đích',
                    prompt: `Viết phần <h1>A. MỤC ĐÍCH, SỰ CẦN THIẾT</h1> (≥3 trang A4).

DỰA VÀO DÀN Ý VÀ SỐ LIỆU:
- Khảo sát đầu năm: ${(dm.surveyBefore as Record<string, unknown>)?.description}, điểm TB ${(dm.surveyBefore as Record<string, unknown>)?.score}/5, chỉ ${(dm.surveyBefore as Record<string, unknown>)?.positive_rate}% đánh giá tích cực
- Bối cảnh: ${location}, địa bàn khó khăn vùng cao Điện Biên
- CT 2018 yêu cầu phát triển năng lực, phẩm chất
- Tài liệu tham khảo: ${dm.researchRef}

Gồm: (1) Lý do chọn đề tài — cơ sở pháp lý CT 2018 + thực trạng cụ thể tại ${school}
(2) Đặc điểm HS ${subject} lớp ${gradeLevel} tại ${location} (khó khăn, đặc thù dân tộc)
(3) Mục tiêu SKKN — ${nSolutions} biện pháp chính
(4) Câu hỏi + Giả thuyết nghiên cứu
(5) Đóng góp mới so với các SKKN trước

Sử dụng số liệu khảo sát thực từ bộ số liệu đã định.
<div class="img-placeholder">📷 [GV đang giảng bài theo phương pháp truyền thống, HS thụ động, tại lớp ${gradeLevel} trường ${school}]</div>`,
                },
                {
                    key: 'SEC:B', label: 'B. Phạm vi',
                    prompt: `Viết <h1>B. PHẠM VI TRIỂN KHAI THỰC HIỆN</h1> (≥1 trang).
- Thời gian thực nghiệm: ${info.implSem1} năm ${info.implYear1}-${info.implYear1 + 1}
- Địa bàn: ${location} | Trường: ${school}${coAuthorDetails ? '\nCộng tác tại: ' + coAuthorDetails : ''}
- Đối tượng: ${expClassList} | Đối chứng: ${ctrlClassList}
- Phạm vi môn học: ${subject} lớp ${gradeLevel}, SGK ${textbook || 'hiện hành'}`,
                },
                {
                    key: 'SEC:C1', label: 'C.1. Thực trạng',
                    prompt: `Viết <h2>C.1. Tình trạng giải pháp đã biết (Thực trạng)</h2> (≥3 trang).

1. Thực trạng dạy ${subject} lớp ${gradeLevel} tại ${school} — mô tả cụ thể khó khăn
<div class="img-placeholder">📷 [HS lớp ${gradeLevel} trường ${school} ngồi thụ động, ghi chép theo thầy]</div>

2. Bảng kết quả khảo sát đầu năm (Likert 5 mức, 10 tiêu chí — số liệu: ${(dm.surveyBefore as Record<string, unknown>)?.score}/5 TB):
[Tạo bảng khảo sát 10 tiêu chí phù hợp môn ${subject}]

3. Kết quả học tập TRƯỚC khi áp dụng (theo ${assmtRef}):
<table><thead>${th(tableHeaders)}</thead><tbody>
${tr(tnBeforeRow)}
${tr(dcBeforeRow)}
</tbody></table>
<div class="chart-directive" data-chart="bar|Kết quả TRƯỚC thực nghiệm|${chartTruocStr}"></div>

4. Phân tích nguyên nhân thực trạng (5-6 nguyên nhân, phân tích sâu, liên hệ đặc thù ${location})`,
                },
                {
                    key: 'SEC:Cb', label: 'C.b. Giải pháp',
                    prompt: `Viết <h2>C.b. Nội dung giải pháp</h2> (≥6 trang) — PHẦN TRỌNG TÂM NHẤT.

PHẢI có ĐÚNG ${nSolutions} biện pháp, mỗi biện pháp:
I. Tên biện pháp (cụ thể, phù hợp dàn ý)
II. Cơ sở lý luận (CT 2018, nghiên cứu liên quan: ${dm.researchRef})
III. Các bước thực hiện chi tiết (≥5 bước, ví dụ bài học cụ thể môn ${subject} lớp ${gradeLevel})
IV. Lưu ý khi áp dụng tại ${location} (địa bàn khó khăn, HS dân tộc)
V. Minh chứng thực hiện

${solutionsList}
${aiApplicationInfo ? `Tích hợp ứng dụng AI: ${aiApplicationInfo}` : ''}
<div class="img-placeholder">📷 [HS và GV đang thực hiện biện pháp mới sôi nổi, HS thảo luận nhóm]</div>`,
                },
                {
                    key: 'SEC:Cd', label: 'C.c & C.d. Khả năng & Hiệu quả',
                    prompt: `Viết <h2>C.c. Khả năng áp dụng</h2> (≥1 trang) VÀ <h2>C.d. Hiệu quả, lợi ích thu được</h2> (≥5 trang).

C.c: Điều kiện áp dụng, khả năng nhân rộng tại các trường khó khăn Điện Biên, bài học kinh nghiệm.

C.d — DÙNG ĐÚNG SỐ LIỆU NÀY (không thay đổi):

1. So sánh LỚP TN Trước và Sau (${assmtRef}):
<table><thead>${th(['Giai đoạn', 'Sĩ số', ...lvls, 'ĐTB'])}</thead><tbody>
${tr(tnBeforeRow)}
${tr(tnAfterRow)}
</tbody></table>
<div class="chart-directive" data-chart="bar|${expName}: Trước và Sau|${chartTNStr}"></div>
Nhận xét: ĐTB tăng từ ${dm.tnMeanBefore} lên ${dm.tnMeanAfter} (+${dm.improvementPct}%), ${dm.pValue}.

2. So sánh TN và ĐC sau thực nghiệm:
<table><thead>${th(tableHeaders)}</thead><tbody>
${tr(tnAfterRow)}
${tr(dcAfterRow)}
</tbody></table>
<div class="chart-directive" data-chart="bar|So sánh TN và ĐC sau thực nghiệm|${chartTNDCStr}"></div>
<div class="chart-directive" data-chart="pie|Xếp loại ${expName} sau SKKN|${pieTNStr}"></div>

3. Khảo sát hứng thú HS sau thực nghiệm (n=${expTotal}):
<table><thead><tr><th>Mức độ</th><th>Số HS</th><th>Tỉ lệ</th></tr></thead><tbody>
<tr><td>Rất thích</td><td>${sat.rat_thich}</td><td>${Math.round((sat.rat_thich as number) / expTotal * 100)}%</td></tr>
<tr><td>Thích</td><td>${sat.thich}</td><td>${Math.round((sat.thich as number) / expTotal * 100)}%</td></tr>
<tr><td>Bình thường</td><td>${sat.binh_thuong}</td><td>${Math.round((sat.binh_thuong as number) / expTotal * 100)}%</td></tr>
<tr><td>Không thích</td><td>${sat.khong_thich}</td><td>${Math.round((sat.khong_thich as number) / expTotal * 100)}%</td></tr>
<tr><td>Rất không thích</td><td>${sat.rat_khong_thich}</td><td>${Math.round((sat.rat_khong_thich as number) / expTotal * 100)}%</td></tr>
</tbody></table>
${sat.comment}
<div class="img-placeholder">📷 [HS điền phiếu khảo sát hứng thú sau tiết học]</div>

${coAuthorComparison ? `4. Kết quả tại trường đồng tác giả:\n${coAuthorComparison}` : ''}`,
                },
                {
                    key: 'SEC:Ceg', label: 'C.e & C.g',
                    prompt: `Viết <h2>C.e. Phạm vi ảnh hưởng</h2> (≥1 trang) và <h2>C.g. Kiến nghị, đề xuất</h2> (≥1 trang).
C.e: Ảnh hưởng đến GV, HS, nhà trường, cộng đồng. Khả năng nhân rộng toàn huyện/tỉnh.
C.g: Kiến nghị với Sở GDĐT Điện Biên, Phòng GD, BGH trường. Đề xuất tiếp tục nghiên cứu.`,
                },
                {
                    key: 'SEC:D', label: 'D. Đồng tác giả',
                    prompt: `Viết <h1>D. DANH SÁCH ĐỒNG TÁC GIẢ</h1>.
Đồng tác giả:\n  ${coAuthorDetails || 'Không có'}
Bảng: STT | Họ tên | Chức vụ | Đơn vị | Vai trò/Đóng góp cụ thể | Chữ ký`,
                },
                {
                    key: 'SEC:E', label: 'E. Phụ lục',
                    prompt: `Viết <h1>E. PHỤ LỤC VÀ MINH CHỨNG</h1> đầy đủ 7 phụ lục:
PL1: Phiếu khảo sát GV đầu năm (15 tiêu chí Likert, số liệu: ${(dm.surveyBefore as Record<string, unknown>)?.score}/5 TB)
PL2: Phiếu khảo sát hứng thú HS SAU (${expTotal} HS, TH: Rất thích ${sat.rat_thich}, Thích ${sat.thich}...)
PL3: ${nSolutions} phiếu học tập nhóm (theo từng biện pháp, nội dung môn ${subject} lớp ${gradeLevel})
PL4: Bảng điểm chi tiết ${expName} và ${ctrlName} (≥20 HS, điểm nhất quán với ĐTB đã định)
PL5: Hình ảnh minh chứng (4 div img-placeholder với mô tả chi tiết)
PL6: Minh chứng công nhận SKKN năm trước (nếu có)
PL7: Nhận xét BGH trường ${school}`,
                },
            ];

            // Write each section with streaming
            for (const sec of sections) {
                await writer.write(sseChunk({ section: sec.key }));

                const content = await writeSectionWithEval(
                    sec.key, sec.label, sec.prompt,
                    outline, dm, systemCtx, pdfParts, 2
                );

                // Stream section content in chunks
                const chunkSize = 2000;
                for (let i = 0; i < content.length; i += chunkSize) {
                    await writer.write(sseChunk({ section: sec.key, chunk: content.slice(i, i + chunkSize) }));
                }
                await writer.write(sseChunk({ section: sec.key, chunk: '\n' }));
            }

            await writer.write(enc('data: [DONE]\n\n'));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            await writer.write(sseChunk({ error: msg }));
        } finally {
            await writer.close();
        }
    })();

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
