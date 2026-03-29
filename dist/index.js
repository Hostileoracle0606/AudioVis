#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program_js_1 = require("./cli/program.js");
const program = (0, program_js_1.buildProgram)();
program.parseAsync(process.argv).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${msg}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map