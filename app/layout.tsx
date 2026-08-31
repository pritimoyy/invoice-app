import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Invoices",
    template: "%s · Invoices",
  },
  description: "Invoicing for a freelance video editor.",
};

/**
 * Applied before first paint, so a dark-mode user never sees a white
 * flash while React hydrates. It has to be inline and synchronous for
 * that reason — a component effect runs too late. Wrapped in try/catch
 * because localStorage throws in some privacy modes, and a themed page is
 * not worth a blank one.
 */
const themeScript = `
try {
  var stored = localStorage.getItem('invoice-theme');
  var dark = stored === 'dark' ||
    ((stored === 'system' || !stored) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
