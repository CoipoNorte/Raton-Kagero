import { test, expect, type Page } from "@playwright/test";

/* El juego debe ser operable sólo con teclado: sin trampas de foco,
   sin acciones duplicadas y con Escape cerrando lo que abre. */

async function startLab(page: Page) {
  await page.goto(".");
  await page.getByRole("button", { name: /Laboratorio/i }).first().click();
  await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
}

test("Tab recorre los controles durante la partida sin quedar atrapado", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);

  const visited = new Set<string>();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return `${el.tagName}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 28)}`;
    });
    if (info) visited.add(info);
  }

  // Si Tab estuviera bloqueado, no habría foco alguno o siempre el mismo.
  expect(visited.size).toBeGreaterThan(3);
});

test("Enter sobre un botón enfocado no dispara además el atajo global", async ({ page }) => {
  await page.goto(".");
  // Enfoca el botón del Laboratorio y actívalo con teclado.
  const lab = page.getByRole("button", { name: /Laboratorio/i }).first();
  await lab.focus();
  await page.keyboard.press("Enter");

  // Debe abrir el briefing del Laboratorio, no el de Supervivencia.
  await expect(page.getByRole("button", { name: /Entrar al laboratorio/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Preparar habitacion/i })).toHaveCount(0);
});

test("Escape cierra la confirmación sin abrir la pausa", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);

  await page.getByRole("button", { name: "Salir al menú principal" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar salida" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Confirmar salida" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
});

test("atajos 1/2/3 cambian de categoría y P pausa", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);

  await page.keyboard.press("2");
  await expect(page.getByRole("option").first()).toContainText(/dardos|Guante|Ventilador|Canon|Estanteria/i);
  await page.keyboard.press("3");
  await expect(page.getByRole("option").first()).toContainText(/Yunque|Macetero|Cubeta|boliche|arana/i);
  await page.keyboard.press("1");
  await expect(page.getByRole("option").first()).toContainText(/Cascara|Pegamento|oso|Muelle|Tabla|Caja/i);

  await page.keyboard.press("p");
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
});
