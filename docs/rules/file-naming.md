# sparta/file-naming

Require files in a layer folder to end with the layer suffix.

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

This applies to layer folders in `sparta/<area>/<group>/` and to `sparta/scenarios/`. Other folders (such as `models/`) are not checked.

An `index.ts` barrel is allowed in a layer folder. [`architecture-boundaries`](architecture-boundaries.md) makes sure it only re-exports its own layer.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). A custom layer folder from `layers` uses the suffix of the standard folder it follows: with `{ "page-objects": "pages" }`, files in `page-objects/` end with `-page.ts`.

## Examples

```text
❌ sparta/api/orders/steppers/orders.ts
✅ sparta/api/orders/steppers/orders-stepper.ts
✅ sparta/scenarios/checkout-scenario.ts
✅ sparta/ui/shop/pages/index.ts
```
