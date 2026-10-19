import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const helperPath = resolve(process.cwd(), "scripts/deploy-prepare.cjs");
const helper = require(helperPath) as {
  parseInvocation: (args: string[], cwd?: string) => { taskName: string; root: string };
  cleanRootArg: (value: string) => string;
};

/** Comando correcto: `-t` es bandera booleana y no admite valor. */
const DEPLOY_OK = "gh-pages -d dist -t";
/** El fallo real visto en Windows: gh-pages recibe "true" como argumento. */
const DEPLOY_BROKEN = "gh-pages -d dist -t true";

let tempRoot = "";
afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = "";
});

function fixtureRoot(deploy = DEPLOY_OK): string {
  tempRoot = mkdtempSync(join(tmpdir(), "Raton Kagero with spaces "));
  mkdirSync(join(tempRoot, "public"), { recursive: true });
  writeFileSync(join(tempRoot, "public/.nojekyll"), "\n");
  writeFileSync(
    join(tempRoot, "package.json"),
    JSON.stringify(
      {
        name: "raton-kagero",
        private: true,
        homepage: "https://coiponorte.github.io/Raton-Kagero/",
        scripts: {
          build: "vite build",
          check: "tsc --noEmit",
          predeploy: "npm run check && npm run build",
          deploy,
        },
        dependencies: Object.fromEntries(
          ["three", "@react-three/fiber", "@react-three/drei", "framer-motion", "lucide-react", "react", "react-dom"].map((name) => [name, "1.0.0"]),
        ),
        devDependencies: { "gh-pages": "1.0.0" },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(tempRoot, "vite.config.ts"),
    `import react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\nexport default { base: "/Raton-Kagero/", plugins: [react(), tailwindcss()], build: { outDir: "dist" } };\n`,
  );
  return tempRoot;
}

describe("argumentos del helper de despliegue en Windows", () => {
  it("elimina la comilla final que CMD deja pegada a una ruta con espacios", () => {
    const root = join(tmpdir(), "Proyecto Raton Kagero");
    expect(helper.cleanRootArg(`${root}"`)).toBe(root);
    expect(helper.cleanRootArg(`"${root}"`)).toBe(root);
  });

  it("acepta --root separado y --root= sin confundirlos con la acción", () => {
    const root = join(tmpdir(), "Mi proyecto Raton");
    expect(helper.parseInvocation(["all", "--root", root], process.cwd())).toEqual({
      taskName: "all",
      root: resolve(root),
    });
    expect(helper.parseInvocation(["check", `--root=${root}"`], process.cwd())).toEqual({
      taskName: "check",
      root: resolve(root),
    });
  });

  it("helper check encuentra package.json con una comilla sobrante en la raíz", () => {
    const root = fixtureRoot();
    const result = spawnSync(process.execPath, [helperPath, "check", `--root=${root}"`], {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("package.json verificado");
    expect(result.stdout).toContain("vite.config.ts verificado");
    expect(result.stdout).toContain("public/.nojekyll verificado");
  });
});

describe("comando de publicacion gh-pages", () => {
  const run = (task: string, root: string) =>
    spawnSync(process.execPath, [helperPath, task, "--root", root], { encoding: "utf8", cwd: process.cwd() });

  it("rechaza pasar un valor a la bandera -t (regresión de Windows)", () => {
    const root = fixtureRoot(DEPLOY_BROKEN);
    const result = run("check", root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("too many arguments");
  });

  it("la tarea package corrige un deploy roto y lo deja verificable", () => {
    const root = fixtureRoot(DEPLOY_BROKEN);
    expect(run("package", root).status).toBe(0);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: { deploy: string } };
    expect(pkg.scripts.deploy).toBe(DEPLOY_OK);
    expect(run("check", root).status).toBe(0);
  });

  it("conserva -t para que dist/.nojekyll llegue a GitHub Pages", () => {
    const root = fixtureRoot();
    expect(run("check", root).status).toBe(0);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: { deploy: string } };
    expect(pkg.scripts.deploy).toBe(DEPLOY_OK);
    expect(pkg.scripts.deploy).toMatch(/(^|\s)-t$/);
  });

  it("el package.json y el deploy.bat del proyecto no repiten el fallo", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.deploy).toBe(DEPLOY_OK);

    const bat = readFileSync(resolve(process.cwd(), "deploy.bat"), "utf8");
    // Ninguna invocación de gh-pages en el BAT puede llevar un valor tras -t.
    const calls = bat.match(/gh-pages[^\r\n]*/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).not.toMatch(/-t\s+\S/);
    // El BAT ya no pasa --root, que fue el origen del error de la comilla.
    expect(bat).not.toContain("--root=");
    // Comprueba Git y el remoto antes de intentar publicar, con mensajes claros.
    expect(bat).toContain("where git");
    expect(bat).toContain("git remote get-url origin");
    // Publica gh-pages sin disparar predeploy (evita compilar dos veces).
    expect(bat).toContain("-d dist -t");
    expect(bat).not.toContain("call npm run deploy");
  });
});