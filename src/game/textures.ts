import * as THREE from "three";

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function noise(ctx: CanvasRenderingContext2D, s: number, alpha: number) {
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function createTextures() {
  const wall = canvasTex(
    64,
    (ctx, s) => {
      ctx.fillStyle = "#6a4a4c";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#5c3f42";
      for (let y = 0; y < s; y += 16) {
        ctx.fillRect(0, y, s, 1);
      }
      ctx.fillStyle = "#7a5858";
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.25;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 8, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#3a2426";
      ctx.fillRect(10, 28, 18, 10);
      ctx.fillStyle = "#4a3032";
      ctx.fillRect(38, 8, 12, 22);
      noise(ctx, s, 0.12);
    },
    2,
  );

  const floor = canvasTex(
    64,
    (ctx, s) => {
      const tile = 16;
      for (let y = 0; y < s; y += tile) {
        for (let x = 0; x < s; x += tile) {
          const odd = ((x + y) / tile) % 2 === 0;
          ctx.fillStyle = odd ? "#1a1c18" : "#141612";
          ctx.fillRect(x, y, tile, tile);
          ctx.strokeStyle = "#0c0d0a";
          ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
        }
      }
      noise(ctx, s, 0.08);
    },
    8,
  );

  const ceil = canvasTex(
    64,
    (ctx, s) => {
      ctx.fillStyle = "#2a2624";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "#1a1816";
      for (let i = 0; i <= s; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(s, i);
        ctx.stroke();
      }
      ctx.fillStyle = "#3a2218";
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(44, 20, 14, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      noise(ctx, s, 0.1);
    },
    6,
  );

  const wood = canvasTex(32, (ctx, s) => {
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      ctx.fillStyle = y % 4 === 0 ? "#2e2012" : "#46301c";
      ctx.fillRect(0, y, s, 1);
    }
    noise(ctx, s, 0.08);
  });

  const metal = canvasTex(32, (ctx, s) => {
    ctx.fillStyle = "#2c3034";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#1c2024";
    ctx.fillRect(0, 0, 4, s);
    ctx.fillRect(s - 3, 0, 3, s);
    ctx.fillStyle = "#3a4046";
    ctx.fillRect(12, 8, 8, 3);
    noise(ctx, s, 0.1);
  });

  const paper = canvasTex(32, (ctx, s) => {
    ctx.fillStyle = "#d8c8a8";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#2a2018";
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(4, 6 + i * 4, 22 - (i % 3) * 4, 1);
    }
    ctx.globalAlpha = 1;
    noise(ctx, s, 0.06);
  });

  const door = canvasTex(64, (ctx, s) => {
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#3a2418";
    ctx.fillRect(4, 4, s - 8, s - 8);
    ctx.fillStyle = "#c4a35a";
    ctx.fillRect(s - 18, 30, 6, 6);
    noise(ctx, s, 0.08);
  });

  const gate = canvasTex(32, (ctx, s) => {
    ctx.fillStyle = "#1a1c1a";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#4a5048";
    ctx.lineWidth = 2;
    for (let x = 4; x < s; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    ctx.strokeStyle = "#6a7068";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(s, 10);
    ctx.moveTo(0, 22);
    ctx.lineTo(s, 22);
    ctx.stroke();
  });

  return { wall, floor, ceil, wood, metal, paper, door, gate };
}

export function makeLabelTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d8c8a8";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#6a3030";
  ctx.fillRect(0, 0, 256, 8);
  ctx.fillRect(0, 56, 256, 8);
  ctx.fillStyle = "#1a1210";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type TexPack = ReturnType<typeof createTextures>;
