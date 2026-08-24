import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DotMatrixBg from "@/components/DotMatrixBg";
import WelcomeLoader from "@/components/WelcomeLoader";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SettingsDrawer from "@/components/SettingsDrawer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "[deltavr.]",
  description:
    "deltavr — open source pcvr headset. orbsLAM3 headset-camera tracking processed by pc, tmr controllers, hall triggers, full asa shell.",
  openGraph: {
    title: "DeltaVR — open source pcvr headset",
    description:
      "pseudopancake optics, orbsLAM3 on-headset-camera tracking processed by pc, tmr + hall controller boards, printed in asa.",
    url: "https://oxygenated.uk/deltavr",
    siteName: "oxygenated.uk",
  },
};

const themeInit = `try{if(localStorage.getItem('oxy_theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} loading`}>
        <DotMatrixBg />
        <WelcomeLoader />
        <Nav />
        <main>{children}</main>
        <Footer />
        <SettingsDrawer />
      </body>
    </html>
  );
}
