// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Animation from '../../../../../front_end/panels/animation/animation.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('AnimationTimeline', () => {
  let target: SDK.Target.Target;
  let view: Animation.AnimationTimeline.AnimationTimeline;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  afterEach(() => {
    view.detach();
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const model = target.model(Animation.AnimationModel.AnimationModel);
    assertNotNullOrUndefined(model);

    view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
    view.markAsRoot();
    view.show(document.body);
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const previewContainer = (view.contentElement.querySelector('.animation-timeline-buffer') as HTMLElement);

    model.animationStarted({
      id: 'id',
      name: 'name',
      pausedState: false,
      playState: 'playState',
      playbackRate: 1,
      startTime: 42,
      currentTime: 43,
      type: Protocol.Animation.AnimationType.CSSAnimation,
      source: {
        backendNodeId: 42 as Protocol.DOM.BackendNodeId,
      } as Protocol.Animation.AnimationEffect,
    });

    assert.strictEqual(previewContainer.querySelectorAll('.animation-buffer-preview').length, inScope ? 1 : 0);
  };

  it('updates UI on in scope animation group start', updatesUiOnEvent(true));
  it('does not update UI on out of scope animation group start', updatesUiOnEvent(false));

  describe('resizing time controls', () => {
    it('updates --timeline-controls-width and calls onResize', async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      view.show(document.body);
      const onResizeStub = sinon.stub(view, 'onResize');
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const resizer = view.contentElement.querySelector('.timeline-controls-resizer');
      assertNotNullOrUndefined(resizer);

      const initialWidth = view.element.style.getPropertyValue('--timeline-controls-width');
      assert.strictEqual(initialWidth, '150px');

      const resizerRect = resizer.getBoundingClientRect();
      resizer.dispatchEvent(
          new PointerEvent('pointerdown', {
            clientX: resizerRect.x + resizerRect.width / 2,
            clientY: resizerRect.y + resizerRect.height / 2,
          }),
      );
      resizer.ownerDocument.dispatchEvent(
          new PointerEvent('pointermove', {
            buttons: 1,
            clientX: (resizerRect.x + resizerRect.width / 2) + 20,
            clientY: resizerRect.y + resizerRect.height / 2,
          }),
      );
      resizer.ownerDocument.dispatchEvent(new PointerEvent('pointerup'));

      const afterResizeWidth = view.element.style.getPropertyValue('--timeline-controls-width');
      assert.notStrictEqual(initialWidth, afterResizeWidth);
      assert.isTrue(onResizeStub.calledOnce);
    });
  });
});
