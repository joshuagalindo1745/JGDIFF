import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { riotApi, ddragon } from "@/lib/riot";
import { cn } from "@/lib/utils";
import { Plus, Search, X } from "lucide-react";

interface Props {
  itemIds: number[];
  onChange: (ids: number[]) => void;
}

export default function ItemSlots({ itemIds, onChange }: Props) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["items"], queryFn: riotApi.items, staleTime: 60 * 60 * 1000 });

  const items = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.data)
      .filter(([, item]) => item.gold?.purchasable && item.maps?.["11"] && item.gold.total > 500)
      .map(([id, item]) => ({ id: Number(id), ...item }))
      .sort((a, b) => b.gold.total - a.gold.total);
  }, [data]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.tags?.some((t) => t.toLowerCase().includes(q)));
  }, [items, search]);

  const setSlot = (slot: number, id: number | undefined) => {
    const next = [...itemIds];
    if (id === undefined) next.splice(slot, 1);
    else next[slot] = id;
    onChange(next.filter((x): x is number => typeof x === "number"));
  };

  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Array.from({ length: 6 }).map((_, slot) => {
        const id = itemIds[slot];
        const item = id && data ? data.data[String(id)] : undefined;
        return (
          <Dialog key={slot} open={openSlot === slot} onOpenChange={(o) => setOpenSlot(o ? slot : null)}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative aspect-square rounded border-2 border-border hover:border-secondary transition-all overflow-hidden bg-muted/40 group",
                  item && "border-secondary/60",
                )}
              >
                {item && data ? (
                  <>
                    <img src={ddragon.itemIcon(data.version, item.image.full)} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setSlot(slot, undefined); }}
                      className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5 text-destructive-foreground" />
                    </button>
                  </>
                ) : (
                  <Plus className="h-4 w-4 mx-auto text-muted-foreground group-hover:text-secondary" />
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl hex-border">
              <DialogHeader>
                <DialogTitle className="font-display tracking-widest hextech-text">Select Item · Slot {slot + 1}</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-9" autoFocus />
              </div>
              <ScrollArea className="h-[420px] pr-3">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setSlot(slot, item.id); setOpenSlot(null); setSearch(""); }}
                      title={`${item.name} - ${item.gold.total}g`}
                      className="group/item flex flex-col items-center gap-0.5 p-1 rounded hover:bg-secondary/10 transition-colors"
                    >
                      <img src={ddragon.itemIcon(data!.version, item.image.full)} alt={item.name} className="h-12 w-12 rounded border border-border group-hover/item:border-secondary" loading="lazy" />
                      <span className="text-[9px] text-warning font-display">{item.gold.total}g</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
