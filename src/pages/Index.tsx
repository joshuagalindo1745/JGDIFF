import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sword, Users, Bookmark, Hexagon, Sparkles, TrendingUp } from "lucide-react";

const features = [
  { icon: Sword, title: "Matchup Oracle", desc: "1v1 lane fights or full 5v5 team comps with item builds and game-state factors." },
  { icon: TrendingUp, title: "Live Patch Data", desc: "Always synced to the latest League patch — champions, items, and stats from Data Dragon." },
  { icon: Sparkles, title: "Smart Predictions", desc: "Comp scaling, lane fit, item value, gold leads, dragons & barons all factored in." },
  { icon: Users, title: "Champion Codex", desc: "Browse every champion with abilities, lore, and matchup tips." },
  { icon: Bookmark, title: "Save Your Builds", desc: "Save matchups to your personal codex and revisit predictions later." },
];

export default function Index() {
  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-rift" />
        <div className="container relative py-20 md:py-32 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Hexagon className="h-20 w-20 text-primary animate-glow-pulse" />
              <Hexagon className="h-20 w-20 text-secondary absolute inset-0 rotate-30 opacity-50" />
            </div>
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest gold-text mb-4">RIFT ORACLE</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto tracking-wide mb-8">
            Test League of Legends matchups with full patch data — champions, items, lanes, gold, objectives. Know your win rate before you queue.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground font-display tracking-widest text-lg px-8 shadow-gold hover:opacity-90">
              <Link to="/matchup"><Sword className="h-5 w-5" />TEST MATCHUP</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-secondary text-secondary hover:bg-secondary/10 font-display tracking-widest text-lg px-8">
              <Link to="/champions"><Users className="h-5 w-5" />BROWSE CHAMPIONS</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="font-display text-3xl text-center tracking-widest hextech-text mb-10">FORGED FOR THE RIFT</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="hex-border rounded-lg p-6 hover:shadow-gold transition-shadow">
              <Icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display text-lg tracking-wider gold-text mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
