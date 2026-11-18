---
"@cerios/sparta-lint-rules": patch
---

`architecture-boundaries`: builders and directors now live on their own, directly in an area (`sparta/<area>/builders/`, `sparta/<area>/directors/`), shared by the area's groups. This applies to every area, not only `ui` and `mobile`. Only scenarios, steppers, asserters and services of the same area folder may use them. Builders don't depend on other builders or on directors, and directors only depend on builders of their area. A normal class may also use the services of its area; a static abstract class may not. Other group code is never allowed. A `builders/` or `directors/` folder inside a group is reported with the area folder it belongs in. `builders` and `directors` can no longer be used as group names. `file-naming`, `class-matches-filename` and `member-ordering` apply to the new folders. Builders and directors are added to the re-export check.
