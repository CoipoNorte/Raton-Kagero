#!/usr/bin/env node
/**
 * Preparador de despliegue para Raton-Kagero (GitHub Pages).
 *
 *   node scripts/deploy-prepare.cjs package   -> normaliza package.json
 *   node scripts/deploy-prepare.cjs vite      -> normaliza vite.config.ts
 *   node scripts/deploy-prepare.cjs check     -> solo verifica, no escribe
 *   node scripts/deploy-prepare.cjs all       -> package + vite + verificacion
 *
 * Reglas:
 *   - CommonJS puro (.cjs), sin dependencias externas: solo fs y path.
 *   - Acepta una carpeta raiz opcional para poder probarlo sin tocar el repo.
 *   - Es idempotente: volver a ejecutarlo no cambia nada si ya esta correcto.
 *   - Verifica el resultado despues de escribir y sale con process.exit(1)
 *     y un mensaje claro si algo no cuadra.
 *   - No usa CMD, echo ni eval: seguro frente a `!`, `&`, `|`, `<`, `>` y CRLF.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO = "Raton-Kagero";
const BASE = `/${REPO}/`;
const SITE = `https://coiponorte.github.io/${REPO}/`;

const REQUIRED_DEPS = ["three", "@react-three/fiber", "@react-three/drei", "framer-motion", "lucide-react", "react", "react-dom"];
const REQUIRED_DEV_DEPS = ["gh-pages"];

function fail(message) {
  console.error(`\n[deploy-prepare] ERROR: ${message}\n`);
  process.exit(1);
}

function info(message) {
  console.log(`[deploy-prepare] ${message}`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`no se pudo leer ${file}: ${error.message}`);
    return null;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    fail(`no se pudo leer ${file}: ${error.message}`);
    return "";
  }
}

function writeText(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

/* ------------------------------ package.json ------------------------------ */

function normalizePackage(root) {
  const file = path.join(root, "package.json");
  const pkg = readJson(file);
  if (!pkg || typeof pkg !== "object") fail("package.json vacio o invalido");
  const before = JSON.stringify(pkg);

  pkg.name = "raton-kagero";
  pkg.private = true;
  pkg.version = typeof pkg.version === "string" ? pkg.version : "1.0.0";
  pkg.type = "module";
  pkg.homepage = SITE;

  pkg.scripts = typeof pkg.scripts === "object" && pkg.scripts !== null ? pkg.scripts : {};
  pkg.scripts.dev = "vite";
  if (!pkg.scripts.build || !String(pkg.scripts.build).includes("vite build")) pkg.scripts.build = "vite build";
  pkg.scripts.preview = `vite preview --base ${BASE}`;
  pkg.scripts.check = "tsc --noEmit";
  pkg.scripts.test = "vitest run";
  pkg.scripts.predeploy = "npm run check && npm run build";
  pkg.scripts.deploy = "gh-pages -d dist -t true";

  pkg.dependencies = typeof pkg.dependencies === "object" && pkg.dependencies !== null ? pkg.dependencies : {};
  for (const name of REQUIRED_DEPS) {
    if (!pkg.dependencies[name]) fail(`falta la dependencia "${name}". Ejecuta: npm install ${name}`);
  }

  pkg.devDependencies = typeof pkg.devDependencies === "object" && pkg.devDependencies !== null ? pkg.devDependencies : {};
  for (const name of REQUIRED_DEV_DEPS) {
    if (!pkg.devDependencies[name]) fail(`falta la devDependency "${name}". Ejecuta: npm install -D ${name}`);
  }

  if (JSON.stringify(pkg) === before) {
    info("package.json ya estaba correcto (sin cambios)");
    return;
  }
  writeJson(file, pkg);
  info("package.json actualizado: name, private, homepage y scripts de despliegue");
}

function verifyPackage(root) {
  const pkg = readJson(path.join(root, "package.json"));
  const problems = [];
  if (pkg.name !== "raton-kagero") problems.push(`name esperado "raton-kagero", encontrado "${pkg.name}"`);
  if (pkg.private !== true) problems.push("private debe ser true");
  if (pkg.homepage !== SITE) problems.push(`homepage esperada ${SITE}`);
  const predeploy = String(pkg.scripts.predeploy || "");
  if (!/npm run build/.test(predeploy) || !/npm run check/.test(predeploy)) {
    problems.push("predeploy debe ejecutar npm run check y npm run build");
  }
  if (!String(pkg.scripts.deploy || "").startsWith("gh-pages -d dist")) problems.push("deploy debe empezar por gh-pages -d dist");
  if (!pkg.scripts.build || !String(pkg.scripts.build).includes("vite build")) problems.push("build debe ejecutar vite build");
  if (!String(pkg.scripts.check || "").includes("tsc")) problems.push("check debe ejecutar tsc --noEmit");
  for (const name of REQUIRED_DEPS) if (!pkg.dependencies[name]) problems.push(`falta dependency ${name}`);
  for (const name of REQUIRED_DEV_DEPS) if (!pkg.devDependencies[name]) problems.push(`falta devDependency ${name}`);
  if (problems.length > 0) fail(`package.json verificacion fallida:\n  - ${problems.join("\n  - ")}`);
  info("package.json verificado");
}

/* ------------------------------ vite.config.ts ---------------------------- */

const VITE_TEMPLATE = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Base exacta para GitHub Pages: https://coiponorte.github.io/Raton-Kagero/
export default defineConfig({
  base: "${BASE}",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
  server: {
    host: true,
  },
});
`;

function normalizeVite(root) {
  const file = path.join(root, "vite.config.ts");
  if (!fs.existsSync(file)) {
    writeText(file, VITE_TEMPLATE);
    info("vite.config.ts creado con base " + BASE);
    return;
  }
  const before = readText(file);
  let next = before;

  if (!/base\s*:\s*["'`]\/Raton-Kagero\/["'`]/.test(next)) {
    if (/^\s*base\s*:.*$/m.test(next)) {
      next = next.replace(/^\s*base\s*:.*$/m, `  base: "${BASE}",`);
    } else {
      next = next.replace(/export default defineConfig\(\{/, `export default defineConfig({\n  base: "${BASE}",`);
    }
  }
  if (!/@vitejs\/plugin-react/.test(next)) {
    next = `import react from "@vitejs/plugin-react";\n${next}`;
  }
  if (!/tailwindcss\s*\(\)/.test(next)) {
    if (/plugins\s*:\s*\[/.test(next)) {
      next = next.replace(/plugins\s*:\s*\[/, 'plugins: [\n    tailwindcss(),');
    }
    if (!/tailwindcss\s*\(\)/.test(next)) {
      next = `import tailwindcss from "@tailwindcss/vite";\n${next}`;
    }
  }
  if (!/outDir\s*:\s*["']dist["']/.test(next)) {
    next = next.replace(
      /(plugins\s*:\s*\[[^\]]*\],)/,
      `$1\n  build: {\n    outDir: "dist",\n    emptyOutDir: true,\n  },`,
    );
  }
  if (next === before) {
    info("vite.config.ts ya estaba correcto (sin cambios)");
    return;
  }
  writeText(file, next);
  info("vite.config.ts actualizado (base, plugins y outDir)");
}

function verifyVite(root) {
  const text = readText(path.join(root, "vite.config.ts"));
  if (!/base\s*:\s*["'`]\/Raton-Kagero\/["'`]/.test(text)) fail('vite.config.ts no declara base: "/Raton-Kagero/"');
  if (!/@vitejs\/plugin-react/.test(text)) fail("vite.config.ts no usa @vitejs/plugin-react");
  if (!/outDir\s*:\s*["']dist["']/.test(text)) fail('vite.config.ts no declara outDir: "dist"');
  info("vite.config.ts verificado");
}

/* -------------------------------- .nojekyll ------------------------------- */

function ensureNojekyll(root) {
  const file = path.join(root, "public", ".nojekyll");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    info("public/.nojekyll presente");
    return;
  }
  writeText(file, "# Evita que Jekyll procese el sitio y bloquee _assets/_dotfiles.\n");
  info("public/.nojekyll creado");
}

function verifyNojekyll(root) {
  const file = path.join(root, "public", ".nojekyll");
  if (!fs.existsSync(file)) fail("falta public/.nojekyll (GitHub Pages ignoraria archivos con _)");
  info("public/.nojekyll verificado");
}

/* ------------------------------- verificacion ----------------------------- */

function verifyBuildOutput(root) {
  const dist = path.join(root, "dist");
  if (!fs.existsSync(dist)) {
    info("dist aun no existe (normal antes de la primera compilacion)");
    return;
  }
  const index = path.join(dist, "index.html");
  if (!fs.existsSync(index)) fail("dist existe pero no contiene index.html");
  const html = readText(index);
  if (/src=["']\/Raton-Kagero\//.test(html) === false && /\/assets\//.test(html) === false && /<script/i.test(html) === false) {
    info("index.html compilado (bundle embebido, sin rutas absolutas)");
  }
  if (/src=["']\//.test(html)) fail("index.html referencia assets con rutas absolutas ('/...'): romperia en GitHub Pages");
  const nojekyll = path.join(dist, ".nojekyll");
  if (!fs.existsSync(nojekyll)) fail("dist/.nojekyll no existe: revisa que public/.nojekyll este en el repo");
  info("dist verificado (index.html + .nojekyll)");
}

/* ---------------------------------- main ---------------------------------- */

const TASKS = {
  package: { run: normalizePackage, verify: verifyPackage },
  vite: { run: normalizeVite, verify: verifyVite },
  nojekyll: { run: ensureNojekyll, verify: verifyNojekyll },
  check: { run: null, verify: (root) => {
    verifyPackage(root);
    verifyVite(root);
    verifyNojekyll(root);
    verifyBuildOutput(root);
  } },
  all: { run: (root) => {
    normalizePackage(root);
    normalizeVite(root);
    ensureNojekyll(root);
  }, verify: (root) => {
    verifyPackage(root);
    verifyVite(root);
    verifyNojekyll(root);
    verifyBuildOutput(root);
  } },
};

function main() {
  const argv = process.argv.slice(2);
  const taskName = argv.find((a) => !a.startsWith("--") && !a.includes(path.sep)) || "all";
  const rootArg = argv.find((a) => a.startsWith("--root="));
  const root = rootArg ? path.resolve(process.cwd(), rootArg.slice("--root=".length)) : process.cwd();

  if (!TASKS[taskName]) {
    fail(`tarea desconocida "${taskName}". Usa: ${Object.keys(TASKS).join(", ")}`);
  }
  if (!fs.existsSync(path.join(root, "package.json"))) {
    fail(`no encuentro package.json en ${root}`);
  }

  const task = TASKS[taskName];
  info(`tarea "${taskName}" en ${root}`);
  if (task.run) task.run(root);
  task.verify(root);
  info("listo: el proyecto esta listo para GitHub Pages\n");
}

if (require.main === module) {
  main();
}

module.exports = { normalizePackage, normalizeVite, ensureNojekyll, verifyPackage, verifyVite, verifyNojekyll, verifyBuildOutput, BASE, SITE, REPO };
