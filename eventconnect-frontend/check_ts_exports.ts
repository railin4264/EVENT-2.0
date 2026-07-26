import * as ts from "typescript";

const program = ts.createProgram(["src/lib/icons.ts"], {
  noEmit: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile("src/lib/icons.ts");

const imports = sf.statements.filter(ts.isImportDeclaration);
for (const imp of imports) {
  if (imp.moduleSpecifier.getText().includes("lucide-react")) {
    const sym = checker.getSymbolAtLocation(imp.moduleSpecifier);
    if (sym) {
      const exports = checker.getExportsOfModule(sym);
      const names = exports.map(e => e.name);
      console.log("TS thinks total exports from lucide-react:", names.length);
      console.log("Includes Box?", names.includes("Box"));
      const fs = require('fs');
      fs.writeFileSync("ts_exports.json", JSON.stringify(names));
    }
  }
}
