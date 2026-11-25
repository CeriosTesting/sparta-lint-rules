---
"@cerios/sparta-lint-rules": patch
---

`architecture-boundaries`: a builder may now use another builder for nested composition with `@cerios/cerios-builder`. Every use of the imported builder must be inside a composer type for it (`BuilderComposerFromFactory<typeof AddressBuilder.create>` for types and interfaces, `ClassBuilderComposerFromFactory<…>` for classes), or inside a function or method with a parameter of such a type. The composer type may be written on the parameter or reached through a local `type` alias or `interface`. Any other use is reported where it happens.

The builder and director checks now have their own messages, which name the import and say how to fix it, instead of the generic layer message that read like an isolation problem:

- `builderUsesBuilder`: a builder uses another builder outside a composer;
- `builderUsesDirector`: a builder uses a director;
- `directorUsesDirector`: a director uses another director.
