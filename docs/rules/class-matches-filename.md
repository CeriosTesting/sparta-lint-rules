# sparta/class-matches-filename

Require a layer file to contain exactly one class, named after the file in PascalCase.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

Applies to files in layer folders (`steppers/`, `asserters/`, `clients/`, `services/`, `pages/`, `screens/`, `components/`, `repositories/`, `builders/`, `directors/`, `factories/`, `scenarios/`), to `sparta/scenarios/` and to `sparta/fixtures/`.

- The first top-level class must be named after the file: `orders-stepper.ts` → `OrdersStepper`.
- Any further top-level class is reported; move it to its own file.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). Custom layer folders from `layers` count as layer folders.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ❌
export class OrderStepper {}

// ❌ second class
export class OrdersStepper {}
class Helper {}

// ✅
export class OrdersStepper {}
```
