// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../legacy.js';

import * as CookieTable from './cookie_table.js';

type CookiesTableViewFunctionStub = sinon.SinonSpy<[CookieTable.CookiesTable.ViewInput, object, HTMLElement], void>&{
  input: CookieTable.CookiesTable.ViewInput,
};

describe('CookiesTable', () => {
  setupLocaleHooks();

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
  });

  it('clicking Ask AI button calls the onAiButtonClick delegate', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;
    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, undefined, undefined,
                                                                   undefined, undefined, viewFunction);
    cookiesTable.aiButtonIsEnabled = true;

    const onAiButtonClickStub = sinon.stub();
    cookiesTable.onAiButtonClick = onAiButtonClickStub;

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const dummyEvent = new Event('click');
    viewFunction.input.onAiButtonClick?.({key: cookie.key(), name: 'cookie-name', value: 'value'}, dummyEvent);

    sinon.assert.calledOnceWithExactly(onAiButtonClickStub, cookie, dummyEvent);
  });

  it('populates context menu calls the onPopulateAiContextMenu delegate', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;
    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(
        undefined, undefined, undefined, undefined, undefined, undefined, viewFunction);
    cookiesTable.aiButtonIsEnabled = true;

    const onPopulateAiContextMenuStub = sinon.stub();
    cookiesTable.onPopulateAiContextMenu = onPopulateAiContextMenuStub;

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const dummyEvent = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(dummyEvent);
    const cookieData = {
      key: cookie.key(),
      name: cookie.name(),
      value: cookie.value(),
    };

    viewFunction.input.onContextMenu?.(cookieData, contextMenu);

    sinon.assert.calledOnceWithExactly(onPopulateAiContextMenuStub, cookie, contextMenu);
  });

  it('unsetting httpOnly and secure flags persists in the saved cookie', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;

    const saveCookieStub = sinon.stub().resolves(true);

    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, saveCookieStub, undefined,
                                                                   undefined, undefined, viewFunction);

    // Create a cookie with httpOnly and secure set to true
    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);
    cookie.addAttribute(SDK.Cookie.Attribute.SECURE);

    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const cookieData = viewFunction.input.data[0];

    viewFunction.input.onEdit(cookieData, SDK.Cookie.Attribute.HTTP_ONLY, true, false);

    // Assert saveCallback was called with a cookie that does NOT have httpOnly, but still has secure
    sinon.assert.calledOnceWithExactly(saveCookieStub,
                                       sinon.match((c: SDK.Cookie.Cookie) => !c.httpOnly() && c.secure()), cookie);

    saveCookieStub.resetHistory();

    viewFunction.input.onEdit(cookieData, SDK.Cookie.Attribute.SECURE, true, false);

    // Assert saveCallback was called with a cookie that does NOT have secure, but still has httpOnly
    // (since cookieData we passed still has http-only: 'true')
    sinon.assert.calledOnceWithExactly(saveCookieStub,
                                       sinon.match((c: SDK.Cookie.Cookie) => c.httpOnly() && !c.secure()), cookie);
  });

  it('setting httpOnly and secure flags with boolean values persists in the saved cookie', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;

    const saveCookieStub = sinon.stub().resolves(true);

    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, saveCookieStub, undefined,
                                                                   undefined, undefined, viewFunction);

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');

    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const cookieData = viewFunction.input.data[0];

    // Trigger edit for httpOnly with boolean true (simulating UI click)
    viewFunction.input.onEdit(cookieData, SDK.Cookie.Attribute.HTTP_ONLY, false, true);

    sinon.assert.calledOnceWithExactly(saveCookieStub, sinon.match((c: SDK.Cookie.Cookie) => c.httpOnly()), cookie);
  });

  it('setting hasCrossSiteAncestor flag with boolean values persists in the saved cookie', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;

    const saveCookieStub = sinon.stub().resolves(true);

    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, saveCookieStub, undefined,
                                                                   undefined, undefined, viewFunction);

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookie.setPartitionKey('https://example.com', false);

    cookiesTable.setCookies([cookie]);
    cookiesTable.performUpdate();

    const cookieData = viewFunction.input.data[0];

    // Trigger edit for hasCrossSiteAncestor with boolean true
    viewFunction.input.onEdit(cookieData, SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR, false, true);

    sinon.assert.calledOnceWithExactly(saveCookieStub, sinon.match((c: SDK.Cookie.Cookie) => c.hasCrossSiteAncestor()),
                                       cookie);
  });
});
