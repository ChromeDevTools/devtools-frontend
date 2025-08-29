// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {evalGroup, FunctionCalled, itEval, LLMComparison} from './helpers/evaluators.ts';
import {loadInstructions} from './instructions/load.ts';

await evalGroup({type: 'performance', label: 'lcp-breakdown'}, async function() {
  await itEval({
    test: 'calls getMainThreadActivity',
    succeed: example => FunctionCalled.nameOnly(example, 'getMainThreadActivity'),
  });

  await itEval({
    test: 'is an accurate response',
    judge: example => LLMComparison.judge(example, loadInstructions('lcp-breakdown')),
  });
});
