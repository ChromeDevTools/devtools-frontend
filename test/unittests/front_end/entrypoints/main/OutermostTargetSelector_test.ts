// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Main from '../../../../../front_end/entrypoints/main/main.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {
  createTarget,
} from '../../helpers/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('OutermostTargetSelector', () => {
  let tabTarget: SDK.Target.Target;
  let primaryTarget: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;
  let selector: Main.OutermostTargetSelector.OutermostTargetSelector;

  beforeEach(() => {
    tabTarget = createTarget({type: SDK.Target.Type.Tab});
    primaryTarget = createTarget({parentTarget: tabTarget});
    prerenderTarget =
        createTarget({parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender1'});
    selector = Main.OutermostTargetSelector.OutermostTargetSelector.instance({forceNew: true});
  });

  it('creates drop-down with outermost targets', () => {
    assert.deepEqual([...selector.listItems], [primaryTarget, prerenderTarget]);

    createTarget({parentTarget: primaryTarget});
    assert.deepEqual([...selector.listItems], [primaryTarget, prerenderTarget]);

    const prerenderTarget2 =
        createTarget({parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender2'});
    assert.deepEqual([...selector.listItems], [primaryTarget, prerenderTarget, prerenderTarget2]);

    prerenderTarget.dispose('');
    assert.deepEqual([...selector.listItems], [primaryTarget, prerenderTarget2]);
  });

  it('hides when only one target is present', () => {
    assert.isTrue(selector.item().visible());
    prerenderTarget.dispose('');
    assert.isFalse(selector.item().visible());
  });

  it('updates selected target when UI context flavor changes', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, primaryTarget);
    assert.strictEqual(selector.item().element.title, 'Page: Main');
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(selector.item().element.title, 'Page: prerender1');
  });

  it('updates when target info changes', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(selector.item().element.title, 'Page: prerender1');
    const newTargetInfo = {
      targetId: prerenderTarget.id() as Protocol.Target.TargetID,
      type: 'frame',
      url: 'https://example.com/prerender3',
      title: '',
      attached: true,
      canAccessOpener: true,
    };
    prerenderTarget.updateTargetInfo(newTargetInfo);
    tabTarget.model(SDK.ChildTargetManager.ChildTargetManager)
        ?.dispatchEventToListeners(SDK.ChildTargetManager.Events.TargetInfoChanged, newTargetInfo);

    assert.strictEqual(selector.item().element.title, 'Page: prerender3');
  });

  it('updates UI context flavor on selection', () => {
    selector.itemSelected(primaryTarget);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), primaryTarget);
    selector.itemSelected(prerenderTarget);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), prerenderTarget);
  });

  it('does not change UI context flavor within the same page', () => {
    const subtarget = createTarget({parentTarget: primaryTarget});
    selector.itemSelected(primaryTarget);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), primaryTarget);
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, subtarget);
    assert.strictEqual(selector.item().element.title, 'Page: Main');
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), subtarget);
  });
});
