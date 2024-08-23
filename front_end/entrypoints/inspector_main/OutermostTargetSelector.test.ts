// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithMockConnection('OutermostTargetSelector', () => {
  let tabTarget: SDK.Target.Target;
  let primaryTarget: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;
  let selector: InspectorMain.OutermostTargetSelector.OutermostTargetSelector;

  beforeEach(() => {
    tabTarget = createTarget({type: SDK.Target.Type.TAB, url: 'http://example.com/', name: 'tab'});
    primaryTarget = createTarget({parentTarget: tabTarget, url: 'http://example.com/', name: 'primary'});
    prerenderTarget = createTarget(
        {parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender1', name: 'prerender1'});
    selector = InspectorMain.OutermostTargetSelector.OutermostTargetSelector.instance({forceNew: true});
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
    assert.strictEqual(selector.item().element.title, 'Page: primary');
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(selector.item().element.title, 'Page: prerender1');
  });

  it('updates when name changes', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(selector.item().element.title, 'Page: prerender1');
    prerenderTarget.setName('prerender3');

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
    assert.strictEqual(selector.item().element.title, 'Page: primary');
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), subtarget);
  });
});
