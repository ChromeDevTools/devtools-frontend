# Imports

This codebase follows a special convention for importing code that must be followed to avoid build errors.

In DevTools each folder of code is considered a *module*:

- `front_end/models/trace` is the *trace module*.
- `front_end/panels/timeline` is the *timeline module*.

Within each module there are multiple TypeScript files. *The file that is named the same as the folder name is called the entrypoint*.

- `front_end/models/trace/trace.ts` is the *trace module's entrypoint*
- `front_end/models/trace/ModelImpl.ts` is part of the implementation of the trace module.

## Importing from another module

When you want to reuse code from other modules, *you must import that module via its entrypoint*. Imagine we are in `front_end/panels/timeline/TimelinePanel.ts`. This import is GOOD:

```
import * as Trace from '../models/trace/trace.js'; // import the entrypoint
```

This import is BAD because we import a file that is NOT the entrypoint:

```
import * as ModelImpl from '../models/trace/ModelImpl.js' // NEVER ALLOWED
```

Additionally, you **must import using the `import * as` syntax**.

```
import {ModelImpl, X, Y} from '../models/trace/trace.js'; // BAD
```

```
import * as Trace from '../models/trace/trace.js'; // GOOD
```

## Importing from within the same module

If you are within the same module, it is OK to import from files directly rather than go via the entrypoint. You can also import specifically what you need.

For example, if you are editing `front_end/models/trace/ModelImpl.ts` this would be acceptable:

```
import {Foo} from './Foo.js'; // allowed because Foo.ts is in the same directory.
```
