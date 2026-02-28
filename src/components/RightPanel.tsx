'use client';
import { useRef, useState, useCallback } from 'react';
import { useSKKN } from '@/context/SKKNContext';
import DocumentPreview from './preview/DocumentPreview';
import { exportToDocx } from '@/lib/exportDocx';

export default function RightPanel() {
    const { formData, generatedContent, isGenerating } = useSKKN();
    const contentRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = useCallback(async () => {
        if (!generatedContent) return;
        setExporting(true);
        try {
            const html = contentRef.current?.innerHTML || generatedContent;
            await exportToDocx(generatedContent, formData.title || 'SKKN');
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    }, [generatedContent, formData.title]);

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">📑 Bản xem trước SKKN</span>
                    {generatedContent && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Đã tạo</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {generatedContent && (
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {exporting ? '⌛ Đang xuất...' : '⬇ Xuất .docx'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-700">Đang tạo SKKN với AI...</p>
                            <p className="text-sm text-gray-500 mt-1">Quá trình có thể mất 30-60 giây</p>
                        </div>
                    </div>
                )}

                {!isGenerating && !generatedContent && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 px-8">
                        <div className="text-6xl opacity-30">📄</div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-600 text-lg">Chưa có nội dung</p>
                            <p className="text-sm mt-1 text-gray-500">Điền thông tin bên trái và nhấn "Tạo SKKN" để bắt đầu</p>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center w-full max-w-sm">
                            {['📝 Nhập thông tin', '🚀 Tạo SKKN', '⬇ Xuất Word'].map((s, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-600">{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isGenerating && generatedContent && (
                    <div ref={contentRef} className="p-8 max-w-4xl mx-auto">
                        <DocumentPreview html={generatedContent} />
                    </div>
                )}
            </div>
        </div>
    );
}
