import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("grid size-10 grid-cols-3 gap-[3px] rounded-xl bg-zinc-950 p-2 shadow-sm", className)} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className={cn("rounded-[2px] bg-white/35", [0, 4, 8].includes(index) && "bg-[#ff5c35]")} />
      ))}
    </div>
  );
}
