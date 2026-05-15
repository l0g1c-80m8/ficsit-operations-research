import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: 'FICSIT Operations Research',
  description:
    'A FICSIT-approved operations research tool to compensate for pioneers’ organic brains being unable to properly calculate input ratios.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
