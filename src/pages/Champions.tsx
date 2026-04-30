import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { riotApi, ddragon, type ChampionLite } from "@/lib/riot";
import { Search, Hexagon, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const TAGS = ["All", "Fighter", "Tank", "Mage", "Assassin", "Marksman", "Support"];

export default function Champions() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("All");
  const [selected, setSelected] = useState<ChampionLite | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["champions"], queryFn: riotApi.champions, staleTime: 60 * 60 * 1000 });
  const { data: detail } = useQuery({
    queryKey: ["champion", selected?.id],
    queryFn: () => riotApi.champion(selected!.id),
    enabled: !!selected,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return Object.values(data.data)
      .filter((c) => (tag === "All" || c.tags.includes(tag)) && c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search, tag]);

  return (
    <div className="container py-8 animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h1 className="font-display text-4xl md:text-5xl tracking-widest gold-text">CHAMPION CODEX</h1>
        <p className="text-muted-foreground tracking-wide">
          {data ? `${Object.keys(data.data).length} champions · Patch ${data.version}` : "Loading the rift..."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-3xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search champion..." className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-3 py-1.5 rounded text-xs font-display tracking-wider border transition-all ${
                tag === t ? "bg-primary text-primary-foreground border-primary shadow-gold" : "border-border hover:border-primary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="group flex flex-col items-center gap-1 p-2 rounded-md hex-border hover:shadow-gold transition-all"
            >
              <img src={ddragon.championIcon(data!.version, c.image.full)} alt={c.name} className="h-16 w-16 rounded border-2 border-border group-hover:border-primary transition-colors" loading="lazy" />
              <span className="text-xs font-display tracking-wide text-center truncate w-full mt-1">{c.name}</span>
              <span className="text-[10px] text-muted-foreground tracking-wider truncate w-full text-center">{c.title}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl hex-border max-h-[90vh] overflow-hidden flex flex-col">
          {selected && data && (
            <>
              <div
                className="absolute inset-0 -z-10 opacity-25 bg-cover bg-center blur-sm"
                style={{ backgroundImage: `url(${ddragon.championSplash(selected.id)})` }}
              />
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <img src={ddragon.championIcon(data.version, selected.image.full)} alt={selected.name} className="h-16 w-16 rounded border-2 border-primary shadow-gold" />
                  <div>
                    <DialogTitle className="font-display text-2xl tracking-widest gold-text">{selected.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground tracking-wide">{selected.title}</p>
                    <div className="flex gap-1 mt-1">
                      {selected.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 mt-4 pr-3">
                <p className="text-sm leading-relaxed text-foreground/90">{selected.blurb}</p>

                <div className="grid grid-cols-4 gap-2 mt-4">
                  {(["attack", "defense", "magic", "difficulty"] as const).map((k) => (
                    <div key={k} className="p-2 rounded bg-surface-deep text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">{k}</div>
                      <div className="text-lg font-display gold-text">{selected.info[k]}/10</div>
                    </div>
                  ))}
                </div>

                {detail && (
                  <>
                    <h3 className="font-display tracking-widest text-secondary mt-6 mb-2">ABILITIES</h3>
                    <div className="space-y-2">
                      <div className="flex gap-3 p-2 rounded bg-surface-deep">
                        <img src={ddragon.passiveIcon(data.version, detail.passive.image.full)} alt="passive" className="h-12 w-12 rounded border border-secondary/50" />
                        <div>
                          <div className="font-display text-sm tracking-wider text-secondary">Passive · {detail.passive.name}</div>
                          <p className="text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: detail.passive.description }} />
                        </div>
                      </div>
                      {detail.spells.map((s, i) => (
                        <div key={s.id} className="flex gap-3 p-2 rounded bg-surface-deep">
                          <img src={ddragon.spellIcon(data.version, s.image.full)} alt={s.name} className="h-12 w-12 rounded border border-primary/50" />
                          <div>
                            <div className="font-display text-sm tracking-wider gold-text">{["Q", "W", "E", "R"][i]} · {s.name}</div>
                            <p className="text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: s.description }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3 className="font-display tracking-widest text-success mt-6 mb-2">ALLY TIPS</h3>
                    <ul className="text-xs space-y-1 list-disc pl-4 text-foreground/80">
                      {detail.allytips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                    <h3 className="font-display tracking-widest text-destructive mt-4 mb-2">ENEMY TIPS</h3>
                    <ul className="text-xs space-y-1 list-disc pl-4 text-foreground/80">
                      {detail.enemytips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </>
                )}
                {!detail && (
                  <div className="flex justify-center py-6"><Hexagon className="h-6 w-6 animate-spin text-primary" /></div>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
