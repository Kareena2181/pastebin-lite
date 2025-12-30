import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pastebin-Lite',
  description: 'Tiny pastebin with TTL and view limits',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="main-shell">
          <div className="panel">
            <h1>Pastebin-Lite</h1>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
