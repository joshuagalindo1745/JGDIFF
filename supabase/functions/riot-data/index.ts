// Riot data + matchup prediction edge function
// Uses Data Dragon (no key needed) for static data and Riot API for live champion mastery/winrate signals.
// The prediction model is heuristic but informed by Data Dragon stats + champion archetypes.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const RIOT_API_KEY = Deno.env.get("RIOT_API_KEY") ?? "";
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

// ---------------- Cache (in-memory per isolate) ----------------
const cache = new Map<string, { data: unknown; expires: number }>();
const getCached = async <T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
};

const getLatestVersion = () =>
  getCached("version", 1000 * 60 * 60, async () => {
    const r = await fetch(`${DDRAGON_BASE}/api/versions.json`);
    const j = (await r.json()) as string[];
    return j[0];
  });

const getChampions = () =>
  getCached("champions", 1000 * 60 * 60, async () => {
    const v = await getLatestVersion();
    const r = await fetch(`${DDRAGON_BASE}/cdn/${v}/data/en_US/champion.json`);
    const j = await r.json();
    return { version: v, data: j.data };
  });

const getChampionDetail = (id: string) =>
  getCached(`champ:${id}`, 1000 * 60 * 60, async () => {
    const v = await getLatestVersion();
    const r = await fetch(`${DDRAGON_BASE}/cdn/${v}/data/en_US/champion/${id}.json`);
    const j = await r.json();
    return j.data[id];
  });

const getItems = () =>
  getCached("items", 1000 * 60 * 60, async () => {
    const v = await getLatestVersion();
    const r = await fetch(`${DDRAGON_BASE}/cdn/${v}/data/en_US/item.json`);
    const j = await r.json();
    return { version: v, data: j.data };
  });

// ---------------- Prediction Model ----------------
// Lane affinity: champion tags vs lane
const laneAffinity: Record<string, string[]> = {
  TOP: ["Fighter", "Tank"],
  JUNGLE: ["Fighter", "Assassin", "Tank"],
  MIDDLE: ["Mage", "Assassin"],
  BOTTOM: ["Marksman"],
  UTILITY: ["Support", "Tank", "Mage"],
};

// Archetype scaling curves (early/mid/late strength 0..1)
const archetypeScaling: Record<string, [number, number, number]> = {
  Assassin: [0.55, 0.85, 0.65],
  Marksman: [0.40, 0.70, 0.95],
  Mage: [0.50, 0.80, 0.85],
  Tank: [0.55, 0.70, 0.85],
  Fighter: [0.65, 0.80, 0.70],
  Support: [0.55, 0.65, 0.75],
};

interface ChampSlot {
  championId: string;
  lane?: string;
  itemIds?: number[];
}

interface PredictPayload {
  mode: "1v1" | "5v5";
  ally: ChampSlot[];
  enemy: ChampSlot[];
  gameState?: {
    goldDiff?: number;     // ally - enemy (k)
    csDiff?: number;       // ally - enemy
    dragons?: number;      // ally - enemy
    barons?: number;       // ally - enemy
    towers?: number;       // ally - enemy
    minute?: number;       // 0..60
  };
}

const archetypeFromTags = (tags: string[]): string => tags?.[0] ?? "Fighter";

const teamScore = async (
  team: ChampSlot[],
  minute: number,
): Promise<{ raw: number; tags: string[]; total: { ad: number; ap: number; tank: number } }> => {
  let raw = 0;
  const tags: string[] = [];
  const total = { ad: 0, ap: 0, tank: 0 };

  for (const slot of team) {
    if (!slot.championId) continue;
    const detail = await getChampionDetail(slot.championId);
    const champTags: string[] = detail.tags ?? [];
    tags.push(...champTags);

    const archetype = archetypeFromTags(champTags);
    const scaling = archetypeScaling[archetype] ?? [0.6, 0.7, 0.7];
    const phase = minute < 15 ? 0 : minute < 30 ? 1 : 2;
    let score = scaling[phase] * 100;

    // Lane fit bonus
    if (slot.lane && laneAffinity[slot.lane]?.some((t) => champTags.includes(t))) {
      score += 5;
    } else if (slot.lane) {
      score -= 4;
    }

    // Base stat sanity (HP, AD, MR averaged)
    const stats = detail.stats ?? {};
    const hp = (stats.hp ?? 600) + (stats.hpperlevel ?? 90) * 10;
    const ad = (stats.attackdamage ?? 60) + (stats.attackdamageperlevel ?? 3) * 10;
    score += (hp / 2400) * 5 + (ad / 180) * 3;

    // Damage profile
    if (champTags.includes("Marksman") || champTags.includes("Fighter")) total.ad += 1;
    else if (champTags.includes("Mage")) total.ap += 1;
    if (champTags.includes("Tank")) total.tank += 1;

    // Item contribution: 6 items ~ +18 score (3 per slot capped)
    const items = slot.itemIds?.filter(Boolean) ?? [];
    score += Math.min(items.length, 6) * 3;

    raw += score;
  }
  return { raw, tags, total };
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const predict = async (p: PredictPayload) => {
  const minute = p.gameState?.minute ?? 15;
  const ally = await teamScore(p.ally, minute);
  const enemy = await teamScore(p.enemy, minute);

  // Comp diversity bonus (balanced damage)
  const allyDmgBalance = ally.total.ad > 0 && ally.total.ap > 0 ? 4 : -2;
  const enemyDmgBalance = enemy.total.ad > 0 && enemy.total.ap > 0 ? 4 : -2;
  // Frontline check
  const allyFront = ally.total.tank > 0 ? 3 : -2;
  const enemyFront = enemy.total.tank > 0 ? 3 : -2;

  let allyTotal = ally.raw + allyDmgBalance + allyFront;
  let enemyTotal = enemy.raw + enemyDmgBalance + enemyFront;

  // Game state contribution
  const gs = p.gameState ?? {};
  const stateAdj =
    (gs.goldDiff ?? 0) * 0.8 +
    (gs.csDiff ?? 0) * 0.15 +
    (gs.dragons ?? 0) * 4 +
    (gs.barons ?? 0) * 8 +
    (gs.towers ?? 0) * 2.5;

  allyTotal += stateAdj;

  const diff = (allyTotal - enemyTotal) / Math.max(allyTotal + enemyTotal, 1);
  const winRate = Math.round(sigmoid(diff * 6) * 1000) / 10; // 0..100, 1 decimal

  return {
    winRate,
    breakdown: {
      allyScore: Math.round(allyTotal * 10) / 10,
      enemyScore: Math.round(enemyTotal * 10) / 10,
      gameStateAdjustment: Math.round(stateAdj * 10) / 10,
      phase: minute < 15 ? "early" : minute < 30 ? "mid" : "late",
      allyComp: { ad: ally.total.ad, ap: ally.total.ap, tank: ally.total.tank },
      enemyComp: { ad: enemy.total.ad, ap: enemy.total.ap, tank: enemy.total.tank },
    },
  };
};

// ---------------- Router ----------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (req.method === "POST" ? (await req.clone().json()).action : null);

    if (action === "version") {
      const v = await getLatestVersion();
      return new Response(JSON.stringify({ version: v }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "champions") {
      const data = await getChampions();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "champion") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const d = await getChampionDetail(id);
      return new Response(JSON.stringify(d), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "items") {
      const data = await getItems();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "predict") {
      const body = (await req.json()) as PredictPayload;
      if (!body.ally || !body.enemy) {
        return new Response(JSON.stringify({ error: "ally and enemy required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await predict(body);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      return new Response(
        JSON.stringify({ ok: true, hasRiotKey: RIOT_API_KEY.length > 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("riot-data error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
