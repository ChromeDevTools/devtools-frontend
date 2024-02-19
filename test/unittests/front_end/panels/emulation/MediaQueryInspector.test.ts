// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Emulation from '../../../../../front_end/panels/emulation/emulation.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('MediaQueryInspector', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let throttler: Common.Throttler.Throttler;
    let onScheduled: () => void;
    let inspector: Emulation.MediaQueryInspector.MediaQueryInspector;

    beforeEach(() => {
      target = targetFactory();
      throttler = new Common.Throttler.Throttler(0);
      onScheduled = () => {};
      sinon.stub(throttler, 'schedule').callsFake(async (work: () => (Promise<unknown>), _?: boolean) => {
        await work();
        onScheduled();
        return Promise.resolve();
      });
    });

    afterEach(() => {
      inspector.detach();
    });

    it('redners media queries', async () => {
      inspector = new Emulation.MediaQueryInspector.MediaQueryInspector(
          () => 42,
          (_: number) => {},
          throttler,
      );
      inspector.markAsRoot();
      inspector.show(document.body);
      assert.strictEqual(inspector.contentElement.querySelectorAll('.media-inspector-marker').length, 0);

      const cssModel = target.model(SDK.CSSModel.CSSModel);
      assertNotNullOrUndefined(cssModel);
      const CSS_MEDIA = {
        text: 'foo',
        source: Protocol.CSS.CSSMediaSource.MediaRule,
        mediaList: [{expressions: [{value: 42, computedLength: 42, unit: 'UNIT', feature: 'max-width'}], active: true}],
      } as unknown as Protocol.CSS.CSSMedia;
      sinon.stub(cssModel, 'getMediaQueries').resolves([new SDK.CSSMedia.CSSMedia(cssModel, CSS_MEDIA)]);
      cssModel.dispatchEventToListeners(
          SDK.CSSModel.Events.StyleSheetAdded, {} as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
      await new Promise<void>(resolve => {
        onScheduled = resolve;
      });
      assert.strictEqual(inspector.contentElement.querySelectorAll('.media-inspector-marker').length, 1);
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
