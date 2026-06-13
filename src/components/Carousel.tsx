"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

/** Carrousel horizontal à flèches (« Derniers votes » de la maquette). */
export default function Carousel({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="size-9 rounded-full" onClick={() => scroll(-1)} aria-label="Précédent">
            <ArrowLeftIcon />
          </Button>
          <Button variant="outline" size="icon" className="size-9 rounded-full" onClick={() => scroll(1)} aria-label="Suivant">
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-1">
        {children}
      </div>
    </div>
  );
}
