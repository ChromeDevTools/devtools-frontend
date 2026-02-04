// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {evalGroup, itEval, LLMComparison} from './helpers/evaluators.ts';
import {loadInstructions} from './instructions/load.ts';

await Promise.all([
  evalGroup(
      {type: 'network', label: 'request-info'},
      async function() {
        await itEval({
          test: 'is an accurate response to \'What is this network request about\'',
          judge: example => LLMComparison.judge(example, loadInstructions('network.eval')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),

  evalGroup(
      {type: 'network', label: 'bad-request-4xx'},
      async function() {
        await itEval({
          test: 'is an accurate response to \'Why is this network request failing\' (4xx)',
          judge: example => LLMComparison.judge(example, loadInstructions('network.eval')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),

  evalGroup(
      {type: 'network', label: 'cors-credentials'},
      async function() {
        await itEval({
          test: 'is an accurate response to \'Why is this network request failing\' (CORS credentials)',
          judge: example => LLMComparison.judge(example, loadInstructions('network.eval')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),

  evalGroup(
      {type: 'network', label: 'redirect-3xx'},
      async function() {
        await itEval({
          test: 'is an accurate response to \'Why is this network request failing\' (3xx)',
          judge: example => LLMComparison.judge(example, loadInstructions('network.eval')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),

  evalGroup(
      {type: 'network', label: 'server-error-5xx'},
      async function() {
        await itEval({
          test: 'is an accurate response to \'Why is this network request failing\' (5xx)',
          judge: example => LLMComparison.judge(example, loadInstructions('network.eval')),
        });

        await itEval({
          test: 'ROUGE-Lsum',
          rouge: true,
        });
      }),
]);
