import './globals.css';
import './brand.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReLoop AI — UI Design Lab',
  description: 'A visual prototype for cross-border complaint intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
