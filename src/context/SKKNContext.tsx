'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { SKKNFormData, TeacherLevel, CoAuthor, ClassInfo, TOCSection, CoAuthorClass, PdfFile } from '@/types/skkn';

const newId = () => Math.random().toString(36).slice(2);

const defaultCoAuthor = (): CoAuthor => ({ id: newId(), name: '', school: '', expClasses: [] });
const defaultClass = (): ClassInfo => ({ id: newId(), className: '', studentCount: '', studentStatus: '' });
const defaultCoClass = (): CoAuthorClass => ({ id: newId(), className: '', studentCount: '', studentStatus: '' });

const defaultForm: SKKNFormData = {
    authorName: '', school: '', location: '', title: '', subject: '',
    teacherLevel: 'THCS', gradeLevel: '6', examMonth: '4', examYear: '2026',
    aiApplicationInfo: '', textbook: '',
    coAuthors: [defaultCoAuthor()],
    experimentalClasses: [defaultClass()],
    controlClasses: [defaultClass()],
    schoolOverview: '', facilities: '',
    desiredPages: '30', topicFocus: '', numSolutions: '3',
};

interface SKKNContextType {
    formData: SKKNFormData;
    setFormData: React.Dispatch<React.SetStateAction<SKKNFormData>>;
    generatedContent: string;
    isGenerating: boolean;
    writingSection: string; // key of the section currently being written
    referencePdfs: PdfFile[];
    setReferencePdfs: React.Dispatch<React.SetStateAction<PdfFile[]>>;
    generateSKKN: () => Promise<void>;
    updateField: <K extends keyof SKKNFormData>(key: K, value: SKKNFormData[K]) => void;
    addCoAuthor: () => void;
    removeCoAuthor: (id: string) => void;
    updateCoAuthor: (id: string, field: keyof Omit<CoAuthor, 'id' | 'expClasses'>, value: string) => void;
    addCoAuthorClass: (coAuthorId: string) => void;
    removeCoAuthorClass: (coAuthorId: string, classId: string) => void;
    updateCoAuthorClass: (coAuthorId: string, classId: string, field: keyof Omit<CoAuthorClass, 'id'>, value: string) => void;
    addExperimentalClass: () => void;
    removeExperimentalClass: (id: string) => void;
    updateExperimentalClass: (id: string, field: keyof Omit<ClassInfo, 'id'>, value: string) => void;
    addControlClass: () => void;
    removeControlClass: (id: string) => void;
    updateControlClass: (id: string, field: keyof Omit<ClassInfo, 'id'>, value: string) => void;
    tocSections: TOCSection[];
    setTocSections: React.Dispatch<React.SetStateAction<TOCSection[]>>;
    activeTocId: string;
    setActiveTocId: React.Dispatch<React.SetStateAction<string>>;
}

const SKKNContext = createContext<SKKNContextType | null>(null);

// Section markers used during streaming
const SECTION_MARKERS = ['[SEC:bia]', '[SEC:mucluc]', '[SEC:A]', '[SEC:B]', '[SEC:C1]', '[SEC:Cb]', '[SEC:Cd]', '[SEC:Ceg]', '[SEC:D]', '[SEC:E]'];
const SECTION_NAMES: Record<string, string> = {
    'SEC:bia': 'Bìa & Thông tin', 'SEC:mucluc': 'Mục lục', 'SEC:A': 'A. Mục đích',
    'SEC:B': 'B. Phạm vi', 'SEC:C1': 'C.1. Thực trạng', 'SEC:Cb': 'C.b. Giải pháp',
    'SEC:Cd': 'C.d. Hiệu quả', 'SEC:Ceg': 'C.e-g. Phạm vi & Kiến nghị', 'SEC:D': 'D. Đồng tác giả', 'SEC:E': 'E. Phụ lục',
};

export function SKKNProvider({ children }: { children: React.ReactNode }) {
    const [formData, setFormData] = useState<SKKNFormData>(defaultForm);
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [writingSection, setWritingSection] = useState('');
    const [tocSections, setTocSections] = useState<TOCSection[]>([]);
    const [activeTocId, setActiveTocId] = useState('');
    const [referencePdfs, setReferencePdfs] = useState<PdfFile[]>([]);
    const contentRef = useRef('');

    const updateField = useCallback(<K extends keyof SKKNFormData>(key: K, value: SKKNFormData[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    // CoAuthors
    const addCoAuthor = useCallback(() => setFormData(p => ({ ...p, coAuthors: [...p.coAuthors, defaultCoAuthor()] })), []);
    const removeCoAuthor = useCallback((id: string) => setFormData(p => ({ ...p, coAuthors: p.coAuthors.filter(c => c.id !== id) })), []);
    const updateCoAuthor = useCallback((id: string, field: keyof Omit<CoAuthor, 'id' | 'expClasses'>, value: string) =>
        setFormData(p => ({ ...p, coAuthors: p.coAuthors.map(c => c.id === id ? { ...c, [field]: value } : c) })), []);

    // CoAuthor experimental classes
    const addCoAuthorClass = useCallback((coAuthorId: string) =>
        setFormData(p => ({
            ...p,
            coAuthors: p.coAuthors.map(c => c.id === coAuthorId
                ? { ...c, expClasses: [...(c.expClasses || []), defaultCoClass()] }
                : c),
        })), []);

    const removeCoAuthorClass = useCallback((coAuthorId: string, classId: string) =>
        setFormData(p => ({
            ...p,
            coAuthors: p.coAuthors.map(c => c.id === coAuthorId
                ? { ...c, expClasses: (c.expClasses || []).filter(cl => cl.id !== classId) }
                : c),
        })), []);

    const updateCoAuthorClass = useCallback((coAuthorId: string, classId: string, field: keyof Omit<CoAuthorClass, 'id'>, value: string) =>
        setFormData(p => ({
            ...p,
            coAuthors: p.coAuthors.map(c => c.id === coAuthorId
                ? { ...c, expClasses: (c.expClasses || []).map(cl => cl.id === classId ? { ...cl, [field]: value } : cl) }
                : c),
        })), []);

    // Experimental / Control classes
    const addExperimentalClass = useCallback(() => setFormData(p => ({ ...p, experimentalClasses: [...p.experimentalClasses, defaultClass()] })), []);
    const removeExperimentalClass = useCallback((id: string) => setFormData(p => ({ ...p, experimentalClasses: p.experimentalClasses.filter(c => c.id !== id) })), []);
    const updateExperimentalClass = useCallback((id: string, field: keyof Omit<ClassInfo, 'id'>, value: string) =>
        setFormData(p => ({ ...p, experimentalClasses: p.experimentalClasses.map(c => c.id === id ? { ...c, [field]: value } : c) })), []);

    const addControlClass = useCallback(() => setFormData(p => ({ ...p, controlClasses: [...p.controlClasses, defaultClass()] })), []);
    const removeControlClass = useCallback((id: string) => setFormData(p => ({ ...p, controlClasses: p.controlClasses.filter(c => c.id !== id) })), []);
    const updateControlClass = useCallback((id: string, field: keyof Omit<ClassInfo, 'id'>, value: string) =>
        setFormData(p => ({ ...p, controlClasses: p.controlClasses.map(c => c.id === id ? { ...c, [field]: value } : c) })), []);

    // ── Streaming generation ──────────────────────────────────────────────────
    const generateSKKN = useCallback(async () => {
        setIsGenerating(true);
        setGeneratedContent('');
        setTocSections([]);
        contentRef.current = '';
        setWritingSection('SEC:bia');

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, referencePdfs }),
            });

            if (!res.ok) throw new Error(`API error ${res.status}`);
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            // Read streaming chunks
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                // Parse SSE lines: data: {...}
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const raw = line.slice(6).trim();
                    if (!raw || raw === '[DONE]') continue;
                    try {
                        const msg = JSON.parse(raw);
                        if (msg.section) setWritingSection(msg.section);
                        if (msg.chunk) {
                            contentRef.current += msg.chunk;
                            setGeneratedContent(contentRef.current);
                        }
                        if (msg.done) {
                            setGeneratedContent(contentRef.current);
                        }
                    } catch {
                        // Non-JSON chunk — append directly
                        contentRef.current += raw;
                        setGeneratedContent(contentRef.current);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Unknown';
            setGeneratedContent(`<p style="color:#ef4444"><strong>Lỗi kết nối API:</strong> ${msg}</p>`);
        } finally {
            setIsGenerating(false);
            setWritingSection('');
        }
    }, [formData, referencePdfs]);

    return (
        <SKKNContext.Provider value={{
            formData, setFormData, generatedContent, isGenerating,
            writingSection, referencePdfs, setReferencePdfs, generateSKKN,
            updateField,
            addCoAuthor, removeCoAuthor, updateCoAuthor,
            addCoAuthorClass, removeCoAuthorClass, updateCoAuthorClass,
            addExperimentalClass, removeExperimentalClass, updateExperimentalClass,
            addControlClass, removeControlClass, updateControlClass,
            tocSections, setTocSections, activeTocId, setActiveTocId,
        }}>
            {children}
        </SKKNContext.Provider>
    );
}

export function useSKKN() {
    const ctx = useContext(SKKNContext);
    if (!ctx) throw new Error('useSKKN must be used within SKKNProvider');
    return ctx;
}

export { SECTION_NAMES };
