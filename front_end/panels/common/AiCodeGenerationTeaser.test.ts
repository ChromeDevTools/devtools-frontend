// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as PanelCommon from './common.js';

const {AiCodeGenerationTeaser} = PanelCommon;

describeWithEnvironment('AiCodeGenerationTeaser', () => {
  async function createTeaser() {
    const view = createViewFunctionStub(AiCodeGenerationTeaser);
    const widget = new AiCodeGenerationTeaser(view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('loading state is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.isFalse(view.input.loading);

    widget.loading = true;
    await view.nextInput;

    assert.isTrue(view.input.loading);
    widget.detach();
  });
});
