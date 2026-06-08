import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 제목·표지용 세리프 서체 — 한국어 산세리프와 대비를 이루며 책다운 분위기 연출
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "책 읽기",
  description: "온라인 책 읽기 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${lora.variable} h-full antialiased`}>
      {/*
        React 하이드레이션 전에 테마 배경색을 즉시 적용.
        독자 설정(reader_settings)에서 theme을 읽어 body 배경을 세팅.
        이렇게 하면 페이지 이동 시 흰 화면 깜빡임이 사라집니다.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  try {
    var s = localStorage.getItem('reader_settings');
    if (s) {
      var t = JSON.parse(s).theme;
      var bg = t === 'dark' ? '#1a1a1a' : t === 'sepia' ? '#f5f0e8' : '#ffffff';
      document.documentElement.style.background = bg;
      document.documentElement.style.backgroundColor = bg;
    }
  } catch(e) {}
})();
          `.trim(),
        }}
      />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
