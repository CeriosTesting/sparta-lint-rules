# sparta/file-naming

Require files in a layer folder to be kebab-case and end with the layer suffix (e.g. `orders-stepper.ts`).

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

| Folder          | File name         |
| --------------- | ----------------- |
| `asserters/`    | `*-asserter.ts`   |
| `builders/`     | `*-builder.ts`    |
| `clients/`      | `*-client.ts`     |
| `components/`   | `*-component.ts`  |
| `directors/`    | `*-director.ts`   |
| `factories/`    | `*-factory.ts`    |
| `pages/`        | `*-page.ts`       |
| `repositories/` | `*-repository.ts` |
| `scenarios/`    | `*-scenario.ts`   |
| `screens/`      | `*-screen.ts`     |
| `services/`     | `*-service.ts`    |
| `steppers/`     | `*-stepper.ts`    |
| `windows/`      | `*-window.ts`     |

This applies to layer folders in `sparta/<area>/<group>/`, to `sparta/<area>/builders/` and `sparta/<area>/directors/`, and to `sparta/scenarios/`. Other folders (such as `models/`) are not checked.

An `index.ts` barrel is allowed in a layer folder. [`architecture-boundaries`](architecture-boundaries.md) makes sure it only re-exports its own layer.

The suffix also counts with the other TypeScript extensions (`orders-stepper.mts`). Declaration files (`*.d.ts`) are not checked.

The whole name before the extension must be kebab-case: lowercase letters and digits, joined by single hyphens (`orders-v2-stepper.ts`). The message suggests the kebab-case name, for example `my-orders-stepper.ts` for `myOrders-stepper.ts`. Together with [`class-matches-filename`](class-matches-filename.md) this gives one predictable class name per file.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). A custom layer folder from `layers` uses the suffix of the standard folder it follows: with `{ "page-objects": "pages" }`, files in `page-objects/` end with `-page.ts`.

## Examples

```text
❌ sparta/api/orders/steppers/orders.ts           (no suffix)
❌ sparta/api/orders/steppers/myOrders-stepper.ts (not kebab-case)
✅ sparta/api/orders/steppers/orders-stepper.ts
✅ sparta/scenarios/checkout-scenario.ts
✅ sparta/ui/shop/pages/index.ts
```
