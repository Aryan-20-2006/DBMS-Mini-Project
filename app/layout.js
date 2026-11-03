import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Campus Task Board",
  description: "Peer-to-peer student task marketplace with milestone escrow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
