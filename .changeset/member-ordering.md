---
"@cerios/sparta-lint-rules": patch
---

New rule `member-ordering`, which replaces `private-members-last`. Class members must be ordered as static properties, instance properties, constructor, static methods, instance methods, each from public to protected to private. A property holding a function counts as a method. A property whose initializer reads a property declared above it is not reported, because moving it would change the result. Rename `sparta/private-members-last` to `sparta/member-ordering` in your config if you set it explicitly.
