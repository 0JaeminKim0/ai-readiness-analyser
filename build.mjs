/* JSX(src-jsx/*.jsx) → 컴파일된 JS(public/static/*.js)
   브라우저 in-browser Babel 없이 동작하도록 사전 컴파일.
   사용: npm run build:jsx  (devDependency @babel/core, @babel/preset-react 필요)
*/
import { transform } from "@babel/core";
import presetReact from "@babel/preset-react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("public/static", { recursive: true });
for (const name of ["index", "admin"]) {
  const code = readFileSync(`src-jsx/${name}.jsx`, "utf8");
  const out = transform(code, { presets: [presetReact] }).code;
  writeFileSync(`public/static/${name}.js`, out, "utf8");
  console.log(`✓ public/static/${name}.js (${out.length} chars)`);
}
