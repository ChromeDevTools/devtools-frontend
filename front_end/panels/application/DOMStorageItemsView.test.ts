// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import {describeWithEnvironment, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithEnvironment('DOMStorageItemsView', () => {
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
  setupActionRegistry();

  let domStorageItemsView: Application.DOMStorageItemsView.DOMStorageItemsView;
  let mockDOMStorage: sinon.SinonStubbedInstance<SDK.DOMStorageModel.DOMStorage>;

  beforeEach(() => {
    mockDOMStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockDOMStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockDOMStorage, 'isLocalStorage').get(() => true);
    mockDOMStorage.getItems.resolves([['foo', 'value1']]);

    domStorageItemsView = new Application.DOMStorageItemsView.DOMStorageItemsView(mockDOMStorage as unknown as
                                                                                  SDK.DOMStorageModel.DOMStorage);
  });

  it('populates context menu with Debug with AI submenu and expected items', () => {
    // Stub UI.Context flavor with a valid StorageItem
    const contextFlavorStub = sinon.stub(UI.Context.Context.instance(), 'flavor');
    const dummyStorageItem = {} as AiAssistance.StorageItem.StorageItem;
    contextFlavorStub.withArgs(AiAssistance.StorageItem.StorageItem).returns(dummyStorageItem);

    const dummyEvent = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(dummyEvent);

    domStorageItemsView['populateContextMenu']({key: 'foo', value: 'value1'}, contextMenu);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem, 'Expected Debug with AI context menu item');

    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label), ['Start a chat', 'Explain this item']);
  });

  it('clicking Ask AI button triggers the action', () => {
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    const action = actionRegistry.getAction('ai-assistance.storage-floating-button');
    const executeStub = sinon.stub(action, 'execute');

    const dummyEvent = new Event('click');
    domStorageItemsView['onAiButtonClick']({key: 'foo', value: 'value1'}, dummyEvent);

    sinon.assert.calledOnce(executeStub);
  });
});
