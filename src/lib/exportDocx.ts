import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType,
    convertInchesToTwip, ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import type { SKKNFormData } from '@/types/skkn';

// A4 page margins: left 3cm, right 2cm, top 2cm, bottom 2cm
const MARGIN_LEFT = convertInchesToTwip(1.181); // ~3 cm
const MARGIN_RIGHT = convertInchesToTwip(0.787); // ~2 cm
const MARGIN_TOP = convertInchesToTwip(0.787);
const MARGIN_BOTTOM = convertInchesToTwip(0.787);

const FONT = 'Times New Roman';
const SZ = 26;  // 13pt in half-pts
const SZ_H1 = 32;  // 16pt
const SZ_H2 = 28;  // 14pt
const SZ_H3 = 26;  // 13pt
const SZ_H4 = 24;  // 12pt
const PAGE_W = 11906; // A4 width in twips
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // usable width

// â”€â”€ Read a chart PNG that InlineChart stored after rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function readChartPng(chartContainer: Element): Promise<Uint8Array | null> {
    try {
        // InlineChart stores PNG as data URL on the container after chart renders
        const dataUrl = chartContainer.getAttribute('data-chart-png');
        if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
            const base64 = dataUrl.split(',')[1];
            if (!base64) return null;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }
        // Fallback: try canvas directly
        const canvas = chartContainer.querySelector('canvas');
        if (!canvas) return null;
        return await new Promise<Uint8Array | null>(resolve => {
            canvas.toBlob(blob => {
                if (!blob) { resolve(null); return; }
                blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(() => resolve(null));
            }, 'image/png');
        });
    } catch {
        return null;
    }
}

// â”€â”€ Parse HTML nodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PNode {
    type: 'h' | 'p' | 'li' | 'table' | 'chart-img' | 'chart-text' | 'img';
    level?: number;
    text?: string;
    rows?: string[][];
    imgData?: Uint8Array;
    chartTitle?: string;
    chartData?: string;
    align?: string;
    bold?: boolean;
}

async function htmlToNodes(html: string): Promise<PNode[]> {
    const div = document.createElement('div');
    div.innerHTML = html;
    const nodes: PNode[] = [];

    async function walk(el: Element) {
        const tag = el.tagName?.toLowerCase() ?? '';
        const text = el.textContent?.trim() ?? '';

        if (/^h[1-4]$/.test(tag)) {
            nodes.push({ type: 'h', level: +tag[1], text });
        } else if (tag === 'p' && text) {
            const st = (el as HTMLElement).style;
            nodes.push({ type: 'p', text, align: st?.textAlign, bold: (el as HTMLElement).querySelector('strong') !== null });
        } else if (tag === 'li' && text) {
            nodes.push({ type: 'li', text });
        } else if (tag === 'table') {
            const rows: string[][] = [];
            el.querySelectorAll('tr').forEach(tr => {
                const cells: string[] = [];
                tr.querySelectorAll('td,th').forEach(td => cells.push(td.textContent?.trim() || ' '));
                if (cells.length) rows.push(cells);
            });
            if (rows.length) nodes.push({ type: 'table', rows });
        } else if (el.classList?.contains('chart-directive')) {
            // Try to find the rendered chart nearby (Chart.js renders inside .chart-container sibling)
            const raw = el.getAttribute('data-chart') ?? '';
            const parts = raw.split('|');
            const chartTitle = parts[1]?.trim() ?? 'Biá»ƒu Ä‘á»“';
            const chartData = parts[2]?.trim() ?? '';
            // After DocumentPreview renders, the directive is replaced by a chart-container div
            // but here we still have the original directive â€” find the sibling chart-container
            let imgData: Uint8Array | null = null;
            const parent = el.parentElement;
            if (parent) {
                const containers = parent.querySelectorAll('.chart-container');
                for (const c of Array.from(containers)) {
                    imgData = await readChartPng(c);
                    if (imgData) break;
                }
            }
            if (imgData) {
                nodes.push({ type: 'chart-img', imgData, chartTitle });
            } else {
                nodes.push({ type: 'chart-text', chartTitle, chartData });
            }
        } else if (el.classList?.contains('chart-container')) {
            // Rendered chart â€” capture canvas
            const chartTitle = el.querySelector('.chart-title')?.textContent?.trim() ?? 'Biá»ƒu Ä‘á»“';
            const imgData = await readChartPng(el);
            if (imgData) {
                nodes.push({ type: 'chart-img', imgData, chartTitle });
            }
        } else if (el.classList?.contains('img-placeholder')) {
            nodes.push({ type: 'img', text });
        } else {
            for (const child of Array.from(el.children)) {
                await walk(child);
            }
        }
    }

    for (const child of Array.from(div.children)) {
        await walk(child);
    }
    return nodes;
}

// â”€â”€ Heading level map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const H_LEVEL: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
};
const H_SIZE: Record<number, number> = { 1: SZ_H1, 2: SZ_H2, 3: SZ_H3, 4: SZ_H4 };

// â”€â”€ Build a docx Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildTable(rows: string[][]): Table {
    const colCount = Math.max(...rows.map(r => r.length));
    const colW = Math.floor(CONTENT_W / colCount);
    return new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        rows: rows.map((row, ri) =>
            new TableRow({
                children: Array.from({ length: colCount }, (_, ci) => {
                    const cellText = row[ci] !== undefined && row[ci] !== '' ? row[ci] : ' ';
                    return new TableCell({
                        width: { size: colW, type: WidthType.DXA },
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 40, after: 40 },
                            children: [new TextRun({
                                text: cellText,
                                font: FONT, size: 22,
                                bold: ri === 0,
                                color: '000000',
                            })],
                        })],
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        },
                    });
                }),
            })
        ),
    });
}

// â”€â”€ Parse chart text data into a table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function chartDataToTable(chartTitle: string, chartData: string): Table {
    const pairs = chartData.split(',').map(p => p.split(':'));
    const rows = [
        ['NhÃ£n', 'GiÃ¡ trá»‹ (%)'],
        ...pairs.map(([l, v]) => [l?.trim() || ' ', v?.trim() || ' ']),
    ];
    return buildTable(rows);
}

// â”€â”€ MAIN EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function exportToDocx(html: string, _formData: SKKNFormData, title: string) {
    // We need to parse the rendered DOM, not just the raw HTML
    // Use the live rendered DOM from the document preview for charts
    const previewEl = document.querySelector('.doc-preview');
    const sourceHtml = previewEl ? previewEl.innerHTML : html;

    const nodes = await htmlToNodes(sourceHtml);
    const children: (Paragraph | Table)[] = [];

    for (const node of nodes) {
        switch (node.type) {
            case 'h': {
                const lv = node.level ?? 1;
                children.push(new Paragraph({
                    heading: H_LEVEL[lv],
                    alignment: lv === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: { before: lv === 1 ? 360 : 240, after: lv === 1 ? 180 : 120 },
                    children: [new TextRun({
                        text: node.text ?? '',
                        bold: true, color: '000000', font: FONT,
                        size: H_SIZE[lv],
                        allCaps: lv === 1,
                    })],
                }));
                break;
            }
            case 'p': {
                children.push(new Paragraph({
                    alignment: node.align === 'center' ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                    spacing: { line: 360, before: 60, after: 60 },
                    indent: node.align === 'center' ? {} : { firstLine: 720 },
                    children: [new TextRun({
                        text: node.text ?? '',
                        font: FONT, size: SZ, color: '000000',
                        bold: node.bold ?? false,
                    })],
                }));
                break;
            }
            case 'li': {
                children.push(new Paragraph({
                    spacing: { line: 360 },
                    indent: { left: 720 },
                    bullet: { level: 0 },
                    children: [new TextRun({ text: node.text ?? '', font: FONT, size: SZ, color: '000000' })],
                }));
                break;
            }
            case 'table': {
                if (node.rows?.length) {
                    children.push(buildTable(node.rows));
                    children.push(new Paragraph({ text: '' }));
                }
                break;
            }
            case 'chart-img': {
                // Embed the chart as a PNG image
                if (node.imgData) {
                    children.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 80 },
                        children: [new ImageRun({
                            data: node.imgData,
                            transformation: { width: 480, height: 280 },
                            type: 'png',
                        })],
                    }));
                    if (node.chartTitle) {
                        children.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 160 },
                            children: [new TextRun({
                                text: `Biá»ƒu Ä‘á»“: ${node.chartTitle}`,
                                italics: true, bold: true, font: FONT, size: 22, color: '333333',
                            })],
                        }));
                    }
                }
                break;
            }
            case 'chart-text': {
                // Fallback: embed data as a table + note
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 80 },
                    children: [new TextRun({
                        text: `ðŸ“Š ${node.chartTitle} (Dá»¯ liá»‡u biá»ƒu Ä‘á»“)`,
                        bold: true, italics: true, font: FONT, size: 24, color: '1a56db',
                    })],
                }));
                if (node.chartData) {
                    children.push(chartDataToTable(node.chartTitle ?? '', node.chartData));
                    children.push(new Paragraph({ text: '' }));
                }
                break;
            }
            case 'img': {
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240 },
                    border: {
                        top: { style: BorderStyle.DASHED, size: 6, color: 'aaaaaa' },
                        bottom: { style: BorderStyle.DASHED, size: 6, color: 'aaaaaa' },
                        left: { style: BorderStyle.DASHED, size: 6, color: 'aaaaaa' },
                        right: { style: BorderStyle.DASHED, size: 6, color: 'aaaaaa' },
                    },
                    children: [new TextRun({
                        text: node.text ?? '[ChÃ¨n hÃ¬nh áº£nh táº¡i Ä‘Ã¢y]',
                        italics: true, font: FONT, size: 22, color: '666666',
                    })],
                }));
                break;
            }
        }
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT, size: SZ, color: '000000' },
                    paragraph: { spacing: { line: 360 } },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: MARGIN_TOP, right: MARGIN_RIGHT,
                        bottom: MARGIN_BOTTOM, left: MARGIN_LEFT,
                    },
                },
            },
            children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || 'SKKN'}.docx`);
}

