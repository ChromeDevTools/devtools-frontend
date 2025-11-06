# Detects usages of legacy lit imports (no-legacy-imports)

Legacy lit imports should not be used in newer versions and have been
replaced.

## Rule Details

This rule disallows use of legacy lit imports.

The following patterns are considered warnings:

```ts
import {internalProperty} from 'lit-element';
```

The following patterns are not warnings:

```ts
import {state} from 'lit/decorators';
```

## When Not To Use It

If you still rely on older lit, you may want to disable this rule.
