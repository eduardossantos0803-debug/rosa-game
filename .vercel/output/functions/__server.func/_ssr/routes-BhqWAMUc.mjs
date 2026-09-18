import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
import { c as EyeOff, i as Volume2, l as Battery, n as Wrench, o as KeyRound, r as VolumeX, s as Flashlight, t as Zap } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BhqWAMUc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var INITIAL = {
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
	holdProgress: 0
};
var TOOL_LABEL = {
	cutters: "Alicate de corte",
	key: "Chave da diretoria",
	fuse: "Fusível da energia"
};
var useGameStore = create((set) => ({
	...INITIAL,
	patch: (p) => set(p),
	resetHud: () => set({
		...INITIAL,
		ready: true,
		screen: "title"
	})
}));
var TOOL_ICON = {
	cutters: Wrench,
	key: KeyRound,
	fuse: Zap
};
function GameView() {
	const canvasRef = (0, import_react.useRef)(null);
	const gameRef = (0, import_react.useRef)(null);
	const hud = useGameStore();
	const [coarse, setCoarse] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
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
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let cancelled = false;
		let game = null;
		import("./engine-CK9uZRdI.mjs").then(({ HorrorGame }) => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				style: { imageRendering: "pixelated" },
				"aria-label": "Vista em primeira pessoa da escola"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scanlines pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette pointer-events-none absolute inset-0" }),
			hud.screen === "playing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, { mute }),
			hud.screen === "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TitleScreen, { onStart: start }),
			hud.screen === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseScreen, {
				onResume: resume,
				muted: hud.muted,
				onMute: mute
			}),
			hud.screen === "note" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoteScreen, {
				title: hud.noteTitle,
				body: hud.noteBody,
				onClose: closeNote
			}),
			hud.screen === "dead" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndScreen, {
				dead: true,
				onRestart: restart
			}),
			hud.screen === "won" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndScreen, {
				dead: false,
				onRestart: restart
			}),
			hud.screen === "playing" && coarse && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchControls, { gameRef })
		]
	});
}
function Hud({ mute }) {
	const hud = useGameStore();
	const bat = Math.round(hud.battery);
	const batColor = bat < 20 ? "bg-accent" : bat < 45 ? "bg-warn" : "bg-fg";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute left-4 top-4 z-10 flex max-w-[min(100%-2rem,22rem)] flex-col gap-3 sm:left-6 sm:top-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface/80 px-3 py-2.5 shadow-lg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1.5 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted",
						children: [hud.flashlight ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flashlight, {
							className: "size-3.5 text-fg",
							strokeWidth: 1.75
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flashlight, {
							className: "size-3.5 text-faint",
							strokeWidth: 1.75
						}), "Lanterna"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1 font-mono text-[11px] tabular-nums text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, {
								className: "size-3.5 text-muted",
								strokeWidth: 1.75
							}),
							bat,
							"%"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1.5 overflow-hidden rounded-full bg-elevated",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `h-full rounded-full ${batColor}`,
						style: { width: `${bat}%` }
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1.5",
				children: [
					"cutters",
					"key",
					"fuse"
				].map((id) => {
					const has = hud.items.includes(id);
					const Icon = TOOL_ICON[id];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						title: TOOL_LABEL[id],
						className: `flex size-11 items-center justify-center rounded-lg border ${has ? "border-border-strong bg-elevated text-fg" : "border-border bg-surface/70 text-faint"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-4",
							strokeWidth: 1.75
						})
					}, id);
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: mute,
					className: "pointer-events-auto flex size-11 items-center justify-center rounded-lg border border-border bg-surface/80 text-muted",
					"aria-label": hud.muted ? "Ativar som" : "Silenciar",
					children: hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" })
				}),
				hud.hidden && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-3.5" }), "Escondido"]
				}),
				hud.chase && !hud.hidden && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent",
					children: "Avistado"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
			"data-testid": "crosshair",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `size-[3px] rounded-full ${hud.chase ? "bg-accent" : "bg-fg/80"}` })
		}),
		(hud.prompt || hud.holdProgress > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute bottom-24 left-1/2 z-10 w-[min(90%,20rem)] -translate-x-1/2 text-center sm:bottom-16",
			children: [hud.holdProgress > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto mb-2 h-1 w-32 overflow-hidden rounded-full bg-elevated",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full bg-fg",
					style: { width: `${Math.round(hud.holdProgress * 100)}%` }
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-wide text-fg/90",
				children: hud.prompt
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "pointer-events-none absolute bottom-6 left-1/2 z-10 hidden w-[min(92%,28rem)] -translate-x-1/2 text-center font-mono text-[11px] text-muted sm:block",
			children: hud.objective
		})
	] });
}
function TitleScreen({ onStart }) {
	const hud = useGameStore();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/92 px-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg rounded-xl border border-border bg-surface px-6 py-8 sm:px-10 sm:py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[11px] uppercase tracking-[0.22em] text-muted",
					children: "Escola estadual · noturno"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl",
					children: "Rosa Bonfiglioli"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-prose text-sm leading-relaxed text-muted",
					children: "A cidade anunciou seu desaparecimento. Você não sumiu. Acordou trancado nos corredores depois da última aula. Os professores ainda andam. Encontre as três ferramentas e saia antes que eles lembrem o seu nome."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-6 grid gap-1.5 font-mono text-[11px] text-faint sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "WASD — andar" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Mouse — olhar" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Shift — correr" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "C — agachar" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "E — interagir / esconder" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "F — lanterna" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"data-testid": "start-btn",
					onClick: onStart,
					disabled: !hud.ready,
					className: "mt-8 h-12 w-full rounded-lg bg-fg text-sm font-medium text-ink transition-transform duration-150 hover:opacity-95 active:scale-[0.98] disabled:opacity-50",
					children: hud.ready ? "Entrar na escola" : "Carregando os corredores…"
				})
			]
		})
	});
}
function PauseScreen({ onResume, muted, onMute }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm rounded-xl border border-border bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl font-semibold text-fg",
					children: "Pausa"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "O corredor continua sem você."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onResume,
						className: "h-12 rounded-lg bg-fg text-sm font-medium text-ink active:scale-[0.98]",
						children: "Continuar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onMute,
						className: "h-12 rounded-lg border border-border-strong bg-elevated text-sm font-medium text-fg",
						children: muted ? "Ativar som" : "Silenciar"
					})]
				})
			]
		})
	});
}
function NoteScreen({ title, body, onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/70 px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "w-full max-w-md rounded-xl border border-border bg-paper px-6 py-7 text-ink shadow-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[10px] uppercase tracking-[0.18em] text-accent-dim",
					children: "Documento encontrado"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-2xl font-semibold leading-snug",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-relaxed text-ink/80",
					children: body
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "mt-6 h-11 w-full rounded-md bg-ink text-sm font-medium text-paper active:scale-[0.98]",
					children: "Guardar o papel"
				})
			]
		})
	});
}
function EndScreen({ dead, onRestart }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/90 px-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-xl border border-border bg-surface px-7 py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[11px] uppercase tracking-[0.2em] text-muted",
					children: dead ? "Registro encerrado" : "Saída confirmada"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-3 font-display text-3xl font-semibold text-fg",
					children: dead ? "Eles te encontraram" : "Você saiu"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-relaxed text-muted",
					children: dead ? "O armário não fecha sozinho. A lanterna denuncia. Tente de novo — a grade ainda espera as três ferramentas." : "A cidade ainda pensa que você desapareceu. O portão fechou atrás de você. Não olhe para os corredores."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onRestart,
					className: "mt-7 h-12 w-full rounded-lg bg-fg text-sm font-medium text-ink active:scale-[0.98]",
					children: dead ? "Acordar de novo" : "Jogar outra vez"
				})
			]
		})
	});
}
function TouchControls({ gameRef }) {
	const stickRef = (0, import_react.useRef)(null);
	const knobRef = (0, import_react.useRef)(null);
	const pid = (0, import_react.useRef)(null);
	const setAxis = (x, y) => gameRef.current?.setMoveAxis(x, y);
	const onDown = (e) => {
		pid.current = e.pointerId;
		e.target.setPointerCapture(e.pointerId);
		move(e);
	};
	const move = (e) => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: stickRef,
			onPointerDown: onDown,
			onPointerMove: move,
			onPointerUp: onUp,
			onPointerCancel: onUp,
			className: "relative size-28 rounded-full border border-border-strong bg-surface/70",
			"aria-label": "Mover",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: knobRef,
				className: "absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchBtn, {
					label: "Lanterna",
					onPress: () => pulseKey("KeyF")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchBtn, {
					label: "Agachar",
					hold: true,
					onDown: () => sendKey("KeyC", true),
					onUp: () => sendKey("KeyC", false)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchBtn, {
				wide: true,
				label: "Interagir / Esconder",
				hold: true,
				onDown: () => sendKey("KeyE", true),
				onUp: () => sendKey("KeyE", false)
			})]
		})]
	});
}
function TouchBtn({ label, wide, hold, onPress, onDown, onUp }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onPointerDown: (e) => {
			e.preventDefault();
			if (hold) onDown?.();
			else onPress?.();
		},
		onPointerUp: () => {
			if (hold) onUp?.();
		},
		onPointerCancel: () => {
			if (hold) onUp?.();
		},
		className: `${wide ? "h-12 w-44" : "h-12 min-w-20 px-3"} rounded-lg border border-border-strong bg-elevated/90 font-mono text-[10px] uppercase tracking-wide text-fg`,
		children: label
	});
}
function sendKey(code, down) {
	window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
		code,
		bubbles: true
	}));
}
function pulseKey(code) {
	sendKey(code, true);
	window.setTimeout(() => sendKey(code, false), 90);
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameView, {});
}
//#endregion
export { useGameStore as n, routes_exports as t };
