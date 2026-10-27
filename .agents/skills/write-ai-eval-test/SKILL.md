---
name: write-ai-eval-test
description: Use when asked to write or create an ai_eval test under test/ai_evals/ for an evaluation use case in test/ai_evals/eval_data/evals/. Works across all DevTools domains (performance, network, elements, sources, console, accessibility, storage). To minimize latency, in your FIRST turn call view_file in parallel on SKILL.md, task.textproto + agent_prompt.md for <eval-id>, and test/ai_evals/BUILD.gn (plus test/ai_evals/<domain>/BUILD.gn if <domain> is known).
---

# Writing AI Eval Tests (`test/ai_evals/`)

## Guardrails & Forbidden Actions

> [!CAUTION]
> 1. **CRITICAL RULE — SINGLE V2 TEST ONLY:** Always write **only one V2 evaluation test** per eval (`enabledFeatures: ['DevToolsAiV2Architecture']`) using the canonical template below. **NEVER** create V1 tests or V1+V2 pairs.
> 2. **CRITICAL RULE — NEVER SET OR PASS CONTEXT:** **NEVER** call `findAndSetContext` (or any panel/UI context-selection helper) and **NEVER** pass `context` to `evalTask.executePrompt(...)`, even when `initial_context` is present in `task.textproto`.
> 3. **CRITICAL RULE — MINIMAL FILE READS & NO UNREQUESTED COMMANDS:**
>    - **Only read `task.textproto`, `agent_prompt.md`, and `BUILD.gn` files.** Do **NOT** read `ai_eval-helpers.ts`, `ai-eval-state-provider.ts`, `base-apps/`, `front_end/`, or legacy tests that use `findAndSetContext`.
>    - Do **NOT** run `git`, `autoninja`, `./dt lint`, or `./dt test` unless the user explicitly asks to build or run the test.

## Fast 2-Step Workflow (All Domains)

### Step 1: Read Only Required Metadata & `BUILD.gn` in One Parallel Turn
Call `view_file` in parallel on:
1. **`task.textproto` and `agent_prompt.md`** for `<eval-id>`:
   - Check flat path `test/ai_evals/eval_data/evals/<eval-id>/` (`evalFolder` = `''`) or nested path `test/ai_evals/eval_data/evals/<eval-folder>/<eval-id>/` (`evalFolder` = `'<eval-folder>'`, e.g. `'network'`).
   - From `agent_prompt.md`: extract the trimmed prompt string `<agent_prompt>`.
   - From `task.textproto`: infer `<domain>` in priority order:
     1. Explicit user instruction or `<eval-folder>` subfolder name.
     2. Domain tag in `tags`: `"performance"`, `"network"`, `"elements"`, `"sources"`, `"console"`, `"accessibility"`, `"storage"` (ignore generic tags like `"cd4h"` or `"bugfix"`, and prefer panel domain tags over sub-topic tags like `"cls"`).
     3. `initial_context.panel` fallback *(for folder naming only — never set context in code)*:
        - `NETWORK_REQUEST` $\rightarrow$ `network`
        - `PERFORMANCE` $\rightarrow$ `performance`
        - `DOM_NODE` / `ELEMENTS` $\rightarrow$ `elements`
        - `SOURCE_FILE` / `SOURCES` $\rightarrow$ `sources`
        - `CONSOLE` $\rightarrow$ `console`
        - `ACCESSIBILITY` $\rightarrow$ `accessibility`
        - `STORAGE` / `APPLICATION` $\rightarrow$ `storage`
   - *Note:* `setupAndRunEvalApp` parses `base_app` and `initial_url` from `task.textproto` automatically at runtime—do not hardcode them.
2. **`test/ai_evals/BUILD.gn`** (and **`test/ai_evals/<domain>/BUILD.gn`** if `<domain>` is already known).

### Step 2: Write Test and Update `BUILD.gn` in One Parallel Turn
In a single parallel tool-call turn:
1. Create `test/ai_evals/<domain>/<eval-id>.test.ts` (`write_to_file`) using this exact domain-agnostic V2 template (`<Domain>` is capitalized `<domain>`, e.g. `Performance`, `Network`, `Elements`, `Sources`, `Console`, `Accessibility`, `Storage`):
```typescript
// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  setupAndRunEvalApp,
  stopEvalApp,
} from '../helpers/ai_eval-helpers.js';
import {describe, it, setup} from '../mocha-interface.js';

describe('<Domain> AI Eval: <eval-id>', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    enabledFeatures: ['DevToolsAiV2Architecture'],
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
    evalConfig: {
      type: '<domain>',
      label: '<eval-id>',
      taskId: '<eval-id>',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({inspectedPage, evalTask}) => {
    const app = await setupAndRunEvalApp('<evalFolder>', '<eval-id>');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'networkidle0'});

      await evalTask.executePrompt({
        prompts: ['<agent_prompt>'],
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
```
2. Update `BUILD.gn`:
   - **If `test/ai_evals/<domain>/BUILD.gn` exists:** Add `"<eval-id>.test.ts"` in alphabetical order to `sources` (`replace_file_content`).
   - **If `<domain>` is a new domain folder:** Create `test/ai_evals/<domain>/BUILD.gn` (`write_to_file`) and add `"<domain>"` to `deps` in both `group("ai_evals")` and `generated_file("test_inputs")` in `test/ai_evals/BUILD.gn` (`replace_file_content`):
     ```gn
     # Copyright 2026 The Chromium Authors
     # Use of this source code is governed by a BSD-style license that can be
     # found in the LICENSE file.

     import("../../../scripts/build/typescript/typescript.gni")

     node_ts_library("<domain>") {
       sources = [ "<eval-id>.test.ts" ]

       ts_deps = [
         "..:harness_library",
         "../../e2e/helpers",
         "../helpers",
       ]
     }
     ```
