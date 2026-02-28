import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Viết SKKN - Chuẩn VB 2989/SGDĐT-QLĐT Điện Biên',
  description: 'Ứng dụng hỗ trợ viết Sáng kiến Kinh nghiệm chuẩn theo văn bản số 2989/SGDĐT-QLĐT của Sở GD&ĐT tỉnh Điện Biên',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <script
          id="MathJax-script"
          async
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.MathJax = {
              tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] },
              svg: { fontCache: 'global' }
            };
          `
        }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
