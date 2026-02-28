import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDQVAHOAVTMH_Pg7V4h_xQegU0m582arIU');

// Extract representative sentences from the content
function extractKeySentences(text: string, count: number): string[] {
    const sentences = text
        .split(/[.!?；]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length >= 50 && s.length <= 300);
    // Pick evenly distributed samples
    const step = Math.max(1, Math.floor(sentences.length / count));
    const result: string[] = [];
    for (let i = 0; i < sentences.length && result.length < count; i += step) {
        if (sentences[i]) result.push(sentences[i]);
    }
    return result;
}

// ── Real internet search via Gemini Google Search grounding ─────────────────
async function searchOnlineForText(sentence: string, title: string): Promise<{
    found: boolean; sources: string[]; matchLevel: 'high' | 'medium' | 'low' | 'none'; snippet: string;
}> {
    try {
        const searchModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            // @ts-expect-error: googleSearch is valid for gemini-2.0-flash but not typed
            tools: [{ googleSearch: {} }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0 },
        });

        const searchPrompt = `Tìm kiếm trên internet: đoạn văn bản sau có xuất hiện y nguyên hoặc rất giống ở nguồn nào không?

Đoạn cần kiểm tra (từ SKKN "${title}"):
"${sentence}"

Hãy tìm kiếm và cho biết:
1. Đoạn này có trùng với tài liệu nào trên internet không?
2. Nếu có: tên tài liệu, URL (nếu biết), mức độ trùng (cao/trung bình/thấp)
3. Nếu không tìm thấy tương đồng: xác nhận "Không tìm thấy trùng lặp"`;

        const result = await searchModel.generateContent(searchPrompt);
        const response = result.response.text();

        // Parse response to determine match level
        const lower = response.toLowerCase();
        const found = !lower.includes('không tìm thấy') && !lower.includes('không có trùng') && !lower.includes('chưa tìm thấy');
        const matchLevel = lower.includes('trùng cao') || lower.includes('y nguyên') || lower.includes('giống hoàn toàn') ? 'high'
            : lower.includes('trùng trung bình') || lower.includes('tương tự') || lower.includes('giống') ? 'medium'
                : lower.includes('trùng thấp') || lower.includes('khác biệt nhỏ') ? 'low' : 'none';

        // Extract URLs if found
        const urlMatches = response.match(/https?:\/\/[^\s<>"']+/g) || [];
        const sources = urlMatches.slice(0, 3);

        return { found, sources, matchLevel, snippet: response.slice(0, 500) };
    } catch {
        return { found: false, sources: [], matchLevel: 'none', snippet: 'Không thể tìm kiếm' };
    }
}

export async function POST(req: NextRequest) {
    try {
        const { content, formData } = await req.json();
        if (!content) return NextResponse.json({ error: 'Không có nội dung' }, { status: 400 });

        const plainText = content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const title = formData?.title || 'SKKN';
        const subject = formData?.subject || '';

        // Step 1: Extract 6 representative sentences to search
        const keySentences = extractKeySentences(plainText, 6);

        // Step 2: Search ALL sentences in PARALLEL on internet
        const searchPromises = keySentences.map(s => searchOnlineForText(s, title));
        const searchResults = await Promise.all(searchPromises);

        // Step 3: Aggregate search findings
        const matchedResults = searchResults.filter(r => r.found);
        const highMatches = searchResults.filter(r => r.matchLevel === 'high').length;
        const mediumMatches = searchResults.filter(r => r.matchLevel === 'medium').length;
        const allSources = [...new Set(searchResults.flatMap(r => r.sources))];

        // Estimated plagiarism % based on actual search results
        const plagiarismBase = Math.round(
            (highMatches * 25 + mediumMatches * 12) / keySentences.length
        );

        // Build detailed search findings summary
        const searchSummary = searchResults.map((r, i) => {
            const sent = keySentences[i] || '';
            return `Đoạn ${i + 1} (${sent.slice(0, 60)}...):
  - Tìm thấy: ${r.found ? 'CÓ' : 'Không'}
  - Mức độ: ${r.matchLevel === 'high' ? '🔴 Cao' : r.matchLevel === 'medium' ? '🟡 Trung bình' : r.matchLevel === 'low' ? '🟢 Thấp' : '⚪ Không có'}
  - Nguồn: ${r.sources.length > 0 ? r.sources.join(', ') : 'Không tìm thấy nguồn'}
  - Chi tiết: ${r.snippet}`;
        }).join('\n\n');

        // Step 4: Linguistic analysis + AI detection (combined with search findings)
        const analysisModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                maxOutputTokens: 5000,
                temperature: 0.2, // slight variation for better writing analysis
            },
        });

        const fullPrompt = `Bạn là chuyên gia kiểm tra đạo văn và phát hiện nội dung AI viết cho SKKN Việt Nam.

ĐỀ TÀI: "${title}" — Môn: ${subject}

═══════════════════════════════════════════════
KẾT QUẢ TÌM KIẾM INTERNET THỰC TẾ (đã quét ${keySentences.length} đoạn văn song song):
${searchSummary}

TỔNG HỢP TỪ INTERNET:
- Số đoạn phát hiện trùng lặp: ${matchedResults.length}/${keySentences.length}
- Số đoạn trùng CAO: ${highMatches}
- Số đoạn trùng TRUNG BÌNH: ${mediumMatches}
- Nguồn tìm thấy: ${allSources.length > 0 ? allSources.join(', ') : 'Không tìm thấy URL cụ thể'}
- Ước tính tỉ lệ trùng lặp internet: ${plagiarismBase}% (tính từ kết quả search thực)
═══════════════════════════════════════════════

VĂN BẢN CẦN PHÂN TÍCH (trích):
${plainText.slice(0, 10000)}

NHIỆM VỤ: Phân tích CHI TIẾT và trả về HTML thuần (h2, h3, p, table, ul, ol, li, blockquote, div). KHÔNG dùng markdown.

Trả về đúng cấu trúc này:

<h2 style="color:#000;font-weight:bold">📊 KẾT QUẢ KIỂM TRA TOÀN DIỆN</h2>

<h3>I. BẢNG TỔNG KẾT</h3>
<table>
<tr><th>Chỉ số</th><th>Kết quả</th><th>Phương pháp</th><th>Mức rủi ro</th></tr>
<tr><td>Tỉ lệ trùng lặp internet</td><td>${plagiarismBase}% (từ ${matchedResults.length}/${keySentences.length} đoạn)</td><td>Google Search (thực)</td><td>[thấp/trung bình/cao]</td></tr>
<tr><td>Tỉ lệ nội dung AI viết</td><td>__%</td><td>Phân tích ngôn ngữ học</td><td>[...]</td></tr>
<tr><td>Tỉ lệ nguyên bản</td><td>__%</td><td>Tổng hợp</td><td>[...]</td></tr>
</table>

<h3>II. KẾT QUẢ TÌM KIẾM INTERNET THỰC TẾ</h3>
[Trình bày chi tiết kết quả từ phần SEARCH bên trên:
- Những đoạn VĂN BỊ PHÁT HIỆN trùng lặp (nếu có) trong blockquote có màu đỏ
- URL/nguồn cụ thể nếu tìm được
- Nếu không tìm thấy trùng lặp: nêu rõ "Không tìm thấy nội dung trùng lặp trên internet"]

<h3>III. PHÁT HIỆN NỘI DUNG AI VIẾT (Phân tích ngôn ngữ học)</h3>
[Phân tích văn phong, cú pháp:
- Đoạn nào có dấu hiệu AI: câu hoàn hảo quá mức, thiếu tình huống thực tế, từ ngữ máy móc
- Mỗi đoạn trong <div style="border:1px solid #f59e0b;padding:10px;margin:8px 0;border-radius:6px">
  + Trích đoạn nghi vấn trong <blockquote>
  + Dấu hiệu AI cụ thể
  + Phiên bản viết lại bằng giọng GV thực sự, với chi tiết lớp học cụ thể]

<h3>IV. VIẾT LẠI NỘI DUNG ĐÃ BỊ FLAG</h3>
[Viết lại 2-3 đoạn bị flag, phiên bản tự nhiên hơn, có chi tiết thực tế, giọng GV]

<h3>V. KẾT LUẬN VÀ KHUYẾN NGHỊ</h3>
<ol>[5 khuyến nghị cụ thể để tăng tính nguyên bản]</ol>

<p style="color:#64748b;font-size:10px;margin-top:12px;border-top:1px solid #2a3547;padding-top:8px">
🔍 Báo cáo này kết hợp tìm kiếm Google Search thực tế (${keySentences.length} đoạn văn được quét song song) 
+ phân tích ngôn ngữ học AI. Tỉ lệ % là ước tính dựa trên sampling, không thay thế Turnitin/iThenticate.
Tìm thấy ${matchedResults.length} đoạn trùng lặp từ ${allSources.length} nguồn internet.
</p>`;

        const analysisResult = await analysisModel.generateContent(fullPrompt);
        let html = analysisResult.response.text();
        html = html.replace(/^```html\n?/im, '').replace(/^```\n?/im, '').replace(/\n?```$/im, '');

        return NextResponse.json({ html });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
