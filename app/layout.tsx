import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbm = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbm", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Nexus Command — Solo Operations OS",
    template: "%s · Nexus Command",
  },
  description:
    "An AI-native command center for the solo operator. Revenue, comms, social, finances, knowledge, agents, workflows and strategy in one live system.",
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('nexus-theme');if(t&&['obsidian','arctic','ember','forest','ultraviolet'].indexOf(t)>-1){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme='obsidian';}}catch(e){document.documentElement.dataset.theme='obsidian';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${inter.variable} ${jbm.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}