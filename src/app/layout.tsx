import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monta PC — menor preço das peças",
  description: "Compare o preço à vista de peças de computador na KaBuM! e na Terabyte e monte o PC pelo menor total.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
