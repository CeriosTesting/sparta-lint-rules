---
"@cerios/sparta-lint-rules": patch
---

New standard area `desktop` for Windows desktop apps. It is structured like `ui`, with windows (`windows/`, `*-window.ts`) in place of pages, and follows the `ui` layer rules with `window` in place of `page`. Top-level scenarios may not use windows and components, and tests also not steppers and asserters. `file-naming`, `class-matches-filename` and `no-direct-construction-in-tests` know the new layer folder and the `Window` suffix. If you mapped a custom area named `desktop` in `settings.sparta.areas`, remove that entry: `desktop` is now a standard area.
