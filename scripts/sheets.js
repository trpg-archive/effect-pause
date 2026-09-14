import {
  canManageEffect,
  getRemainingSeconds,
  isPaused,
  toggleEffectPause
} from "./pause.js";

const BUTTON_CLASS = "effect-pause-control";

function localize(key, fallback) {
  const value = game.i18n.localize(key);
  return value === key ? fallback : value;
}

function normalizeRoot(element) {
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return null;
}

function resolveActor(app) {
  return app?.actor ?? app?.document ?? app?.object ?? null;
}

function resolveEffect(actor, row) {
  if (!actor || !row) return null;

  const effectId = row.dataset.effectId
    ?? row.querySelector?.("[data-effect-id]")?.dataset?.effectId;

  if (!effectId) return null;

  // Effect Pause intentionally acts only on effects embedded directly on the Actor.
  // Default D&D5e can also render transferred/item effects; those are skipped.
  return actor.effects?.get(effectId) ?? null;
}

function findEffectRows(root) {
  const rows = new Set();

  // Default D&D5e 5.2/5.3 actor sheet.
  root.querySelectorAll(".effects-list [data-effect-id]").forEach(el => {
    const row = el.closest("li[data-effect-id]") ?? el;
    rows.add(row);
  });

  // Tidy 5e modern/classic sheets expose a stable sheet-part identifier.
  root.querySelectorAll('[data-tidy-sheet-part="effect-table-row"]').forEach(row => rows.add(row));

  // Fallback for Tidy builds where the part marker is on a child or wrapper.
  root.querySelectorAll("[data-effect-id]").forEach(el => {
    const tidyRow = el.closest('[data-tidy-sheet-part="effect-table-row"]');
    if (tidyRow) rows.add(tidyRow);
  });

  return [...rows];
}

function findControls(row) {
  return row.querySelector(
    ".effect-controls, .item-controls, .row-actions, .item-row-actions, " +
    '[data-tidy-sheet-part="row-actions"], [data-tidy-sheet-part="item-table-row-actions"]'
  );
}

function makeButton(effect, { nativeDnd5e = false } = {}) {
  const paused = isPaused(effect);
  const remaining = getRemainingSeconds(effect);

  const button = document.createElement(nativeDnd5e ? "a" : "button");

  if (nativeDnd5e) {
    button.href = "#";
    button.classList.add("effect-control", "item-control", "always-interactive");
  } else {
    button.type = "button";
  }

  button.classList.add(BUTTON_CLASS, "effect-pause-icon-button");
  button.dataset.effectPauseId = effect.id;
  button.dataset.tidyRenderScheme = "handlebars";

  if (paused) button.classList.add("is-paused");

  const title = paused
    ? localize("EFFECTPAUSE.Resume", "Resume effect")
    : effect.disabled
      ? localize("EFFECTPAUSE.FreezeDisabled", "Freeze remaining duration")
      : localize("EFFECTPAUSE.Pause", "Pause effect");

  button.title = title;
  button.setAttribute("aria-label", title);
  button.innerHTML = paused
    ? '<i class="fa-solid fa-play" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-pause" aria-hidden="true"></i>';

  if (remaining != null) {
    button.dataset.remaining = String(remaining);
  }

  return button;
}

function attachButton(app, actor, row, effect) {
  if (row.querySelector(`.${BUTTON_CLASS}`)) return;

  const controls = findControls(row);

  const isTidy = Boolean(
    row.closest('[data-tidy-sheet-part], .tidy5e-sheet, .tidy5e, [data-tidy-render-scheme]')
  );

  // The default D&D5e sheet already has a native action-control layout.
  // Use the same <a class="effect-control item-control"> structure there so
  // the pause icon inherits the exact same alignment and spacing as Toggle/Menu.
  const nativeDnd5e = Boolean(
    controls?.classList.contains("effect-controls")
    && row.closest(".dnd5e2")
    && !isTidy
  );

  const button = makeButton(effect, { nativeDnd5e });

  if (controls) {
    // Use an <a>-like visual size but keep a real button for accessibility.
    controls.prepend(button);
  } else {
    row.append(button);
    row.classList.add("effect-pause-row-fallback");
  }

  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();

    if (button.dataset.effectPauseBusy === "true") return;
    button.dataset.effectPauseBusy = "true";
    button.classList.add("is-busy");
    button.setAttribute("aria-disabled", "true");

    try {
      const wasPaused = isPaused(effect);
      const result = await toggleEffectPause(effect);

      const message = wasPaused
        ? localize("EFFECTPAUSE.ResumedNotice", "Effect resumed")
        : localize("EFFECTPAUSE.PausedNotice", "Effect paused");

      ui.notifications.info(`${message}: ${effect.name}`);

      // Most sheets re-render automatically after an embedded document update.
      // If they do not, refresh this row immediately as a visual fallback.
      setTimeout(() => {
        const currentRoot = normalizeRoot(app?.element) ?? row.closest(".window-content") ?? row.parentElement;
        if (currentRoot) decorateActorSheet(app, currentRoot);
      }, 50);

      return result;
    } catch (error) {
      console.error("Effect Pause | Failed to toggle effect", effect, error);
      ui.notifications.error(
        `${localize("EFFECTPAUSE.Error", "Could not change effect")}: ${effect.name}`
      );
      delete button.dataset.effectPauseBusy;
      button.classList.remove("is-busy");
      button.removeAttribute("aria-disabled");
    }
  });
}

export function decorateActorSheet(app, element) {
  const root = normalizeRoot(element);
  const actor = resolveActor(app);

  if (!root || !actor || actor.documentName !== "Actor") return;

  for (const row of findEffectRows(root)) {
    const effect = resolveEffect(actor, row);
    if (!canManageEffect(effect, actor)) continue;
    attachButton(app, actor, row, effect);
  }
}

export function registerSheetHooks() {
  // D&D5e 5.2/5.3 modern actor sheets, and Tidy modern sheets.
  Hooks.on("renderActorSheetV2", (app, element) => decorateActorSheet(app, element));

  // Legacy/default compatibility where a v1 ActorSheet render hook is still emitted.
  Hooks.on("renderActorSheet", (app, html) => decorateActorSheet(app, html));

  // Tidy 5e Classic sheets. Tidy documents this hook for every full/partial render.
  Hooks.on("tidy5e-sheet.renderActorSheet", (app, element) => decorateActorSheet(app, element));
}
