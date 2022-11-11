// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as InspectorMain from '../../../../../front_end/entrypoints/inspector_main/inspector_main.js';
import {
  createTarget,
} from '../../helpers/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('FocusDebuggeeActionDelegate', () => {
  it('uses main frame without tab tatget', async () => {
    const target = createTarget();
    const delegate = InspectorMain.InspectorMain.FocusDebuggeeActionDelegate.instance({forceNew: true});
    const bringToFront = sinon.spy(target.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    assert.isTrue(bringToFront.calledOnce);
  });

  it('uses main frame with tab tatget', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const frameTarget = createTarget({parentTarget: tabTarget});
    const delegate = InspectorMain.InspectorMain.FocusDebuggeeActionDelegate.instance({forceNew: true});
    const bringToFront = sinon.spy(frameTarget.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    assert.isTrue(bringToFront.calledOnce);
  });
});
