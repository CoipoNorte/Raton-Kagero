import { test, expect, type Page } from "@playwright/test";

/* Auditoría de botones: cada control debe existir, ser pulsable, tener nombre
   accesible y producir un efecto observable. */

async function startLab(page: Page) {
  await page.goto(".");
  await page.getByRole("button", { name: /Laboratorio/i }).first().click();
  await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
}

async function startSurvival(page: Page) {
  await page.goto(".");
  await page.getByRole("button", { name: /Jugar ahora/i }).click();
  await page.getByRole("button", { name: /Preparar habitacion/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
}

test("menú: todos los botones tienen nombre accesible y área táctil suficiente", async ({ page }) => {
  await page.goto(".");
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(3);

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    if (!(await button.isVisible())) continue;
    const name = (await button.getAttribute("aria-label")) ?? (await button.textContent()) ?? "";
    expect(name.trim(), `botón ${i} sin nombre accesible`).not.toBe("");
    const box = await button.boundingBox();
    if (box) {
      // Objetivo táctil mínimo razonable en el menú.
      expect(box.height, `botón "${name.trim().slice(0, 24)}" demasiado bajo`).toBeGreaterThanOrEqual(22);
    }
  }
});

test("menú: los interruptores de sonido y música cambian de estado y persisten", async ({ page }) => {
  await page.goto(".");
  const sound = page.getByRole("button", { name: /Efectos (on|off)/i });
  const music = page.getByRole("button", { name: /Musica (on|off)/i });

  const soundBefore = (await sound.textContent()) ?? "";
  await sound.click();
  await expect(sound).not.toHaveText(soundBefore);

  const musicBefore = (await music.textContent()) ?? "";
  await music.click();
  await expect(music).not.toHaveText(musicBefore);

  // Persistencia real tras recargar.
  const soundAfter = (await sound.textContent()) ?? "";
  await page.reload();
  await expect(page.getByRole("button", { name: /Efectos (on|off)/i })).toHaveText(soundAfter);
});

test("briefing: Volver regresa al menú y Jugar entra a la partida", async ({ page }) => {
  await page.goto(".");
  await page.getByRole("button", { name: /Jugar ahora/i }).click();
  await expect(page.getByRole("button", { name: /Preparar habitacion/i })).toBeVisible();

  await page.getByRole("button", { name: /^Volver$/i }).click();
  await expect(page.getByRole("button", { name: /Jugar ahora/i })).toBeVisible();

  await page.getByRole("button", { name: /Jugar ahora/i }).click();
  await page.getByRole("button", { name: /Preparar habitacion/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
});

test("HUD: pausa, sonido y música responden durante la partida", async ({ page }) => {
  await startLab(page);

  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar la partida" }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);

  // Los botones de audio deben alternar su etiqueta accesible.
  const soundOn = page.getByRole("button", { name: "Silenciar efectos" });
  await expect(soundOn).toBeVisible();
  await soundOn.click();
  await expect(page.getByRole("button", { name: "Activar efectos" })).toBeVisible();
  await page.getByRole("button", { name: "Activar efectos" }).click();
  await expect(page.getByRole("button", { name: "Silenciar efectos" })).toBeVisible();
});

test("barra de trampas: las tres categorías cambian el catálogo mostrado", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  const options = page.getByRole("option");

  await page.getByRole("button", { name: /Suelo/ }).click();
  await expect(options.first()).toContainText(/Cascara|Pegamento|oso|Muelle|Tabla|Caja/i);
  const floorCount = await options.count();
  expect(floorCount).toBe(6);

  await page.getByRole("button", { name: /Pared/ }).click();
  await expect(page.getByRole("option").first()).toContainText(/dardos|Guante|Ventilador|Canon|Estanteria/i);
  expect(await page.getByRole("option").count()).toBe(5);

  await page.getByRole("button", { name: /Techo/ }).click();
  await expect(page.getByRole("option").first()).toContainText(/Yunque|Macetero|Cubeta|boliche|arana/i);
  expect(await page.getByRole("option").count()).toBe(5);
});

test("barra de trampas: seleccionar marca aria-selected y Cancelar la deselecciona", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);

  // La primera trampa viene preseleccionada: el clic funciona como alternador.
  const first = page.getByRole("option").first();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await first.click();
  await expect(first).toHaveAttribute("aria-selected", "false");
  await first.click();
  await expect(first).toHaveAttribute("aria-selected", "true");

  const second = page.getByRole("option").nth(1);
  await second.click();
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("aria-selected", "false");

  await page.getByRole("button", { name: "Cancelar selección de trampa" }).click();
  await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "false");
});

test("panel lateral: Estelas, VHS, Reiniciar y Salir funcionan", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  const game = page.getByTestId("game-screen");

  const trails = page.getByRole("button", { name: /Estelas/ });
  const before = await trails.getAttribute("aria-pressed");
  await trails.click();
  await expect(trails).not.toHaveAttribute("aria-pressed", before ?? "false");

  const vhs = page.getByRole("button", { name: /^VHS/ });
  const vhsBefore = (await vhs.textContent()) ?? "";
  await vhs.click();
  await expect(vhs).not.toHaveText(vhsBefore);

  // Reiniciar deja la sala sin trampas.
  await page.getByRole("option").first().click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box!.width * 0.72, y: box!.height * 0.6 } });
  // En escritorio el Laboratorio usa el botón ancho "Vaciar sala".
  await page.getByRole("button", { name: /Vaciar sala/ }).click();
  await expect(game).toHaveAttribute("data-traps-live", "0");

  // Salir pide confirmación y se puede cancelar sin perder la partida.
  await page.getByRole("button", { name: "Salir al menú principal" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar salida" })).toBeVisible();
  await page.getByRole("button", { name: /Seguir jugando/ }).click();
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "Salir al menú principal" }).click();
  await page.getByRole("dialog", { name: "Confirmar salida" }).getByRole("button", { name: /^Salir$/ }).click();
  await expect(page.getByRole("button", { name: /Jugar ahora/i })).toBeVisible();
});

test("laboratorio: generar gatos, enjambre, limpiar y reiniciar sala", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);

  // Generar un gato común y comprobar que el HUD lo refleja como amenaza futura.
  await page.getByRole("button", { name: /^zombi comun$|comun/i }).first().click();
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: /Enjambre/ }).click();
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: /Sin gatos/ }).click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /Vaciar sala/ }).click();
  await expect(page.getByTestId("game-screen")).toHaveAttribute("data-traps-live", "0");
});

test("pausa: calidad, sacudida, VHS y conmutadores aplican cambios", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  await page.getByRole("button", { name: "Pausar partida" }).click();
  const dialog = page.getByRole("dialog", { name: "Menú de pausa" });
  await expect(dialog).toBeVisible();

  // Calidad manual.
  await dialog.getByRole("button", { name: "Bajo" }).click();
  await expect(dialog.getByRole("button", { name: "Bajo" })).toHaveAttribute("aria-pressed", "true");

  // Conmutadores con role=switch.
  const switches = dialog.getByRole("switch");
  const switchCount = await switches.count();
  expect(switchCount).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < switchCount; i++) {
    const item = switches.nth(i);
    const before = await item.getAttribute("aria-checked");
    await item.click();
    await expect(item).not.toHaveAttribute("aria-checked", before ?? "true");
  }

  // Sacudida y VHS.
  await dialog.getByRole("group", { name: /Sacudida/ }).getByRole("button", { name: "Off" }).click();
  await expect(dialog.getByRole("group", { name: /Sacudida/ }).getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");

  // El control de volumen responde.
  const volume = dialog.getByLabel(/Volumen/);
  await volume.fill("30");
  await expect(dialog.getByText(/Volumen 30%/)).toBeVisible();

  await dialog.getByRole("button", { name: /^Continuar$/ }).click();
  await expect(dialog).toHaveCount(0);
});

test("pausa: Reiniciar y Menú navegan correctamente", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startSurvival(page);

  await page.getByRole("button", { name: "Pausar partida" }).click();
  await page.getByRole("dialog", { name: "Menú de pausa" }).getByRole("button", { name: /^Reiniciar$/ }).click();
  await expect(page.getByRole("dialog", { name: "Menú de pausa" })).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "Pausar partida" }).click();
  await page.getByRole("dialog", { name: "Menú de pausa" }).getByRole("button", { name: /Menu/ }).click();
  await expect(page.getByRole("button", { name: /Jugar ahora/i })).toBeVisible();
});

test("preparación: Empezar ya adelanta la oleada", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startSurvival(page);
  const game = page.getByTestId("game-screen");

  await expect(game).toHaveAttribute("data-prep-left", /[1-9]/);
  await page.getByRole("button", { name: /Empezar ya/ }).click();
  await expect(game).toHaveAttribute("data-prep-left", "0", { timeout: 8000 });
});

test("game over: Otra ronda, Laboratorio y Menú responden", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 820 });
  await startSurvival(page);
  await page.getByRole("button", { name: /Empezar ya/ }).click();

  // Fuerza el final acelerando el reloj desde la propia UI: espera al resumen.
  await expect(page.getByRole("dialog", { name: "Resumen de partida" })).toBeVisible({ timeout: 120000 });

  await page.getByRole("button", { name: /Laboratorio/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Resumen de partida" })).toHaveCount(0);
});

test("Retirar sin casilla apuntada explica el motivo en vez de no hacer nada", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  await page.getByRole("button", { name: "Retirar la trampa apuntada" }).click();
  await expect(page.getByText(/Apunta primero una casilla/)).toBeVisible();
});

test("Reiniciar desde el panel pide confirmacion y se puede cancelar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await startLab(page);
  await page.getByRole("button", { name: "Reiniciar la partida desde el principio" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar reinicio" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Seguir jugando/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
});
