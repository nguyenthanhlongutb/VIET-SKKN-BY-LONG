'use client';
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Props {
    type: 'bar' | 'pie';
    title: string;
    labels: string[];
    values: number[];
    colors: string[];
}

const PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6',
];

export default function InlineChart({ type, title, labels, values, colors }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Destroy old chart instance first
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bgColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

        chartRef.current = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets: [{
                    label: title,
                    data: values,
                    backgroundColor: type === 'pie' ? bgColors : bgColors.map(c => c + 'cc'),
                    borderColor: type === 'pie' ? '#fff' : bgColors,
                    borderWidth: type === 'pie' ? 2 : 1,
                }],
            },
            options: {
                responsive: false,
                animation: {
                    onComplete: () => {
                        // ── After chart finishes rendering, store PNG data URL on the container ──
                        const container = canvas.closest('.chart-container') as HTMLElement | null;
                        if (container) {
                            try {
                                const dataUrl = canvas.toDataURL('image/png');
                                container.setAttribute('data-chart-png', dataUrl);
                            } catch {
                                // Canvas tainted or unavailable
                            }
                        }
                    },
                },
                plugins: {
                    legend: {
                        position: type === 'pie' ? 'right' : 'top',
                        labels: { font: { size: 11 }, color: '#cbd5e1' },
                    },
                    title: {
                        display: false, // title shown separately outside canvas
                    },
                },
                scales: type === 'bar' ? {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2a3a' } },
                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2a3a' }, beginAtZero: true },
                } : undefined,
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [type, title, labels, values, colors]);

    const W = type === 'pie' ? 340 : 480;
    const H = type === 'pie' ? 220 : 260;

    return (
        <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: 'block', maxWidth: '100%', margin: '0 auto' }}
        />
    );
}
