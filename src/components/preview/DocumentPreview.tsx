'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import { TOCSection } from '@/types/skkn';
import InlineChart from './InlineChart';
import { createRoot } from 'react-dom/client';

declare global { interface Window { MathJax?: { typesetPromise?: (els: Element[]) => Promise<void> }; } }

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#84cc16', '#f97316'];

function parseTOC(container: HTMLElement): TOCSection[] {
    const toc: TOCSection[] = [];
    const headings = container.querySelectorAll('h1,h2,h3,h4');
    headings.forEach((el, idx) => {
        const level = parseInt(el.tagName[1]);
        const id = `toc-heading-${idx}`;
        el.id = id;
        toc.push({ id, title: el.textContent?.trim() || '', level });
    });
    return toc;
}

function processCharts(container: HTMLElement) {
    const placeholders = Array.from(container.querySelectorAll('.chart-directive'));
    placeholders.forEach(pl => {
        try {
            const raw = pl.getAttribute('data-chart') || '';
            const parts = raw.split('|');
            if (parts.length < 3) return;
            const type = (parts[0].trim() as 'bar' | 'pie');
            const title = parts[1].trim();
            const pairs = parts[2].split(',');
            const labels: string[] = [];
            const values: number[] = [];
            pairs.forEach(p => {
                const idx = p.lastIndexOf(':');
                if (idx < 0) return;
                const l = p.substring(0, idx).trim();
                const v = parseFloat(p.substring(idx + 1).trim());
                if (l && !isNaN(v)) { labels.push(l); values.push(v); }
            });
            if (!labels.length) return;

            const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

            // Create wrapper that preserves the original data-chart attribute for export
            const wrapper = document.createElement('div');
            wrapper.className = 'chart-container';
            // Keep the original data for export fallback
            wrapper.setAttribute('data-chart', raw);
            pl.replaceWith(wrapper);

            const chartTitle = document.createElement('div');
            chartTitle.className = 'chart-title';
            chartTitle.textContent = title;
            wrapper.appendChild(chartTitle);

            const canvasWrapper = document.createElement('div');
            wrapper.appendChild(canvasWrapper);

            const root = createRoot(canvasWrapper);
            root.render(<InlineChart type={type} title={title} labels={labels} values={values} colors={colors} />);
        } catch (e) {
            console.error('Chart render error:', e);
        }
    });
}

interface Props { html: string; }

export default function DocumentPreview({ html }: Props) {
    const { setTocSections } = useSKKN();
    const ref = useRef<HTMLDivElement>(null);

    const processContent = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        processCharts(el);
        const toc = parseTOC(el);
        setTocSections(toc);
        if (window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise([el]).catch(() => { });
        }
    }, [setTocSections]);

    useEffect(() => {
        if (!ref.current || !html) return;
        ref.current.innerHTML = html;
        const timer = setTimeout(processContent, 150);
        return () => clearTimeout(timer);
    }, [html, processContent]);

    return <div ref={ref} className="doc-preview" />;
}
