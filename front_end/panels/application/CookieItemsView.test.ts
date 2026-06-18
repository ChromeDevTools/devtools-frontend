// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describe('CookieItemsView', () => {
  setupLocaleHooks();

  before(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('ai-assistance.storage-floating-button');
    UI.ActionRegistration.maybeRemoveActionExtension('ai-assistance.application-panel-context');
    UI.ActionRegistration.registerActionExtension({
      actionId: 'ai-assistance.storage-floating-button',
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      title: i18n.i18n.lockedLazyString('Ask AI'),
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'ai-assistance.application-panel-context',
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      title: i18n.i18n.lockedLazyString('Debug with AI'),
      contextTypes() {
        return [AiAssistance.StorageItem.StorageItem];
      },
    });
  });

  afterEach(() => {
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    UI.ActionRegistry.ActionRegistry.removeInstance();
  });

  let universe: TestUniverse;
  let cookieItemsView: Application.CookieItemsView.CookieItemsView;
  let viewFunction: ViewFunctionStub<typeof Application.CookieItemsView.CookieItemsView>;
  let mockCookieModel: sinon.SinonStubbedInstance<SDK.CookieModel.CookieModel>;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);

    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({
      forceNew: true,
      actionRegistry,
    });

    universe.createTarget({url: urlString`http://example.com`}).setInspectedURL(urlString`http://example.com`);
    mockCookieModel = sinon.createStubInstance(SDK.CookieModel.CookieModel);
    mockCookieModel.getCookiesForDomain.resolves([]);

    viewFunction = createViewFunctionStub(Application.CookieItemsView.CookieItemsView);
    cookieItemsView = new Application.CookieItemsView.CookieItemsView(
        mockCookieModel as unknown as SDK.CookieModel.CookieModel, 'example.com', viewFunction);
  });

  it('clicking Ask AI button triggers the action', () => {
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    const action = actionRegistry.getAction('ai-assistance.storage-floating-button');
    const executeStub = sinon.stub(action, 'execute');

    cookieItemsView.performUpdate();

    const dummyEvent = new Event('click');
    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    viewFunction.input.onAiButtonClick?.(cookie, dummyEvent);

    sinon.assert.calledOnce(executeStub);

    executeStub.restore();
  });

  it('populates context menu with Debug with AI submenu and expected items', () => {
    cookieItemsView.performUpdate();

    // Stub UI.Context flavor
    const contextFlavorStub = sinon.stub(UI.Context.Context.instance(), 'flavor');
    const dummyStorageItem = {} as AiAssistance.StorageItem.StorageItem;
    contextFlavorStub.withArgs(AiAssistance.StorageItem.StorageItem).returns(dummyStorageItem);

    const dummyEvent = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(dummyEvent);
    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    viewFunction.input.onPopulateAiContextMenu?.(cookie, contextMenu);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem, 'Expected Debug with AI context menu item');

    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label), ['Start a chat', 'Explain this cookie']);

    contextFlavorStub.restore();
  });

  it('sets StorageItem flavor on select', () => {
    cookieItemsView.performUpdate();

    const cookie = new SDK.Cookie.Cookie('cookie-name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    viewFunction.input.onSelect(cookie);

    const flavor = UI.Context.Context.instance().flavor(AiAssistance.StorageItem.StorageItem);
    assert.exists(flavor);
    assert.instanceOf(flavor, AiAssistance.StorageItem.CookieItem);
    assert.strictEqual((flavor as AiAssistance.StorageItem.CookieItem).name, 'cookie-name');
    assert.strictEqual((flavor as AiAssistance.StorageItem.CookieItem).origin, 'example.com');
  });
});
