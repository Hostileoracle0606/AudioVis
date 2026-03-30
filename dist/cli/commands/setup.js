"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSetup = registerSetup;
const picocolors_1 = __importDefault(require("picocolors"));
const setup_js_1 = require("../../macos/setup.js");
const errors_js_1 = require("../../utils/errors.js");
function registerSetup(program) {
    program
        .command("setup")
        .description("Run the guided first-run setup flow")
        .action(async () => {
        try {
            if (process.platform === "darwin") {
                const result = await (0, setup_js_1.ensureMacosReady)();
                console.log(picocolors_1.default.green(`\nSetup complete. Using audio device: ${result.deviceName}`));
                return;
            }
            console.log("No guided setup flow is available for this platform yet.");
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Setup failed", err);
        }
    });
}
//# sourceMappingURL=setup.js.map