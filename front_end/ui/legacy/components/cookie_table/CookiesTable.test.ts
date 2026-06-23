// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../legacy.js';

import * as CookieTable from './cookie_table.js';

type CookiesTableViewFunctionStub = sinon.SinonSpy<[CookieTable.CookiesTable.ViewInput, object, HTMLElement], void>&{
  input: CookieTable.CookiesTable.ViewInput,
};

describe('CookiesTable', () => {
  setupLocaleHooks();

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
});
