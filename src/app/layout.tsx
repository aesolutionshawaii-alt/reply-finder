import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reply Finder - Daily X Reply Opportunities',
  description: 'Get daily email digests of the best reply opportunities from accounts you monitor on X.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
