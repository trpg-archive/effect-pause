import { registerSheetHooks } from "./sheets.js";

Hooks.once("init", () => {
  const version = game.modules.get("effect-pause")?.version ?? "unknown";
  console.log(`Effect Pause | Initializing v${version}`);

  if (game.system.id !== "dnd5e") {
    console.warn("Effect Pause | This module is intended for the dnd5e system.");
  }

  registerSheetHooks();
});
