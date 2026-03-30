import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

function assertInteractiveTerminal(): void {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("Interactive setup requires a real terminal session.");
  }
}

export async function promptText(question: string): Promise<string> {
  assertInteractiveTerminal();
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export async function promptRequired(question: string): Promise<string> {
  while (true) {
    const value = await promptText(question);
    if (value) {
      return value;
    }

    console.log("A value is required.");
  }
}

export async function promptConfirm(
  question: string,
  defaultValue = true
): Promise<boolean> {
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

export async function waitForEnter(question: string): Promise<void> {
  await promptText(question);
}
