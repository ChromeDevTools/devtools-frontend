# DevTools API Tests

This directory hosts the API tests for DevTools. These tests run DevTools SDK and foundation models against a target page connected over CDP, without needing to spin up the full DevTools frontend UI. We use [Mocha] as the testing framework.

[TOC]

## Writing API tests

`describe`, `it` and `setup` are not available as globals. Import them from
[mocha-interface.ts](./mocha-interface.ts) and add `test/api` to the `ts_deps`
of the `devtools_api_test_module` that contains the test.

Each test receives a state object containing `{inspectedPage, universe}` as its first parameter:

```ts
import {describe, it} from '../../../test/api/mocha-interface.js';

describe('My API Test', () => {
  it('runs against inspected page', async ({inspectedPage, universe}) => {
    await inspectedPage.goToHtml('<h1>Hello World</h1>');
    // Interact with universe models or inspectedPage...
  });
});
```

### Suite Setup (`setup`)

Use the `setup` function inside a `describe` block to customize suite settings before `universe` is created:

- `creationOptions`: Partial `Universe.CreationOptions` passed to `Universe` (e.g. `hostConfig`, `inspectorFrontendHost`, `supportsEmulation`, `overrideAutoStartModels`, `settingsCreationOptions`).
- `targetUrl`: Initial URL to navigate the inspected page to **FIRST**, before the `Universe` is attached.

```ts
describe('Suite with custom hostConfig', () => {
  setup({
    creationOptions: {
      hostConfig: {
        devToolsConsoleInsights: {enabled: true},
      },
    },
    targetUrl: 'https://example.com',
  });

  it('runs with custom config', async ({universe}) => {
    // ...
  });
});
```

## Running API tests

Note that `./dt test front_end` runs unit tests as well. To run API tests specifically, specify a glob matching `.test.api.ts` files:

```bash
./dt test "front_end/**/*.test.api.ts"
```

To run a specific API test file:

```bash
./dt test front_end/foundation/Universe.test.api.ts
```

To use `out/Debug` instead of the default `out/Default` target directory:

```bash
./dt test -t Debug "front_end/**/*.test.api.ts"
```

To run API tests in **debug mode**:

```bash
./dt test --debug "front_end/**/*.test.api.ts"
```

Check the output of `./dt test --help` for an overview of all available options.

## Debugging API tests

You can debug the API test process by inspecting the Node.js process that executes the test suite.

Passing `--debug` to `./dt test` starts the Node.js runner with inspector support enabled (`--inspect`). You can attach to the process by:

1. Opening `chrome://inspect` in Chrome.
2. Clicking **Inspect** under the Target (Node.js) section or clicking the Node.js icon in any open DevTools window.
3. Setting breakpoints and stepping through test execution in DevTools.

[mocha]: https://mochajs.org
