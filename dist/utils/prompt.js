"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptText = promptText;
exports.promptRequired = promptRequired;
exports.promptConfirm = promptConfirm;
exports.waitForEnter = waitForEnter;
const promises_1 = require("readline/promises");
const process_1 = require("process");
function assertInteractiveTerminal() {
    if (!process_1.stdin.isTTY || !process_1.stdout.isTTY) {
        throw new Error("Interactive setup requires a real terminal session.");
    }
}
async function promptText(question) {
    assertInteractiveTerminal();
    const rl = (0, promises_1.createInterface)({ input: process_1.stdin, output: process_1.stdout });
    try {
        return (await rl.question(question)).trim();
    }
    finally {
        rl.close();
    }
}
async function promptRequired(question) {
    while (true) {
        const value = await promptText(question);
        if (value) {
            return value;
        }
        console.log("A value is required.");
    }
}
async function promptConfirm(question, defaultValue = true) {
    const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
    while (true) {
        const raw = (await promptText(`${question}${suffix}`)).toLowerCase();
        if (!raw) {
            return defaultValue;
        }
        if (raw === "y" || raw === "yes") {
            return true;
        }
        if (raw === "n" || raw === "no") {
            return false;
        }
        console.log("Please answer y or n.");
    }
}
async function waitForEnter(question) {
    await promptText(question);
}
//# sourceMappingURL=prompt.js.map