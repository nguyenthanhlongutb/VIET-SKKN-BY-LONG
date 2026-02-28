export type TeacherLevel = 'Tiểu học' | 'THCS' | 'THPT';

export const GRADE_MAP: Record<TeacherLevel, number[]> = {
  'Tiểu học': [1, 2, 3, 4, 5],
  'THCS': [6, 7, 8, 9],
  'THPT': [10, 11, 12],
};

export interface CoAuthorClass {
  id: string;
  className: string;
  studentCount: string;
  studentStatus: string;
}

export interface CoAuthor {
  id: string;
  name: string;
  school: string;
  expClasses: CoAuthorClass[]; // experimental classes at co-author's school
}

export interface ClassInfo {
  id: string;
  className: string;
  studentCount: string;
  studentStatus: string;
}

export interface TOCSection {
  id: string;
  title: string;
  level: number;
  isWriting?: boolean;
}

export interface PdfFile {
  name: string;
  base64: string;
  size: number;
}

export interface SKKNFormData {
  // Section 1 - Required
  authorName: string;
  school: string;
  location: string;
  title: string;
  subject: string;
  teacherLevel: TeacherLevel;
  gradeLevel: string;
  examMonth: string;
  examYear: string;
  aiApplicationInfo: string;
  textbook: string;
  coAuthors: CoAuthor[];
  experimentalClasses: ClassInfo[];
  controlClasses: ClassInfo[];

  // Section 2 - School info
  schoolOverview: string;
  facilities: string;

  // Section 3 - Supplement
  desiredPages: string;
  topicFocus: string;
  numSolutions: string;   // number of solutions/measures in C.b
  referencePdfs?: PdfFile[]; // uploaded reference documents
}

export interface GeneratedSection {
  heading: string;
  content: string;
}

export type ChartType = 'bar' | 'pie';

export interface ChartData {
  type: ChartType;
  title: string;
  labels: string[];
  values: number[];
}

// Writing step labels for streaming progress
export const WRITING_STEPS = [
  { key: 'bia', label: 'Bìa & Thông tin chung' },
  { key: 'mucluc', label: 'Mục lục & Viết tắt' },
  { key: 'A', label: 'A. Mục đích, sự cần thiết' },
  { key: 'B', label: 'B. Phạm vi triển khai' },
  { key: 'C1', label: 'C.1. Tình trạng giải pháp' },
  { key: 'Cb', label: 'C.b. Nội dung giải pháp' },
  { key: 'Cd', label: 'C.d. Hiệu quả, lợi ích' },
  { key: 'Ceg', label: 'C.e-g. Phạm vi & Kiến nghị' },
  { key: 'D', label: 'D. Đồng tác giả' },
  { key: 'E', label: 'E. Phụ lục & Minh chứng' },
];
