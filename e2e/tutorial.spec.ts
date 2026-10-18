import { test, expect, type Page } from "@playwright/test";

async function openTutorial(page: Page) {
  await page.goto(".");
  await page.getByRole("button", { name: /Tutorial guiado/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("tutorial-card")).toBeVisible();
}

const card = (page: Page) => page.getByTestId("tutorial-card");

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test("el menú recomienda el tutorial la primera vez", async ({ page }) => {
  await page.goto(".");
  const boton = page.getByRole("button", { name: /Tutorial guiado/i });
  await expect(boton).toBeVisible();
  await expect(boton).toContainText("Recomendado");
});

test("el tutorial avanza solo al hacer cada acción", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openTutorial(page);

  // 1. Bienvenida: sólo avanza con el botón.
  await expect(card(page)).toHaveAttribute("data-step", "welcome");
  await card(page).getByRole("button", { name: /Continuar/ }).click();

  // 2. Caminar con el teclado avanza al siguiente paso sin pulsar nada más.
  await expect(card(page)).toHaveAttribute("data-step", "move");
  await expect(card(page)).toContainText("W A S D");
  // Se camina en cuadrado hasta que el tutorial lo reconozca. El bucle
  // tolera los FPS bajos del renderizado por software de las pruebas.
  const keys = ["d", "s", "a", "w"];
  for (let i = 0; i < 24; i++) {
    if ((await card(page).getAttribute("data-step")) !== "move") break;
    const key = keys[i % keys.length];
    await page.keyboard.down(key);
    await page.waitForTimeout(500);
    await page.keyboard.up(key);
  }
  await expect(card(page)).toHaveAttribute("data-step", "select", { timeout: 8000 });

  // 3. Elegir el pegamento en la barra avanza el paso.
  await page.getByRole("option", { name: /Pegamento felino/ }).click();
  await expect(card(page)).toHaveAttribute("data-step", "floor", { timeout: 8000 });
});

test("se puede saltar hasta el final y queda marcado como completado", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openTutorial(page);
  await card(page).getByRole("button", { name: /Continuar/ }).click();

  // Salta todos los pasos de acción.
  for (let i = 0; i < 12; i++) {
    const saltar = card(page).getByRole("button", { name: "Saltar este paso del tutorial" });
    if (!(await saltar.isVisible().catch(() => false))) break;
    await saltar.click();
  }
  await expect(card(page)).toHaveAttribute("data-step", "done");
  await expect(card(page).getByRole("button", { name: /Jugar Supervivencia/ })).toBeVisible();

  // Volver al menú: el tutorial figura como completado, también tras recargar.
  await card(page).getByRole("button", { name: /Menú/ }).click();
  await expect(page.getByRole("button", { name: /Tutorial guiado/i })).toContainText("Completado");
  await page.reload();
  await expect(page.getByRole("button", { name: /Tutorial guiado/i })).toContainText("Completado");
});

test("al terminar, «Jugar Supervivencia» abre la partida real", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openTutorial(page);
  await card(page).getByRole("button", { name: /Continuar/ }).click();
  for (let i = 0; i < 12; i++) {
    const saltar = card(page).getByRole("button", { name: "Saltar este paso del tutorial" });
    if (!(await saltar.isVisible().catch(() => false))) break;
    await saltar.click();
  }
  await card(page).getByRole("button", { name: /Jugar Supervivencia/ }).click();
  await expect(page.getByRole("button", { name: /Preparar habitacion/i })).toBeVisible();
});

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 844, height: 390 },
]) {
  test(`móvil ${size.width}x${size.height}: la tarjeta no tapa controles ni escena`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: size, isMobile: size.width < size.height, hasTouch: true });
    const page = await context.newPage();
    try {
      await openTutorial(page);
      await card(page).getByRole("button", { name: /Continuar/ }).click();
      await expect(card(page)).toHaveAttribute("data-step", "move");
      // En táctil el texto habla del joystick, no del teclado.
      await expect(card(page)).toContainText(/joystick/i);

      const tarjeta = (await card(page).boundingBox())!;
      const canvas = (await page.locator("canvas").boundingBox())!;
      const joy = (await page.getByLabel("Joystick virtual para mover al ratón inventor").boundingBox())!;
      const disparar = (await page.getByLabel("Activar la trampa manual más cercana").boundingBox())!;
      const barra = await page.getByRole("listbox").boundingBox();

      expect(overlaps(tarjeta, canvas), "la tarjeta tapa la escena").toBe(false);
      expect(overlaps(tarjeta, joy), "la tarjeta tapa el joystick").toBe(false);
      expect(overlaps(tarjeta, disparar), "la tarjeta tapa el botón de disparar").toBe(false);
      if (barra) expect(overlaps(tarjeta, barra), "la tarjeta tapa la barra").toBe(false);
      expect(tarjeta.x + tarjeta.width).toBeLessThanOrEqual(size.width + 1);
      expect(tarjeta.y + tarjeta.height).toBeLessThanOrEqual(size.height + 1);
      // La escena sigue siendo jugable aunque la tarjeta ocupe su hueco.
      expect(canvas.height).toBeGreaterThan(size.height < 500 ? 180 : 200);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(size.height + 2);
    } finally {
      await context.close();
    }
  });
}
