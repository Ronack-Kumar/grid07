import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800"],
});

const handwriting = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Grid07 — Multi Expert AI Workspace",
  description: "Intelligent expert routing and free-model orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('grid07_theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} ${handwriting.variable} font-sans antialiased text-[#1A1A1E] bg-[#FAF8F5] min-h-screen selection:bg-[#B89355]/20`}>
        {children}
      </body>
    </html>
  );
}
