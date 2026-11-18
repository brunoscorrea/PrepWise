# Tests

- `node unit.js` — schema validation, import formats and the AB-650 bank.
- `python3 e2e.py` — acceptance flow: v1 migration, AB-650 quiz, second certification, independence, leakage, import/export, settings persistence, resets, duplicate/archive/delete, notes, readiness, invalid imports. Writes `dl/all_storage.json`, which `layout.py` uses.
- `python3 layout.py` — every page at 320×640, 390×844, 820×1180 and 1440×900: no horizontal overflow, number fields never overlap their unit, sheets/dialogs fit, player touch targets.
- `python3 pwa.py` — service worker, cache, manifest and offline use.
- `legacy_v1_state.json` is v1 data produced by driving the original app (`make_fixture.py`).

Needs `pip install playwright` and Chrome/Chromium.
