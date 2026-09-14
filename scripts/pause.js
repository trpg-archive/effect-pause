export const MODULE_ID = "effect-pause";
export const FLAG_KEY = "pauseData";

const TIME_UNITS_V14 = new Set([
  "years",
  "months",
  "days",
  "hours",
  "minutes",
  "seconds"
]);

function getCoreGeneration() {
  return Number(game.release?.generation ?? String(game.version).split(".")[0]);
}

/** Build the v13 duration structure accepted by core and MidiActiveEffect. */
function makeDurationV13(seconds, startTime = null) {
  return {
    seconds: Number(seconds),
    startTime,
    combat: null,
    rounds: null,
    turns: null,
    startRound: null,
    startTurn: null
  };
}

/** Build a fresh time-based start structure for Foundry v14. */
function makeStartV14(effect) {
  const generated = effect?.constructor?.getEffectStart?.(null);
  if (generated) return generated;

  return {
    combat: null,
    combatant: null,
    initiative: null,
    round: null,
    time: game.time.worldTime,
    turn: null
  };
}

/** Build an indefinite duration used while a v14 effect is paused. */
function makePausedDurationV14() {
  return {
    value: null,
    units: "seconds",
    expiry: null,
    expired: false
  };
}

/** Build a resumed time-based duration for Foundry v14. */
function makeRunningDurationV14(seconds) {
  return {
    value: Number(seconds),
    units: "seconds",
    expiry: null,
    expired: false
  };
}

export function getPauseData(effect) {
  return effect?.getFlag(MODULE_ID, FLAG_KEY) ?? null;
}

export function isPaused(effect) {
  const data = getPauseData(effect);
  return data?.remaining != null;
}

/**
 * Return remaining seconds for an effect that can be paused by this module.
 * Returns null for combat-duration, permanent, expired, event-expiry, or
 * unsupported effects.
 */
export function getRemainingSeconds(effect) {
  const pauseData = getPauseData(effect);
  if (pauseData?.remaining != null) {
    const remaining = Number(pauseData.remaining);
    return Number.isFinite(remaining) && remaining > 0 ? remaining : null;
  }

  const duration = effect?.updateDuration?.();
  if (!duration) return null;

  const generation = getCoreGeneration();

  if (generation >= 14) {
    // v14 stores source duration as value/units and exposes a derived
    // secondsRemaining value for time-based durations. Effects which also use
    // an expiry event are intentionally skipped because pausing the event side
    // of their expiration has different semantics.
    if (!TIME_UNITS_V14.has(duration.units)) return null;
    if (duration.expiry != null) return null;
    if (duration.expired) return null;

    const remaining = Number(duration.secondsRemaining);
    return Number.isFinite(remaining) && remaining > 0 ? remaining : null;
  }

  // Foundry v13 derives world-time durations as type === "seconds".
  if (duration.type !== "seconds") return null;

  const remaining = Number(duration.remaining);
  return Number.isFinite(remaining) && remaining > 0 ? remaining : null;
}

/** Only Actor-embedded effects are modified. */
export function canManageEffect(effect, actor) {
  if (!effect || !actor) return false;
  if (effect.parent !== actor) return false;
  if (!actor.isOwner && !game.user?.isGM) return false;
  return getRemainingSeconds(effect) != null;
}

export async function pauseEffect(effect) {
  if (!effect) throw new Error("No ActiveEffect supplied.");

  if (isPaused(effect)) return getPauseData(effect);

  const remaining = getRemainingSeconds(effect);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new Error("Effect has no supported remaining world-time duration.");
  }

  const generation = getCoreGeneration();
  const pauseData = {
    remaining,
    pausedAt: game.time.worldTime,
    generation,
    version: 2
  };

  if (generation >= 14) {
    // Foundry v14 no longer stores startTime inside duration. Instead it uses
    // duration.value/units plus a separate start object. While paused we make
    // the disabled effect indefinite, so advancing world time cannot expire it.
    // The exact remaining seconds live only in this module's flag until resume.
    await effect.update({
      disabled: true,
      duration: makePausedDurationV14(),
      [`flags.${MODULE_ID}.${FLAG_KEY}`]: pauseData
    });
  } else {
    // Foundry v13 can freeze a timed effect by keeping the remaining duration
    // while clearing its startTime.
    await effect.update({
      disabled: true,
      duration: makeDurationV13(remaining, null),
      [`flags.${MODULE_ID}.${FLAG_KEY}`]: pauseData
    });
  }

  effect.updateDuration();
  return pauseData;
}

export async function resumeEffect(effect) {
  if (!effect) throw new Error("No ActiveEffect supplied.");

  const pauseData = getPauseData(effect);
  const remaining = Number(pauseData?.remaining);

  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new Error("Effect has no saved paused duration.");
  }

  const generation = getCoreGeneration();

  if (generation >= 14) {
    await effect.update({
      disabled: false,
      duration: makeRunningDurationV14(remaining),
      start: makeStartV14(effect)
    });
  } else {
    await effect.update({
      disabled: false,
      duration: makeDurationV13(remaining, game.time.worldTime)
    });
  }

  // Remove pause state only after a successful document update.
  await effect.unsetFlag(MODULE_ID, FLAG_KEY);

  effect.updateDuration();
  return remaining;
}

export async function toggleEffectPause(effect) {
  return isPaused(effect) ? resumeEffect(effect) : pauseEffect(effect);
}
