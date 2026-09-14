# Effect Pause

**Effect Pause** is a small Foundry VTT module that adds a true pause/resume control for timed Active Effects on D&D 5e actor sheets.

Foundry's normal **Disabled** state stops an effect from applying its changes, but the duration may continue to expire. Effect Pause stores the exact remaining world-time duration, disables the effect, and restores the countdown when the effect is resumed.

## Compatibility

- Foundry VTT **v13-v14**
- D&D5e **5.2.5-5.3.3**
- Default D&D5e actor sheets
- Tidy 5e Sheets (modern and classic render hooks)
- Works with core Active Effects and with the corresponding DAE / MidiActiveEffect duration structures used by the supported versions

D&D5e 5.2.5 is a Foundry v13 target. D&D5e 5.3.x supports Foundry v13 and v14. D&D5e 6.x is intentionally not declared compatible in this release.

## Features

- Adds a **Pause / Resume** button directly to supported effect rows.
- Stores the exact remaining duration while paused.
- Advancing world time does not reduce a paused effect's saved duration.
- Resuming starts a new countdown from the saved remainder.
- Keeps the normal Foundry **Disabled** control separate from true timer pausing.
- Russian and English localization.

## Supported effects

Effect Pause intentionally modifies only Active Effects embedded directly on an Actor and only effects whose duration is measured using world time.

- Foundry v13: `seconds`-based Active Effects.
- Foundry v14: time-based durations using `years`, `months`, `days`, `hours`, `minutes`, or `seconds` when Foundry can derive remaining seconds.

Combat round/turn durations, event-expiry effects, permanent effects, expired effects, and transferred/item-owned effects are skipped.

## Installation

### From a GitHub release

1. Open the latest release.
2. Download `effect-pause.zip`.
3. Extract it into your Foundry user-data folder so the final path is:
   `Data/modules/effect-pause/module.json`
4. Restart Foundry if necessary.
5. Enable **Effect Pause** in **Manage Modules**.

### Manifest installation

The latest release publishes a Foundry-ready manifest as `module.json`.

[Latest manifest](../../releases/latest/download/module.json)

Copy the link address above into Foundry's **Install Module → Manifest URL** field.

## Usage

Open an Actor sheet and go to its Effects tab. Supported timed effects receive an extra pause/play icon in their row.

- **Pause**: saves the exact remaining duration and freezes the timer.
- **Resume**: restores the saved duration and restarts the timer from the current world time.

A normally disabled effect can still age. Use Effect Pause when you want the timer itself to stop.

## Notes for Foundry v13 and v14

Foundry v13 and v14 use different Active Effect duration schemas, so Effect Pause handles them separately.

- On v13, the module keeps the remaining duration while clearing the effect's `startTime`.
- On v14, the module stores the remaining seconds in its own flag and temporarily makes the disabled effect indefinite. On resume it restores a time-based duration with a fresh start time.

## License

MIT. See [LICENSE](LICENSE).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
