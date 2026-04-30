import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { riotApi, ddragon, type ChampionLite } from "@/lib/riot";
import { cn } from "@/lib/utils";
import { Search, Plus, X } from "lucide-react";

interface Props {
  value?: string;
  onChange: (id: string | undefined) => void;
  size?: "sm" | "md" | "lg";
}

export default function ChampionPicker({ value, onChange, size = "md" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["champions"], queryFn: riotApi.champions, staleTime: 60 * 60 * 1000 });

  const champions = useMemo(() => {
    if (!data) return [];
    return Object.values(data.data).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = useMemo(() => {
    if (!search) return champions;
    const q = search.toLowerCase();
    return champions.filter((c) => c.name.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)));
  }, [champions, search]);

  const selected = value && data ? data.data[value] : undefined;
  const dim = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";

  return (
    <div className="flex flex-col items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              dim,
              "relative rounded-md border-2 border-border hover:border-primary transition-all overflow-hidden bg-muted group",
              selected && "border-primary shadow-gold",
            )}
          >
            {selected && data ? (
              <img src={ddragon.championIcon(data.version, selected.image.full)} alt={selected.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground group-hover:text-primary">
                <Plus className="h-6 w-6" />
              </div>
            )}
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-3xl hex-border">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest gold-text">Select Champion</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or role..." className="pl-9" autoFocus />
          </div>
          <ScrollArea className="h-[420px] pr-3">
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                  className="group flex flex-col items-center gap-1 p-1 rounded hover:bg-primary/10 transition-colors"
                >
                  <img src={ddragon.championIcon(data!.version, c.image.full)} alt={c.name} className="h-14 w-14 rounded border border-border group-hover:border-primary transition-colors" loading="lazy" />
                  <span className="text-[10px] text-center truncate w-full font-display tracking-wide">{c.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {selected && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] font-display tracking-wider truncate max-w-[80px]">{selected.name}</span>
          <button onClick={() => onChange(undefined)} className="text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function useChampionsData() {
  return useQuery({ queryKey: ["champions"], queryFn: riotApi.champions, staleTime: 60 * 60 * 1000 });
}

export type { ChampionLite };
