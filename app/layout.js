import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "Campus Task Board",
  description: "Peer-to-peer student task marketplace with milestone escrow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
