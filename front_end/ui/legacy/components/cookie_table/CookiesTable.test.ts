// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import {describeWithEnvironment, setupActionRegistry} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../legacy.js';

import * as CookieTable from './cookie_table.js';

type CookiesTableViewFunctionStub = sinon.SinonSpy<[CookieTable.CookiesTable.ViewInput, object, HTMLElement], void>&{
  input: CookieTable.CookiesTable.ViewInput,
};

describeWithEnvironment('CookiesTable', () => {
  before(() => {
    UI.ActionRegistration.registerActionExtension({
      actionId: 'ai-assistance.storage-floating-button',
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      title: i18n.i18n.lockedLazyString('Ask AI'),
    });
  });
  setupActionRegistry();

  it('clicking Ask AI button triggers the action', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;
    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(
        undefined, undefined, undefined, undefined, undefined, undefined, viewFunction);
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    const action = actionRegistry.getAction('ai-assistance.storage-floating-button');
    const executeStub = sinon.stub(action, 'execute');

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const dummyEvent = new Event('click');
    viewFunction.input.onAiButtonClick?.({name: 'cookie-name', value: 'value'}, dummyEvent);

    sinon.assert.calledOnce(executeStub);
    executeStub.restore();
  });
});
