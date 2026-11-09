// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../legacy.js';

import * as CookieTable from './cookie_table.js';

type CookiesTableViewFunctionStub = sinon.SinonSpy<[CookieTable.CookiesTable.ViewInput, undefined, HTMLElement], void>&{
  input: CookieTable.CookiesTable.ViewInput,
};

function createViewInput(overrides: Partial<CookieTable.CookiesTable.ViewInput> = {}):
    CookieTable.CookiesTable.ViewInput {
  return {
    data: [],
    onEdit: () => {},
    onCreate: () => {},
    onRefresh: () => {},
    onDelete: () => {},
    onContextMenu: () => {},
    onSelect: () => {},
    ...overrides,
  };
}

function getDataRows(target: HTMLElement): HTMLTableRowElement[] {
  return [...target.querySelectorAll<HTMLTableRowElement>('devtools-data-grid tr')].filter(
      row => row.querySelector('td') !== null);
}

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

  it('passes blocked and exemption reasons to the view as icon titles', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;
    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, undefined, undefined,
                                                                   undefined, undefined, viewFunction);

    const blockedCookie = new SDK.Cookie.Cookie('blocked', 'value');
    const exemptedCookie = new SDK.Cookie.Cookie('exempted', 'value');
    const plainCookie = new SDK.Cookie.Cookie('plain', 'value');
    const cookieToBlockedReasons = new Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>([[
      blockedCookie,
      [
        {uiString: 'First reason', attribute: SDK.Cookie.Attribute.DOMAIN},
        {uiString: 'Second reason', attribute: SDK.Cookie.Attribute.DOMAIN},
        {uiString: 'Name reason', attribute: null},
      ],
    ]]);
    const cookieToExemptionReason = new Map([[exemptedCookie, {uiString: 'Exemption reason'}]]);

    cookiesTable.setCookies([plainCookie, exemptedCookie, blockedCookie], cookieToBlockedReasons,
                            cookieToExemptionReason);
    cookiesTable.performUpdate();

    const [blockedData, exemptedData, plainData] = viewFunction.input.data;
    assert.strictEqual(blockedData.name, 'blocked');
    assert.isTrue(blockedData.flagged);
    assert.deepEqual(blockedData.iconTitles, {domain: 'First reason\nSecond reason', name: 'Name reason'});
    assert.strictEqual(exemptedData.name, 'exempted');
    assert.isTrue(exemptedData.flagged);
    assert.deepEqual(exemptedData.iconTitles, {name: 'Exemption reason'});
    assert.strictEqual(plainData.name, 'plain');
    assert.isUndefined(plainData.flagged);
    assert.isUndefined(plainData.iconTitles);
  });

  it('renders the view into the widget content element', () => {
    const viewFunction =
        createViewFunctionStub(CookieTable.CookiesTable.CookiesTable) as unknown as CookiesTableViewFunctionStub;
    const cookiesTable = new CookieTable.CookiesTable.CookiesTable(undefined, undefined, undefined, undefined,
                                                                   undefined, undefined, viewFunction);

    cookiesTable.performUpdate();

    sinon.assert.calledWith(viewFunction, sinon.match.object, undefined, cookiesTable.contentElement);
    assert.isFalse(cookiesTable.element.classList.contains('cookies-table'));
  });
});

describe('CookiesTable DEFAULT_VIEW', () => {
  setupLocaleHooks();
  setupSettingsHooks();

  it('adds the cookies-table class to the target and renders a row for each cookie', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    CookieTable.CookiesTable.DEFAULT_VIEW(createViewInput({
                                            data: [
                                              {key: 'a', name: 'cookie-a', value: 'value-a'},
                                              {key: 'b', name: 'cookie-b', value: 'value-b'},
                                            ],
                                          }),
                                          undefined, target);

    assert.isTrue(target.classList.contains('cookies-table'));
    const rows = getDataRows(target);
    assert.deepEqual(rows.map(row => row.cells[0].textContent), ['cookie-a', 'cookie-b']);
    assert.deepEqual(rows.map(row => row.cells[1].textContent), ['value-a', 'value-b']);
  });

  it('renders an info icon with the icon title for flagged attributes', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    CookieTable.CookiesTable.DEFAULT_VIEW(createViewInput({
                                            data: [{
                                              key: 'a',
                                              name: 'cookie-a',
                                              value: 'value-a',
                                              domain: 'example.com',
                                              flagged: true,
                                              iconTitles: {domain: 'Blocked because of the domain'},
                                            }],
                                          }),
                                          undefined, target);

    const [row] = getDataRows(target);
    assert.isTrue(row.hasAttribute('highlighted'));
    assert.isNull(row.cells[0].querySelector('devtools-icon'));
    const icon = row.cells[2].querySelector('devtools-icon');
    assert.isNotNull(icon);
    assert.strictEqual(icon.getAttribute('name'), 'info');
    assert.isTrue(icon.classList.contains('small'));
    assert.strictEqual(icon.title, 'Blocked because of the domain');
    assert.strictEqual(row.cells[2].textContent, 'example.com');
  });

  it('renders the AI button when enabled', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    CookieTable.CookiesTable.DEFAULT_VIEW(createViewInput({
                                            data: [{key: 'a', name: 'cookie-a', value: 'value-a'}],
                                            showAiButton: true,
                                          }),
                                          undefined, target);

    const button = getDataRows(target)[0].cells[0].querySelector('devtools-floating-button');
    assert.isNotNull(button);
    assert.strictEqual(button.getAttribute('icon-name'), 'smart-assistant');
  });
});
