
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ExploreWidget', () => {
  let stubViewManager: sinon.SinonStubbedInstance<UI.ViewManager.ViewManager>;
  async function createComponent(): Promise<ViewFunctionStub<typeof AiAssistance.ExploreWidget.ExploreWidget>> {
    const view = createViewFunctionStub(AiAssistance.ExploreWidget.ExploreWidget);
    const component = new AiAssistance.ExploreWidget.ExploreWidget(undefined, view);
    component.wasShown();
    await component.updateComplete;
    return view;
  }

  beforeEach(() => {
    stubViewManager = sinon.createStubInstance(UI.ViewManager.ViewManager, {hasView: true});
    sinon.stub(UI.ViewManager.ViewManager, 'instance').returns(stubViewManager);
  });

  it('should show feature cards for enabled features', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
      },
      devToolsAiAssistanceNetworkAgent: {
        enabled: true,
      },
      devToolsAiAssistanceFileAgent: {
        enabled: true,
      },
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      },
    });
    const view = await createComponent();
    const featureCards = view.input.featureCards;

    assert.isDefined(featureCards);
    assert.lengthOf(featureCards, 4);
    assert.strictEqual(featureCards[0].heading, 'CSS styles');
    assert.strictEqual(featureCards[1].heading, 'Network');
    assert.strictEqual(featureCards[2].heading, 'Files');
    assert.strictEqual(featureCards[3].heading, 'Performance');
  });

  it('should not show any feature cards if none of the entrypoints are available', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        enabled: false,
      },
      devToolsAiAssistanceNetworkAgent: {
        enabled: false,
      },
      devToolsAiAssistanceFileAgent: {
        enabled: false,
      },
      devToolsAiAssistancePerformanceAgent: {
        enabled: false,
      },
    });
    const view = await createComponent();
    const featureCards = view.input.featureCards;

    assert.isDefined(featureCards);
    assert.lengthOf(featureCards, 0);
  });

  it('should not show any feature cards if the views are not available', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
      },
      devToolsAiAssistanceNetworkAgent: {
        enabled: true,
      },
      devToolsAiAssistanceFileAgent: {
        enabled: true,
      },
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
      },
    });
    stubViewManager.hasView.returns(false);

    const view = await createComponent();
    const featureCards = view.input.featureCards;

    assert.isDefined(featureCards);
    assert.lengthOf(featureCards, 0);
  });

  describe('view', () => {
    it('looks fine', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ExploreWidget.DEFAULT_VIEW(
          {
            featureCards: [{
              icon: 'brush-2',
              heading: 'CSS styles',
              jslogContext: 'open-elements-panel',
              onClick: () => {},
              panelName: 'Elements',
              text: 'to ask about CSS styles'
            }]
          },
          {}, target);
      await assertScreenshot('ai_assistance/explore-default.png');
    });
  });
});
