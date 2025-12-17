// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as PanelCommon from './common.js';

const {AiCodeGenerationTeaser, AiCodeGenerationTeaserDisplayState} = PanelCommon.AiCodeGenerationTeaser;

describeWithEnvironment('AiCodeGenerationTeaser', () => {
  async function createTeaser() {
    const view = createViewFunctionStub(AiCodeGenerationTeaser);
    const widget = new AiCodeGenerationTeaser(view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('displayState state is updated', async () => {
    const {view, widget} = await createTeaser();
    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.TRIGGER);

    widget.displayState = AiCodeGenerationTeaserDisplayState.DISCOVERY;
    await view.nextInput;

    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.DISCOVERY);

    widget.displayState = AiCodeGenerationTeaserDisplayState.LOADING;
    await view.nextInput;

    assert.deepEqual(view.input.displayState, AiCodeGenerationTeaserDisplayState.LOADING);
    widget.detach();
  });
});
