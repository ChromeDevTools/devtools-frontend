// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithMockConnection('LighthousePanel', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let target: SDK.Target.Target;
  let resourceTreeModelNavigate: sinon.SinonStub;
  let protocolService: LighthouseModule.LighthouseProtocolService.ProtocolService;
  let controller: LighthouseModule.LighthouseController.LighthouseController;

  const URL = 'http://example.com';
  const LH_REPORT = {
    lhr: {
      finalDisplayedUrl: URL,
      configSettings: {},
      audits: {},
      categories: {_: {auditRefs: [], id: ''}},
      lighthouseVersion: '',
      userAgent: '',
      fetchTime: 0,
      environment: {benchmarkIndex: 0},
      i18n: {rendererFormattedStrings: {}},
    },
  } as unknown as LighthouseModule.LighthouseReporterTypes.RunnerResult;

  beforeEach(async () => {
    stubNoopSettings();
    Lighthouse = await import('./lighthouse.js');
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    sinon.stub(target.pageAgent(), 'invoke_getNavigationHistory').resolves({
      currentIndex: 0,
      entries: [{url: URL}],
      getError: () => null,
    } as unknown as Protocol.Page.GetNavigationHistoryResponse);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModelNavigate = sinon.stub(resourceTreeModel, 'navigate').resolves();
    sinon.stub(resourceTreeModel, 'addEventListener')
        .callThrough()
        .withArgs(SDK.ResourceTreeModel.Events.Load, sinon.match.any)
        .callsArgWithAsync(1, {resourceTreeModel, loadTime: 0})
        .returns({} as Common.EventTarget.EventDescriptor);

    protocolService = new Lighthouse.LighthouseProtocolService.ProtocolService();
    sinon.stub(protocolService, 'attach').resolves();
    sinon.stub(protocolService, 'detach').resolves();
    sinon.stub(protocolService, 'collectLighthouseResults').resolves(LH_REPORT);

    controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);
    sinon.stub(controller, 'getFlags').returns({formFactor: 'desktop', mode: 'navigation'});
  });

  // Failing due to StartView not finding settings title.
  it('restores the original URL when done', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    void instance.handleCompleteRun();

    await new Promise<void>(resolve => resourceTreeModelNavigate.withArgs(URL).callsFake(() => {
      resolve();
      return Promise.resolve();
    }));
  });

  // Failing due to StartView not finding settings title.
  it('waits for main target to load before linkifying', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    void instance.handleCompleteRun();

    await new Promise<void>(
        resolve => sinon.stub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'linkifyNodeDetails')
                       .callsFake((_: Element) => {
                         resolve();
                         return Promise.resolve();
                       }));
  });
});
