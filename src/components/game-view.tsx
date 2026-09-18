import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  Battery,
  EyeOff,
  Flashlight,
  KeyRound,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from "lucide-react";
import { TOOL_LABEL, useGameStore, type ToolId } from "@/game/store";

const TOOL_ICON: Record<ToolId, typeof Wrench> = {
  cutters: Wrench,
  key: KeyRound,
  fuse: Zap,
};

type GameHandle = {
  start: () => void;
  resume: () => void;
  closeNote: () => void;
  restart: () => void;
  toggleMute: () => void;
  setMoveAxis: (x: number, y: number) => void;
  destroy: () => void;
};

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const hud = useGameStore();
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches || window.innerWidth < 720);
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let game: GameHandle | null = null;
    void import("@/game/engine").then(({ HorrorGame }) => {
      if (cancelled || !canvas) return;
      game = new HorrorGame(canvas);
      gameRef.current = game;
    });
    return () => {
      cancelled = true;
      game?.destroy();
      gameRef.current = null;
    };
  }, []);

  const start = () => gameRef.current?.start();
  const resume = () => gameRef.current?.resume();
  const closeNote = () => gameRef.current?.closeNote();
  const restart = () => gameRef.current?.restart();
  const mute = () => gameRef.current?.toggleMute();

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ imageRendering: "pixelated" }}
        aria-label="Vista em primeira pessoa da escola"
      />
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="vignette pointer-events-none absolute inset-0" />

      {hud.screen === "playing" && <Hud mute={mute} />}
      {hud.screen === "title" && <TitleScreen onStart={start} />}
      {hud.screen === "paused" && <PauseScreen onResume={resume} muted={hud.muted} onMute={mute} />}
      {hud.screen === "note" && (
        <NoteScreen title={hud.noteTitle} body={hud.noteBody} onClose={closeNote} />
      )}
      {hud.screen === "dead" && <EndScreen dead onRestart={restart} />}
      {hud.screen === "won" && <EndScreen dead={false} onRestart={restart} />}

      {hud.screen === "playing" && coarse && <TouchControls gameRef={gameRef} />}
    </div>
  );
}

function Hud({ mute }: { mute: () => void }) {
  const hud = useGameStore();
  const bat = Math.round(hud.battery);
  const batColor = bat < 20 ? "bg-accent" : bat < 45 ? "bg-warn" : "bg-fg";

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[min(100%-2rem,22rem)] flex-col gap-3 sm:left-6 sm:top-6">
        <div className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 shadow-lg">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
              {hud.flashlight ? (
                <Flashlight className="size-3.5 text-fg" strokeWidth={1.75} />
              ) : (
                <Flashlight className="size-3.5 text-faint" strokeWidth={1.75} />
              )}
              Lanterna
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-fg">
              <Battery className="size-3.5 text-muted" strokeWidth={1.75} />
              {bat}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
            <div
              className={`h-full rounded-full ${batColor}`}
              style={{ width: `${bat}%` }}
            />
          </div>
        </div>

        <div className="flex gap-1.5">
          {(["cutters", "key", "fuse"] as ToolId[]).map((id) => {
            const has = hud.items.includes(id);
            const Icon = TOOL_ICON[id];
            return (
              <div
                key={id}
                title={TOOL_LABEL[id]}
                className={`flex size-11 items-center justify-center rounded-lg border ${
                  has
                    ? "border-border-strong bg-elevated text-fg"
                    : "border-border bg-surface/70 text-faint"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={mute}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-lg border border-border bg-surface/80 text-muted"
          aria-label={hud.muted ? "Ativar som" : "Silenciar"}
        >
          {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        {hud.hidden && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
            <EyeOff className="size-3.5" />
            Escondido
          </div>
        )}
        {hud.chase && !hud.hidden && (
          <div className="rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent">
            Avistado
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        data-testid="crosshair"
      >
        <div className={`size-[3px] rounded-full ${hud.chase ? "bg-accent" : "bg-fg/80"}`} />
      </div>

      {(hud.prompt || hud.holdProgress > 0) && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 w-[min(90%,20rem)] -translate-x-1/2 text-center sm:bottom-16">
          {hud.holdProgress > 0 && (
            <div className="mx-auto mb-2 h-1 w-32 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full bg-fg"
                style={{ width: `${Math.round(hud.holdProgress * 100)}%` }}
              />
            </div>
          )}
          <p className="font-mono text-xs tracking-wide text-fg/90">{hud.prompt}</p>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden w-[min(92%,28rem)] -translate-x-1/2 text-center font-mono text-[11px] text-muted sm:block">
        {hud.objective}
      </p>
    </>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  const hud = useGameStore();
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/92 px-5">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Escola estadual · noturno
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
          Rosa Bonfiglioli
        </h1>
        <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted">
          A cidade anunciou seu desaparecimento. Você não sumiu. Acordou trancado nos corredores
          depois da última aula. Os professores ainda andam. Encontre as três ferramentas e saia
          antes que eles lembrem o seu nome.
        </p>
        <ul className="mt-6 grid gap-1.5 font-mono text-[11px] text-faint sm:grid-cols-2">
          <li>WASD — andar</li>
          <li>Mouse — olhar</li>
          <li>Shift — correr</li>
          <li>C — agachar</li>
          <li>E — interagir / esconder</li>
          <li>F — lanterna</li>
        </ul>
        <button
          type="button"
          data-testid="start-btn"
          onClick={onStart}
          disabled={!hud.ready}
          className="mt-8 h-12 w-full rounded-lg bg-fg text-sm font-medium text-ink transition-transform duration-150 hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
        >
          {hud.ready ? "Entrar na escola" : "Carregando os corredores…"}
        </button>
      </div>
    </div>
  );
}

function PauseScreen({
  onResume,
  muted,
  onMute,
}: {
  onResume: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-3xl font-semibold text-fg">Pausa</h2>
        <p className="mt-2 text-sm text-muted">O corredor continua sem você.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="h-12 rounded-lg bg-fg text-sm font-medium text-ink active:scale-[0.98]"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onMute}
            className="h-12 rounded-lg border border-border-strong bg-elevated text-sm font-medium text-fg"
          >
            {muted ? "Ativar som" : "Silenciar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteScreen({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 px-4">
      <article className="w-full max-w-md rounded-xl border border-border bg-paper px-6 py-7 text-ink shadow-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-dim">
          Documento encontrado
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug">{title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">{body}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-md bg-ink text-sm font-medium text-paper active:scale-[0.98]"
        >
          Guardar o papel
        </button>
      </article>
    </div>
  );
}

function EndScreen({ dead, onRestart }: { dead: boolean; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/90 px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface px-7 py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {dead ? "Registro encerrado" : "Saída confirmada"}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-fg">
          {dead ? "Eles te encontraram" : "Você saiu"}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {dead
            ? "O armário não fecha sozinho. A lanterna denuncia. Tente de novo — a grade ainda espera as três ferramentas."
            : "A cidade ainda pensa que você desapareceu. O portão fechou atrás de você. Não olhe para os corredores."}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-7 h-12 w-full rounded-lg bg-fg text-sm font-medium text-ink active:scale-[0.98]"
        >
          {dead ? "Acordar de novo" : "Jogar outra vez"}
        </button>
      </div>
    </div>
  );
}

function TouchControls({ gameRef }: { gameRef: RefObject<GameHandle | null> }) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const setAxis = (x: number, y: number) => gameRef.current?.setMoveAxis(x, y);

  const onDown = (e: ReactPointerEvent) => {
    pid.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: ReactPointerEvent) => {
    if (pid.current !== e.pointerId || !stickRef.current || !knobRef.current) return;
    const r = stickRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    knobRef.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
    setAxis(dx, -dy);
  };
  const onUp = () => {
    pid.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
    setAxis(0, 0);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        ref={stickRef}
        onPointerDown={onDown}
        onPointerMove={move}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative size-28 rounded-full border border-border-strong bg-surface/70"
        aria-label="Mover"
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <TouchBtn label="Lanterna" onPress={() => pulseKey("KeyF")} />
          <TouchBtn
            label="Agachar"
            hold
            onDown={() => sendKey("KeyC", true)}
            onUp={() => sendKey("KeyC", false)}
          />
        </div>
        <TouchBtn
          wide
          label="Interagir / Esconder"
          hold
          onDown={() => sendKey("KeyE", true)}
          onUp={() => sendKey("KeyE", false)}
        />
      </div>
    </div>
  );
}

function TouchBtn({
  label,
  wide,
  hold,
  onPress,
  onDown,
  onUp,
}: {
  label: string;
  wide?: boolean;
  hold?: boolean;
  onPress?: () => void;
  onDown?: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (hold) onDown?.();
        else onPress?.();
      }}
      onPointerUp={() => {
        if (hold) onUp?.();
      }}
      onPointerCancel={() => {
        if (hold) onUp?.();
      }}
      className={`${wide ? "h-12 w-44" : "h-12 min-w-20 px-3"} rounded-lg border border-border-strong bg-elevated/90 font-mono text-[10px] uppercase tracking-wide text-fg`}
    >
      {label}
    </button>
  );
}

function sendKey(code: string, down: boolean) {
  window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
}

function pulseKey(code: string) {
  sendKey(code, true);
  window.setTimeout(() => sendKey(code, false), 90);
}
