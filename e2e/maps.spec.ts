import { test, expect, type Page } from "@playwright/test";
import { MAP_LIST } from "../src/game/maps";

/** Abre el menú y elige una sala por su nombre. */
async function pickMap(page: Page, name: string) {
  await page.goto(".");
  await page.getByRole("radio", { name: new RegExp(name, "i") }).click();
  await expect(page.getByRole("radio", { name: new RegExp(name, "i") })).toHaveAttribute("aria-checked", "true");
}

test("el menú ofrece todas las salas con su plano", async ({ page }) => {
  await page.goto(".");
  const radios = page.getByRole("radiogroup", { name: /Sala donde jugar/i }).getByRole("radio");
  await expect(radios).toHaveCount(MAP_LIST.length);
  for (const m of MAP_LIST) {
    await expect(page.getByRole("img", { name: `Plano de ${m.name}` })).toBeVisible();
  }
});

for (const m of MAP_LIST) {
  test(`la sala "${m.name}" se carga y permite jugar`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 820 });
    await pickMap(page, m.name);

    // El briefing muestra la sala elegida y su pista propia.
    await page.getByRole("button", { name: /Laboratorio/i }).first().click();
    await expect(page.getByText(m.name, { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await page.waitForTimeout(1200);

    // Se puede colocar una trampa en la casilla apuntada.
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    let colocada = false;
    for (const [rx, ry] of [[0.5, 0.58], [0.42, 0.52], [0.6, 0.62], [0.36, 0.46], [0.66, 0.5]]) {
      await canvas.click({ position: { x: box!.width * rx, y: box!.height * ry } });
      if ((await page.getByTestId("game-screen").getAttribute("data-traps-live")) !== "0") {
        colocada = true;
        break;
      }
    }
    expect(colocada, `${m.name}: no se pudo colocar ninguna trampa`).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("la sala elegida se recuerda tras recargar", async ({ page }) => {
  const otra = MAP_LIST[2];
  await pickMap(page, otra.name);
  await page.reload();
  await expect(page.getByRole("radio", { name: new RegExp(otra.name, "i") })).toHaveAttribute("aria-checked", "true");
});

test("cambiar de sala cambia el recorrido de los gatos", async ({ page }) => {
  // Abre dos salas seguidas: con renderizado por software supera los 40 s por defecto.
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 820 });

  // Dos salas con guarida en sitios distintos deben dibujar escenas distintas.
  const capturas: string[] = [];
  for (const id of ["salon", "bodega"] as const) {
    const m = MAP_LIST.find((x) => x.id === id)!;
    await pickMap(page, m.name);
    await page.getByRole("button", { name: /Laboratorio/i }).first().click();
    await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
    await page.waitForTimeout(1500);
    capturas.push((await page.locator("canvas").screenshot()).toString("base64").slice(0, 4000));
  }
  expect(capturas[0]).not.toBe(capturas[1]);
});
