import type { Metadata } from 'next';
import {
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Clinical Light Mode типография (Stitch дизайн система "Clinical Oncology Portal").
// Hanken Grotesk няма кирилица/гръцки в Google Fonts, затова Inter е резервен шрифт за BG/EL.
const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic', 'greek'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin', 'cyrillic', 'greek'],
});

export const metadata: Metadata = {
  title: 'MedBot | Двуезично онкологично досие',
  description:
    'Интелигентна медицинска RAG платформа (Български 🇧🇬 <-> Гръцки 🇬🇷)',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html
      lang='bg'
      className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className='min-h-full flex flex-col bg-slate-950 text-slate-100'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
