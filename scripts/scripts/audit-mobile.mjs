import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"] });

/** Mide tipografía y objetivos táctiles de todos los textos y botones visibles. */
async function audit(page, label) {
  const data = await page.evaluate(() => {
    const out = { texts: [], buttons: [], overlaps: [] };

    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      return r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
    };

    // Textos con fuente demasiado pequeña
    for (const el of document.querySelectorAll("body *")) {
      if (!el.textContent?.trim()) continue;
      if (el.children.length > 0) continue;
      if (!isVisible(el)) continue;
      const s = getComputedStyle(el);
      const fs = parseFloat(s.fontSize);
      if (fs > 0 && fs < 10) out.texts.push({ text: el.textContent.trim().slice(0, 34), px: fs });
    }

    // Botones: nombre accesible, área táctil y solapes entre ellos
    const btns = [];
    for (const el of document.querySelectorAll("button, [role='option'], [role='switch']")) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 26);
      btns.push({ name, x: r.x, y: r.y, w: r.width, h: r.height, r });
    }
    for (const b of btns) {
      if (b.w < 30 || b.h < 30) out.buttons.push({ name: b.name, w: Math.round(b.w), h: Math.round(b.h) });
      for (const o of btns) {
        if (o === b || o.name <= b.name) continue;
        const overlap = b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y;
        if (overlap) out.overlaps.push(`${b.name} ↔ ${o.name}`);
      }
    }

    // Texto truncado con elipsis
    out.truncated = [...document.querySelectorAll("body *")]
      .filter((el) => !el.children.length && el.textContent?.trim() && isVisible(el))
      .filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflow === "hidden" || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 2;
      })
      .map((el) => el.textContent.trim().slice(0, 30));

    out.docOverflow = {
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
      vw: innerWidth,
      vh: innerHeight,
    };
    return out;
  });

  console.log(`\n===== ${label} =====`);
  console.log("document overflow:", JSON.stringify(data.docOverflow), "overflow:",
    data.docOverflow.w > data.docOverflow.vw + 2 || data.docOverflow.h > data.docOverflow.vh + 2);
  console.log("texto < 10px:", data.texts.length, JSON.stringify(data.texts.slice(0, 6)));
  console.log("botones < 30px:", data.buttons.length, JSON.stringify(data.buttons.slice(0, 8)));
  console.log("solapes entre botones:", data.overlaps.length, JSON.stringify([...new Set(data.overlaps)].slice(0, 6)));
  console.log("texto truncado:", data.truncated.length, JSON.stringify(data.truncated.slice(0, 6)));
}

for (const [w, h, label, kind] of [
  [390, 844, "MÓVIL VERTICAL (390x844)", "game"],
  [844, 390, "MÓVIL APAISADO (844x390)", "game"],
  [360, 640, "MÓVIL PEQUEÑO (360x640)", "game"],
  [390, 844, "MENÚ (390x844)", "menu"],
  [390, 844, "TUTORIAL VERTICAL (390x844)", "tutorial"],
  [360, 640, "TUTORIAL PEQUEÑO (360x640)", "tutorial"],
  [844, 390, "TUTORIAL APAISADO (844x390)", "tutorial"],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto("http://127.0.0.1:5173/Raton-Kagero/");
  if (kind === "game") {
    await page.getByRole("button", { name: /Laboratorio/i }).first().click();
    await page.getByRole("button", { name: /Entrar al laboratorio/i }).click();
  }
  if (kind === "tutorial") {
    await page.getByRole("button", { name: /Tutorial guiado/i }).click();
    await page.getByTestId("tutorial-card").getByRole("button", { name: /Continuar/ }).click();
  }
  await page.waitForTimeout(1500);
  await audit(page, `${label}`);
  await page.close();
}
await browser.close();
