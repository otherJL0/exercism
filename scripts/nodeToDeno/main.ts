import { expandGlob } from "https://deno.land/std@0.163.0/fs/expand_glob.ts";

interface ModuleMetadata {
  name: string;
  description: string;
  latest_version: string;
  versions: Array<string>;
  popularity_score: number;
  tags: Array<string>;
  star_count: number;
}

async function getModuleLatestVersion(module: string): Promise<string> {
  const response = await fetch(`http://apiland.deno.dev/v2/modules/${module}`);
  const metadata: ModuleMetadata = await response.json();
  return metadata.latest_version;
}

async function generateImportMap() {
  const latestVersion: string = await getModuleLatestVersion("std");
  const importMap = {
    "imports": {
      "testing/": `https://deno.land/std@${latestVersion}/testing/`,
    },
  };
  await Deno.writeTextFile(
    "import_map.json",
    JSON.stringify(importMap, null, 2),
  );
}

async function generateDenoConfig() {
  const config = {
    "compilerOptions": {
      "allowJs": false,
      "strict": true,
    },
    "importMap": "import_map.json",
  };

  await Deno.writeTextFile("deno.json", JSON.stringify(config, null, 2));
}

async function deleteNodeFiles() {
  const nodeFiles = [
    "babel.config.cjs",
    "jest.config.cjs",
    "tsconfig.json",
    "package.json",
    ".eslintrc.cjs",
    ".eslintignore",
  ];
  for (const nodeFile of nodeFiles) {
    await Deno.remove(nodeFile);
  }
}

async function renameTestFile() {
  // const xit = /^(?<indent>\s*)xit\(/;
  const xignore = /^(?<indent>\s*)x(?<ignored>it|describe)\(/;
  const toEqual =
    /^(?<indent>\s*)expect\((?<actual>.+)\)\.(toEqual|toBe)\((?<expected>.*)\)$/;
  const toThrow =
    /^(?<indent>\s*)expect\((?<actual>.+)\)\.toThrow\(new Error\((?<message>.*)\)\)$/;
  const assertTypes: Set<string> = new Set<string>();
  for await (const jestFile of expandGlob("*.test.ts")) {
    const denoTestFile = jestFile.name.replace(".test", "_test");
    const nodeTestFile = await Deno.readTextFile(jestFile.name);
    const testLines = nodeTestFile.split("\n");
    testLines[0] = testLines[0].replace(
      /'(?<localFile>.*)'$/,
      '"$<localFile>.ts";',
    );
    testLines.unshift('import { describe, it } from "testing/bdd.ts";');
    for (let i = 0; i < testLines.length; i++) {
      if (xignore.test(testLines[i])) {
        testLines[i] = testLines[i].replace(
          xignore,
          "$<indent>$<ignored>.ignore(",
        );
      } else if (toEqual.test(testLines[i])) {
        assertTypes.add("assertEquals");
        testLines[i] = testLines[i].replace(
          toEqual,
          "$<indent>assertEquals($<actual>, $<expected>);",
        );
      } else if (toThrow.test(testLines[i])) {
        assertTypes.add("assertThrows");
        testLines[i] = testLines[i].replace(
          toThrow,
          "$<indent>assertThrows($<actual>, $<message>);",
        );
      }
    }
    testLines.unshift(
      `import { ${
        Array.from(assertTypes).join(", ")
      } } from "testing/asserts.ts";`,
    );
    Deno.writeTextFile(denoTestFile, testLines.join("\n"));
    Deno.remove(jestFile.name);
  }
}

async function formatDirectory() {
  const cmd = ["deno", "fmt"];
  const p = Deno.run({ cmd });
  await p.status();
}

if (import.meta.main) {
  await Promise.all([
    deleteNodeFiles(),
    generateImportMap(),
    generateDenoConfig(),
    renameTestFile(),
  ]);
  await formatDirectory();
}
