import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function SiteLayout({
  children,
  transparentHeader = false,
}: {
  children: ReactNode;
  transparentHeader?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header transparentOnTop={transparentHeader} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
