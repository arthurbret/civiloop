import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Civiloop — L'Assemblée nationale, en clair", template: "%s · Civiloop" },
  description:
    "Votes, députés et groupes de l'Assemblée nationale, à partir des données ouvertes officielles, présentés de manière claire et accessible.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                <span className="flex h-full w-full">
                  <span className="w-1/3 bg-[#000091]" />
                  <span className="w-1/3 bg-white outline outline-1 -outline-offset-1 outline-line" />
                  <span className="w-1/3 bg-[#E1000F]" />
                </span>
              </span>
              <span className="text-lg font-extrabold tracking-tight">Civiloop</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="lg" className="text-[14px] font-semibold" nativeButton={false} render={<Link href="/votes" />}>
                Votes
              </Button>
              <Button variant="ghost" size="lg" className="text-[14px] font-semibold" nativeButton={false} render={<Link href="/deputes" />}>
                Députés
              </Button>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="border-t border-border py-8">
          <div className="mx-auto max-w-6xl px-5 text-[13px] text-muted-foreground">
            <p>
              Civiloop présente les données ouvertes de l'Assemblée nationale (
              <a href="https://data.assemblee-nationale.fr" className="underline" target="_blank" rel="noreferrer">
                data.assemblee-nationale.fr
              </a>
              ) — 17<sup>e</sup> législature. Site indépendant, sans affiliation institutionnelle.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
