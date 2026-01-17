import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Code Tanuki - AI-Powered PR Review',
  description: 'AI-powered PR review tool for dev managers using Claude AI & Google Gemini'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body id="__next">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
