import { create } from "zustand";

export type ToolId = "cutters" | "key" | "fuse";
export type Screen = "title" | "playing" | "paused" | "note" | "dead" | "won";

export type GameHud = {
  screen: Screen;
  battery: number;
  flashlight: boolean;
  items: ToolId[];
  prompt: string;
  noteTitle: string;
  noteBody: string;
  hidden: boolean;
  spotted: boolean;
  chase: boolean;
  objective: string;
  nearEnemy: number;
  muted: boolean;
  ready: boolean;
  holdProgress: number;
};

const INITIAL: GameHud = {
  screen: "title",
  battery: 72,
  flashlight: false,
  items: [],
  prompt: "",
  noteTitle: "",
  noteBody: "",
  hidden: false,
  spotted: false,
  chase: false,
  objective: "Encontre três ferramentas e abra o portão principal.",
  nearEnemy: 0,
  muted: false,
  ready: false,
  holdProgress: 0,
};

export const TOOL_LABEL: Record<ToolId, string> = {
  cutters: "Alicate de corte",
  key: "Chave da diretoria",
  fuse: "Fusível da energia",
};

export const useGameStore = create<
  GameHud & {
    patch: (p: Partial<GameHud>) => void;
    resetHud: () => void;
  }
>((set) => ({
  ...INITIAL,
  patch: (p) => set(p),
  resetHud: () => set({ ...INITIAL, ready: true, screen: "title" }),
}));
