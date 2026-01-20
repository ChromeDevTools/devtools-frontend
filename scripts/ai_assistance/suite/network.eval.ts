// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {evalGroup, itEval, LLMComparison} from './helpers/evaluators.ts';
import {loadInstructions} from './instructions/load.ts';

await evalGroup({type: 'network', label: 'request-info'}, async function() {
  await itEval({
    test: 'is an accurate response',
    judge: example => LLMComparison.judge(example, loadInstructions('request-info')),
  });
});
