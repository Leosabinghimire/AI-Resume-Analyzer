import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "./globals.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const HEAD_CLEANUP =
  "(function(){var h=document.head;for(var n=h.firstChild;n;){var x=n.nextSibling;" +
  "if(n.nodeType===8||(n.nodeType===3&&!n.data.trim()))h.removeChild(n);n=x}})();";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AI Resume Analyzer & Job Matcher", template: "%s · AI Resume Analyzer" },
  description:
    "Compare your resume with job descriptions, see transparent skill-gap analysis, and improve your resume with grounded AI feedback.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} {...mantineHtmlProps}>
      <head>
        {/* Some hosts (e.g. Netlify) inject an HTML comment into <head>, which breaks React hydration
            (error #418). This runs before hydration and removes nodes React did not render. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_CLEANUP }} />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
