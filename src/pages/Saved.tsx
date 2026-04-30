import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { riotApi, ddragon } from "@/lib/riot";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Bookmark, Hexagon } from "lucide-react";
import { toast } from "sonner";

interface SavedRow {
  id: string;
  title: string;
  mode: string;
  ally_data: Array<{ championId?: string; lane?: string; itemIds?: number[] }>;
  enemy_data: Array<{ championId?: string; lane?: string; itemIds?: number[] }>;
  game_state: Record<string, number>;
  predicted_win_rate: number | null;
  created_at: string;
}

export default function Saved() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: champData } = useQuery({ queryKey: ["champions"], queryFn: riotApi.champions, staleTime: 60 * 60 * 1000 });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("saved_matchups").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as SavedRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_matchups").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); setRows((r) => r.filter((x) => x.id !== id)); }
  };

  return (
    <div className="container py-8 animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h1 className="font-display text-4xl md:text-5xl tracking-widest gold-text">YOUR CODEX</h1>
        <p className="text-muted-foreground tracking-wide">Saved matchups & predictions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 hex-border rounded-lg max-w-md mx-auto">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground tracking-wide mb-4">No matchups saved yet.</p>
          <Button asChild className="bg-gradient-gold text-primary-foreground font-display tracking-wider">
            <Link to="/matchup">Create your first prediction</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => {
            const wr = row.predicted_win_rate ?? 0;
            const wrColor = wr >= 55 ? "text-success" : wr >= 45 ? "text-primary" : "text-destructive";
            return (
              <div key={row.id} className="hex-border rounded-lg p-4 hover:shadow-gold transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display tracking-wider text-foreground">{row.title}</h3>
                    <p className="text-xs text-muted-foreground tracking-wider">{row.mode.toUpperCase()} · {new Date(row.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => remove(row.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center my-4">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Win Rate</div>
                    <div className={`text-4xl font-display ${wrColor}`}>{wr}%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {(["ally_data", "enemy_data"] as const).map((side) => (
                    <div key={side} className="flex items-center gap-1">
                      <span className={`text-[10px] font-display tracking-wider w-12 ${side === "ally_data" ? "text-secondary" : "text-destructive"}`}>
                        {side === "ally_data" ? "ALLY" : "ENEMY"}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {row[side].filter((s) => s.championId).map((slot, i) => {
                          const c = champData && slot.championId ? champData.data[slot.championId] : undefined;
                          return c ? (
                            <img key={i} src={ddragon.championIcon(champData!.version, c.image.full)} alt={c.name} title={c.name} className="h-7 w-7 rounded border border-border" />
                          ) : (
                            <div key={i} className="h-7 w-7 rounded border border-border bg-muted flex items-center justify-center">
                              <Hexagon className="h-3 w-3 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
