// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Console from './console.js';

describeWithEnvironment('ConsoleInsightTeaser', () => {
  it('renders the loading state', async () => {
    const view = createViewFunctionStub(Console.ConsoleInsightTeaser.ConsoleInsightTeaser);
    new Console.ConsoleInsightTeaser.ConsoleInsightTeaser(
        'test-uuid', {} as Console.ConsoleViewMessage.ConsoleViewMessage, undefined, view);
    const input = await view.nextInput;
    assert.isFalse(input.isInactive);
  });
});
