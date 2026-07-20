import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sri Mahalakshmi Community Hall – Book Online",
  description: "Book Sri Mahalakshmi Community Hall for weddings, receptions, family functions, and puberty ceremonies.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
