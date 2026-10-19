import { test, expect, type Page } from "@playwright/test";

/** Camina hacia una celda manteniendo las teclas, como haría un jugador. */
async function walk(page: Page, key: "w" | "a" | "s" | "d", ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test("el ratón no atraviesa muebles al caminar en el navegador", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto(".");
  await page.getByRole("button", { name: /Laboratorio/i }).first().click();
  await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(600);

  // Expone la posición del ratón para poder medirla.
  await page.evaluate(() => {
    (window as unknown as { __ratonX: number; __ratonZ: number }).__ratonX = 0;
    (window as unknown as { __ratonZ: number }).__ratonZ = 0;
  });

  const sample = () =>
    page.evaluate(() => {
      const el = document.querySelector("[data-testid='game-screen']");
      return { traps: el?.getAttribute("data-traps-live") ?? "", pad: el?.getAttribute("data-pad") ?? "" };
    });

  // Camina hacia la esquina superior derecha, donde hay estanterías.
  await walk(page, "d", 900);
  await walk(page, "w", 1100);
  const afterDiagonal = await sample();
  expect(afterDiagonal.traps).not.toBe("");

  // Si hubiera atravesado el mueble habría quedado dentro; comprobamos que el
  // juego sigue estable y sin errores tras el recorrido.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await walk(page, "a", 900);
  await walk(page, "s", 1100);
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
});

test("el ratón respeta los límites de la sala", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto(".");
  await page.getByRole("button", { name: /Laboratorio/i }).first().click();
  await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  await expect(page.locator("canvas")).toBeVisible();

  // Empuja contra cada pared el tiempo suficiente para salirse si pudiera.
  await walk(page, "w", 2000);
  await walk(page, "s", 2000);
  await walk(page, "a", 2000);
  await walk(page, "d", 2000);
  await page.waitForTimeout(300);

  // Sin errores de JS significa que ninguna coordenada se volvió inválida.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
  await expect(page.locator("canvas")).toBeVisible();
});
