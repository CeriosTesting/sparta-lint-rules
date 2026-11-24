---
"@cerios/sparta-lint-rules": patch
---

`architecture-boundaries`: builders and directors are no longer limited to `sparta/<area>/builders/` and `sparta/<area>/directors/`. Put them at the level that matches who needs them:

- in a group (`sparta/<area>/<group>/builders/`), private to that group, using its own services and models;
- in an area's `common/` (`sparta/<area>/common/builders/`), for everything in that area folder;
- directly in an area (`sparta/<area>/builders/`), shared by the area's groups, as before;
- in `sparta/common/` (`sparta/common/builders/`), for every area.

The `placement` error for `builders/` and `directors/` folders inside a group is removed. The same rules apply at every level: only scenarios, steppers, asserters, services and directors may use builders; builders use no builders or directors; directors use no directors; besides builders, a builder or director may only use services (as a normal class) and code outside the layer folders. `director-composes-builders`, `file-naming` and `class-matches-filename` cover the new locations.
