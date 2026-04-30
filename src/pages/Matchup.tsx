import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ChampionPicker from "@/components/ChampionPicker";
import ItemSlots from "@/components/ItemSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { riotApi, LANES, type Lane } from "@/lib/riot";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sword, Shield, Zap, Save, Loader2, TrendingUp, Coins, Skull } from "lucide-react";

interface Slot {
  championId?: string;
  lane?: Lane;
  itemIds: number[];
}

const emptySlot = (lane?: Lane): Slot => ({ championId: undefined, lane, itemIds: [] });

export default function Matchup() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"1v1" | "5v5">("1v1");
  const [ally, setAlly] = useState<Slot[]>([emptySlot("MIDDLE")]);
  const [enemy, setEnemy] = useState<Slot[]>([emptySlot("MIDDLE")]);
  const [gameState, setGameState] = useState({
    minute: 15,
    goldDiff: 0,
    csDiff: 0,
    dragons: 0,
    barons: 0,
    towers: 0,
  });
  const [title, setTitle] = useState("");

  const switchMode = (m: string) => {
    const next = m as "1v1" | "5v5";
    setMode(next);
    if (next === "5v5") {
      setAlly(LANES.map((l) => emptySlot(l)));
      setEnemy(LANES.map((l) => emptySlot(l)));
    } else {
      setAlly([emptySlot("MIDDLE")]);
      setEnemy([emptySlot("MIDDLE")]);
    }
  };

  const updateSlot = (team: "ally" | "enemy", idx: number, patch: Partial<Slot>) => {
    const setter = team === "ally" ? setAlly : setEnemy;
    setter((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const predictMutation = useMutation({
    mutationFn: () =>
      riotApi.predict({
        mode,
        ally: ally.filter((s) => s.championId).map((s) => ({ championId: s.championId!, lane: s.lane, itemIds: s.itemIds })),
        enemy: enemy.filter((s) => s.championId).map((s) => ({ championId: s.championId!, lane: s.lane, itemIds: s.itemIds })),
        gameState,
      }),
    onError: (e: Error) => toast.error(e.message || "Prediction failed"),
  });

  const result = predictMutation.data;

  const handlePredict = () => {
    if (!ally.some((s) => s.championId) || !enemy.some((s) => s.championId)) {
      toast.error("Pick at least one champion on each side");
      return;
    }
    predictMutation.mutate();
  };

  const handleSave = async () => {
    if (!user) { toast.error("Sign in to save matchups"); return; }
    if (!result) { toast.error("Run a prediction first"); return; }
    if (!title.trim()) { toast.error("Add a title"); return; }
    const { error } = await supabase.from("saved_matchups").insert([{
      user_id: user.id,
      title: title.trim(),
      mode,
      ally_data: JSON.parse(JSON.stringify(ally)),
      enemy_data: JSON.parse(JSON.stringify(enemy)),
      game_state: gameState,
      predicted_win_rate: result.winRate,
    }]);
    if (error) toast.error(error.message);
    else { toast.success("Matchup saved to your codex"); setTitle(""); }
  };

  return (
    <div className="container py-8 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl md:text-5xl tracking-widest gold-text">MATCHUP ORACLE</h1>
        <p className="text-muted-foreground tracking-wide">Test champion match-ups · current patch from Data Dragon</p>
      </div>

      <Tabs value={mode} onValueChange={switchMode} className="w-full">
        <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2">
          <TabsTrigger value="1v1" className="font-display tracking-wider"><Sword className="h-4 w-4" />1v1</TabsTrigger>
          <TabsTrigger value="5v5" className="font-display tracking-wider"><Shield className="h-4 w-4" />5v5</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(["ally", "enemy"] as const).map((team) => {
            const slots = team === "ally" ? ally : enemy;
            const isAlly = team === "ally";
            return (
              <div key={team} className={`hex-border rounded-lg p-5 ${isAlly ? "shadow-hextech" : "shadow-card-hex"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-display text-xl tracking-widest ${isAlly ? "hextech-text" : "text-destructive"}`}>
                    {isAlly ? "YOUR TEAM" : "ENEMY TEAM"}
                  </h2>
                  <span className="text-xs text-muted-foreground font-display tracking-wider">{slots.filter(s => s.championId).length}/{slots.length}</span>
                </div>
                <div className="space-y-4">
                  {slots.map((slot, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded bg-surface-deep/50 border border-border/50">
                      <ChampionPicker value={slot.championId} onChange={(id) => updateSlot(team, idx, { championId: id })} />
                      <div className="flex-1 space-y-2">
                        <Select value={slot.lane} onValueChange={(v) => updateSlot(team, idx, { lane: v as Lane })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lane" /></SelectTrigger>
                          <SelectContent>
                            {LANES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <ItemSlots itemIds={slot.itemIds} onChange={(ids) => updateSlot(team, idx, { itemIds: ids })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Game state */}
      <div className="hex-border rounded-lg p-6">
        <h3 className="font-display text-lg tracking-widest gold-text mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5" />GAME STATE</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {([
            { key: "minute", label: "Game Time (min)", min: 0, max: 60, step: 1, suffix: "min" },
            { key: "goldDiff", label: "Gold Lead (k)", min: -20, max: 20, step: 0.5, suffix: "k" },
            { key: "csDiff", label: "CS Difference", min: -100, max: 100, step: 5, suffix: "" },
            { key: "dragons", label: "Dragon Lead", min: -4, max: 4, step: 1, suffix: "" },
            { key: "barons", label: "Baron Lead", min: -2, max: 2, step: 1, suffix: "" },
            { key: "towers", label: "Tower Lead", min: -11, max: 11, step: 1, suffix: "" },
          ] as const).map((cfg) => (
            <div key={cfg.key} className="space-y-2">
              <div className="flex justify-between items-baseline">
                <Label className="font-display text-xs tracking-wider uppercase">{cfg.label}</Label>
                <span className="text-sm gold-text font-display">{gameState[cfg.key]}{cfg.suffix}</span>
              </div>
              <Slider
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={[gameState[cfg.key]]}
                onValueChange={([v]) => setGameState((s) => ({ ...s, [cfg.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Predict + Result */}
      <div className="text-center">
        <Button
          size="lg"
          onClick={handlePredict}
          disabled={predictMutation.isPending}
          className="bg-gradient-radiant text-primary-foreground font-display tracking-widest text-lg px-12 py-6 shadow-gold hover:opacity-90"
        >
          {predictMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          DIVINE THE OUTCOME
        </Button>
      </div>

      {result && (
        <div className="hex-border rounded-lg p-8 animate-rise glow-gold">
          <div className="text-center mb-6">
            <div className="text-xs font-display tracking-widest text-muted-foreground mb-2">PREDICTED WIN RATE</div>
            <div className="font-display text-7xl gold-text">{result.winRate}%</div>
            <div className="mt-2 text-sm text-muted-foreground tracking-wide">
              Phase: <span className="text-secondary capitalize">{result.breakdown.phase}</span> game
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded bg-surface-deep">
              <div className="text-xs font-display tracking-wider text-muted-foreground">ALLY POWER</div>
              <div className="text-2xl font-display hextech-text">{result.breakdown.allyScore}</div>
            </div>
            <div className="p-3 rounded bg-surface-deep">
              <div className="text-xs font-display tracking-wider text-muted-foreground">ENEMY POWER</div>
              <div className="text-2xl font-display text-destructive">{result.breakdown.enemyScore}</div>
            </div>
            <div className="p-3 rounded bg-surface-deep">
              <div className="text-xs font-display tracking-wider text-muted-foreground flex items-center gap-1 justify-center"><Coins className="h-3 w-3" />STATE BONUS</div>
              <div className={`text-2xl font-display ${result.breakdown.gameStateAdjustment >= 0 ? "text-success" : "text-destructive"}`}>
                {result.breakdown.gameStateAdjustment >= 0 ? "+" : ""}{result.breakdown.gameStateAdjustment}
              </div>
            </div>
            <div className="p-3 rounded bg-surface-deep">
              <div className="text-xs font-display tracking-wider text-muted-foreground flex items-center gap-1 justify-center"><Skull className="h-3 w-3" />COMP</div>
              <div className="text-xs mt-1 font-display">
                AD {result.breakdown.allyComp.ad}/{result.breakdown.enemyComp.ad}<br/>
                AP {result.breakdown.allyComp.ap}/{result.breakdown.enemyComp.ap}<br/>
                TANK {result.breakdown.allyComp.tank}/{result.breakdown.enemyComp.tank}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={user ? "Name this matchup..." : "Sign in to save"} disabled={!user} maxLength={120} />
            <Button onClick={handleSave} disabled={!user} variant="outline" className="border-primary text-primary hover:bg-primary/10 font-display tracking-wider">
              <Save className="h-4 w-4" />SAVE
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
