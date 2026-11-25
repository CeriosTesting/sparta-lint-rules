---
"@cerios/sparta-lint-rules": patch
---

`class-matches-filename`: a file in a layer folder without a class now gets a message that names what it holds instead. A file with only types (`type`, `interface`, `declare`, `export type`) is told to move them to `models/`. A file with only functions is told to make them methods of the class named after the file. Both are still reported, since layer files are classes. Files in `models/`, `enums/` and other folders outside the layers are not checked, whatever their name.

`director-composes-builders`: a director that uses one builder and also imports another director is no longer told to move its code onto that builder. That advice can't be followed, because the builder would then use a director. `architecture-boundaries` reports the director import.
