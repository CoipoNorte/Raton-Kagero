import { test, expect, type Page } from "@playwright/test";
import { GRID_W } from "../src/game/constants";
import { DEFAULT_MAP_ID, getMap } from "../src/game/maps";

const sizes = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 820 },
  { width: 1600, height: 900 },
];

async function startLab(page: Page) {
  await page.goto(".");
  await page.getByRole("button", { name: /Laboratorio/i }).first().click();
  await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
}

async function findFreeCell(page: Page) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Canvas no disponible");
  const candidates = [
    [0.74, 0.62], [0.62, 0.62], [0.78, 0.55], [0.7, 0.48],
    [0.5, 0.7], [0.38, 0.53], [0.55, 0.52], [0.45, 0.46],
    [0.83, 0.67], [0.6, 0.73], [0.33, 0.42], [0.52, 0.36],
  ];
  const seen: string[] = [];
  for (const [rx, ry] of candidates) {
    await page.mouse.move(box.x + box.width * rx, box.y + box.height * ry);
    await page.waitForTimeout(120);
    const note = await page.getByRole("status").textContent();
    seen.push(`${rx},${ry}: ${note}`);
    if (note?.includes("Colocar: Casilla libre") || note?.includes("Colocar: Carril libre")) {
      return { x: box.width * rx, y: box.height * ry };
    }
  }
  throw new Error(`Ninguna casilla libre en el viewport. ${seen.join(" | ")}`);
}

test("el menú y el Canvas montan sin errores de navegador", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startLab(page);
  await page.waitForTimeout(1100);
  expect(errors).toEqual([]);
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(180);

  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar la partida" }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("permite colocar trampas de suelo, pared y techo sobre el Canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  const canvas = page.locator("canvas");
  await canvas.click({ position: await findFreeCell(page) });
  await expect(page.getByTestId("game-screen")).toHaveAttribute("data-traps-live", "1");

  await page.getByRole("button", { name: /Pared/ }).click();
  await canvas.click({ position: await findFreeCell(page) });
  await expect(page.getByTestId("game-screen")).toHaveAttribute("data-traps-live", "2");

  await page.getByRole("button", { name: /Techo/ }).click();
  await canvas.click({ position: await findFreeCell(page) });
  await expect(page.getByTestId("game-screen")).toHaveAttribute("data-traps-live", "3");
});

test.describe("móvil táctil", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

  test("dos toques confirman y no gasta queso en Laboratorio", async ({ page }) => {
    await startLab(page);
    const canvas = page.locator("canvas");
    // En táctil no hay hover: se busca la casilla tocando una vez (apunta sin colocar).
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas no disponible");
    const candidates = [
      [0.74, 0.5], [0.62, 0.5], [0.7, 0.42], [0.5, 0.6],
      [0.38, 0.45], [0.55, 0.44], [0.8, 0.55], [0.45, 0.38],
    ];
    let p: { x: number; y: number } | null = null;
    // Cada candidato se prueba con el flujo real de dos toques: el primero
    // apunta (pending) y el segundo confirma. Si la casilla es inválida, la
    // colocación falla, el pending se consume y se prueba la siguiente.
    let sawConfirmHint = false;
    for (const [rx, ry] of candidates) {
      const pos = { x: box.width * rx, y: box.height * ry };
      await canvas.tap({ position: pos });
      if (await page.getByText("Toca de nuevo para confirmar").isVisible().catch(() => false)) {
        sawConfirmHint = true;
      }
      await canvas.tap({ position: pos });
      const live = await page.getByTestId("game-screen").getAttribute("data-traps-live");
      if (live === "1") break;
    }
    expect(sawConfirmHint).toBe(true);
    await expect(page.getByTestId("game-screen")).toHaveAttribute("data-traps-live", "1");
    await expect(page.getByTestId("game-screen")).toHaveAttribute("data-cheese", "65");
  });
});

test("mando: cursor con cruceta y colocación con botón A", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  const game = page.getByTestId("game-screen");

  // Mando virtual: se sustituye getGamepads por un stub controlable.
  await page.evaluate(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const pad = { id: "Virtual Test Pad", connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad], configurable: true });
  });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  await expect(page.getByText(/Mando conectado/)).toBeVisible({ timeout: 8000 });

  // Mantiene pulsado hasta que se observa el efecto: robusto aunque el
  // renderizado por software deje huecos largos entre frames.
  const holdUntil = async (index: number, effect: () => Promise<boolean>) => {
    await page.evaluate((i) => {
      const pad = (window as unknown as { __pad: { buttons: Array<{ pressed: boolean; value: number }> } }).__pad;
      pad.buttons[i].pressed = true;
      pad.buttons[i].value = 1;
    }, index);
    try {
      await expect.poll(effect, { timeout: 9000 }).toBe(true);
    } finally {
      await page.evaluate((i) => {
        const pad = (window as unknown as { __pad: { buttons: Array<{ pressed: boolean; value: number }> } }).__pad;
        pad.buttons[i].pressed = false;
        pad.buttons[i].value = 0;
      }, index);
    }
    await page.waitForTimeout(250);
  };
  const padAttr = () => game.getAttribute("data-pad").then((v) => v ?? "");

  // El cursor nace sobre la quesera; un paso a la derecha lo deja en la
  // casilla contigua, que está libre. El índice se calcula para no depender
  // del tamaño concreto de la rejilla.
  const lair = getMap(DEFAULT_MAP_ID).lair;
  const destino = `floor:back:${lair.gz * GRID_W + lair.gx + 1}`;
  await holdUntil(15, async () => (await padAttr()) === destino);
  await holdUntil(0, async () => (await game.getAttribute("data-traps-live")) === "1");

  // Start abre la pausa y Escape la cierra (el mando convive con el teclado).
  await holdUntil(9, async () => page.getByRole("dialog", { name: "Menú de pausa" }).isVisible());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
});

test("Supervivencia: pausa congela la preparación y Escape reanuda", async ({ page }) => {
  await page.goto(".");
  await page.getByRole("button", { name: /Jugar ahora/i }).click();
  await page.getByRole("button", { name: /Preparar habitacion/i }).click();
  const game = page.getByTestId("game-screen");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toBeVisible();
  const frozen = await game.getAttribute("data-prep-left");
  await page.waitForTimeout(1300);
  expect(await game.getAttribute("data-prep-left")).toBe(frozen);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
  await expect.poll(async () => Number(await game.getAttribute("data-prep-left"))).toBeLessThan(Number(frozen));
});

for (const size of sizes) {
  test(`viewport ${size.width}x${size.height}: Canvas útil y controles visibles`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(size);
    await startLab(page);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(size.width < 900 ? 210 : 380);
    expect(box!.height).toBeGreaterThan(size.height < 500 ? 180 : 260);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 2);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 2);
    const pause = page.getByRole("button", { name: "Pausar partida" });
    await expect(pause).toBeVisible();
    const pauseBox = await pause.boundingBox();
    expect(pauseBox!.x + pauseBox!.width).toBeLessThanOrEqual(size.width + 2);
    expect(pauseBox!.y + pauseBox!.height).toBeLessThanOrEqual(size.height + 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width + 2);
  });
}

/* Comprobación geométrica: ningún control táctil puede solaparse con el HUD,
   con la barra de trampas ni con el otro grupo de botones, y todo debe caber
   dentro del viewport. */
const touchSizes = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const size of touchSizes) {
  test(`táctil ${size.width}x${size.height}: sin solapes ni desbordes`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: size.width < size.height,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    try {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await startLab(page);
      await page.waitForTimeout(400);

      const joy = await page.getByLabel("Joystick virtual para mover al ratón inventor").boundingBox();
      const fire = await page.getByLabel("Activar la trampa manual más cercana").boundingBox();
      const trash = await page.getByLabel("Retirar trampa bajo el cursor").boundingBox();
      const pause = await page.getByRole("button", { name: "Pausar partida" }).boundingBox();
      expect(joy).not.toBeNull();
      expect(fire).not.toBeNull();
      expect(trash).not.toBeNull();
      expect(pause).not.toBeNull();

      // El joystick no puede pisar los botones de acción ni el HUD.
      expect(overlaps(joy!, fire!)).toBe(false);
      expect(overlaps(joy!, trash!)).toBe(false);
      expect(overlaps(joy!, pause!)).toBe(false);
      // Los botones de acción no se pisan entre sí.
      expect(overlaps(fire!, trash!)).toBe(false);
      // Todo dentro de pantalla.
      for (const b of [joy!, fire!, trash!, pause!]) {
        expect(b.x).toBeGreaterThanOrEqual(-1);
        expect(b.y).toBeGreaterThanOrEqual(-1);
        expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
        expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
      }
      // El joystick y los botones no invaden la barra de trampas.
      const bar = await page.getByRole("listbox").boundingBox();
      if (bar) {
        expect(overlaps(joy!, bar)).toBe(false);
        expect(overlaps(fire!, bar)).toBe(false);
        expect(overlaps(trash!, bar)).toBe(false);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width + 2);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(size.height + 2);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}