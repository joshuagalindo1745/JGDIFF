import { supabase } from "@/integrations/supabase/client";

export interface ChampionLite {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  blurb: string;
  image: { full: string };
  stats: Record<string, number>;
  info: { attack: number; defense: number; magic: number; difficulty: number };
}

export interface ChampionFull extends ChampionLite {
  lore: string;
  spells: Array<{ id: string; name: string; description: string; image: { full: string } }>;
  passive: { name: string; description: string; image: { full: string } };
  allytips: string[];
  enemytips: string[];
}

export interface ItemData {
  name: string;
  description: string;
  plaintext: string;
  gold: { total: number; base: number; sell: number; purchasable: boolean };
  tags: string[];
  image: { full: string };
  maps: Record<string, boolean>;
}

const FN = "riot-data";

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FN, { body: payload });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

async function callGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FN}`);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!r.ok) throw new Error(`Failed: ${r.status}`);
  return r.json();
}

export const riotApi = {
  version: () => callGet<{ version: string }>("version"),
  champions: () => callGet<{ version: string; data: Record<string, ChampionLite> }>("champions"),
  champion: (id: string) => callGet<ChampionFull>("champion", { id }),
  items: () => callGet<{ version: string; data: Record<string, ItemData> }>("items"),
  predict: (payload: {
    mode: "1v1" | "5v5";
    ally: Array<{ championId: string; lane?: string; itemIds?: number[] }>;
    enemy: Array<{ championId: string; lane?: string; itemIds?: number[] }>;
    gameState?: Record<string, number>;
  }) => call<{
    winRate: number;
    breakdown: {
      allyScore: number;
      enemyScore: number;
      gameStateAdjustment: number;
      phase: string;
      allyComp: { ad: number; ap: number; tank: number };
      enemyComp: { ad: number; ap: number; tank: number };
    };
  }>({ action: "predict", ...payload }),
};

export const ddragon = {
  championIcon: (version: string, fileName: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${fileName}`,
  championSplash: (id: string, skinNum = 0) =>
    `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_${skinNum}.jpg`,
  championLoading: (id: string, skinNum = 0) =>
    `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_${skinNum}.jpg`,
  itemIcon: (version: string, fileName: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${fileName}`,
  spellIcon: (version: string, fileName: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${fileName}`,
  passiveIcon: (version: string, fileName: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${fileName}`,
};

export const LANES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;
export type Lane = (typeof LANES)[number];
