---
"@cerios/sparta-lint-rules": patch
---

New rule `director-composes-builders` (recommended: warn). A director that imports only a single builder is reported, because that code belongs on the builder as a custom builder method.
