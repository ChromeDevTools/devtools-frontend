// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {evalGroup, FunctionCalled, itEval, LLMComparison} from './helpers/evaluators.ts';
import {loadInstructions} from './instructions/load.ts';

await Promise.all([
  evalGroup(
      {type: 'performance', label: 'lcp-breakdown'},
      async function() {
        await itEval({
          test: 'calls getMainThreadActivity',
          succeed: example => FunctionCalled.nameOnly(example, 'getMainThreadActivity'),
        });

        await itEval({
          test: 'is an accurate response',
          judge: example => LLMComparison.judge(example, loadInstructions('lcp-breakdown')),
        });
      }),

  evalGroup(
      {type: 'performance', label: 'cls-breakdown'},
      async function() {
        await itEval({
          test: 'calls getInsightDetails with CLS insight',
          succeed: example =>
              FunctionCalled.nameAndArguments(example, 'getInsightDetails', {insightName: 'CLSCulprits'}),
        });

        await itEval({
          test: 'is an accurate response to \'Why is the CLS for my page bad?\'',
          judge: example => LLMComparison.judge(example, loadInstructions('cls-breakdown')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),
]);
