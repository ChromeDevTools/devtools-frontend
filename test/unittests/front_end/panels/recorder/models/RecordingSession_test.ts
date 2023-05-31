// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import {describeWithRealConnection} from '../../../helpers/RealConnection.js';

describeWithRealConnection('RecordingSession', () => {
  it('should call setPrerenderingAllowed before and after recording', async () => {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assertNotNullOrUndefined(target);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    resourceTreeModel.mainFrame = {
      url: 'https://www.example.com/',
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    const setPrerenderingAllowedStub =
        sinon.stub(target.pageAgent(), 'invoke_setPrerenderingAllowed').resolves(undefined);

    const session = new Models.RecordingSession.RecordingSession(target, {
      title: 'test',
      selectorTypesToRecord: [Models.Schema.SelectorType.CSS],
    });
    await session.start();
    await session.stop();

    assert.deepStrictEqual(setPrerenderingAllowedStub.getCalls().map(call => call.args[0]), [
      {
        isAllowed: false,
      },
      {isAllowed: true},
    ] as unknown[]);
  });
});
