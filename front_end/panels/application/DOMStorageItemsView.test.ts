// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, before, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import {deinitializeGlobalVars, initializeGlobalVars, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describe('DOMStorageItemsView', () => {
  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  beforeEach(() => {
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
    UI.ActionRegistry.ActionRegistry.removeInstance();
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

  it('populates context menu with Debug with AI item', () => {
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(urlString`https://example.com/`);
    sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(target);

    const dummyEvent = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(dummyEvent);

    domStorageItemsView['populateContextMenu']({key: 'foo', value: 'value1'}, contextMenu);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem, 'Expected Debug with AI context menu item');

    assert.isUndefined(debugWithAiItem?.subItems);

    const flavor = UI.Context.Context.instance().flavor(AiAssistance.StorageItem.StorageItem);
    assert.exists(flavor);
    assert.instanceOf(flavor, AiAssistance.StorageItem.DOMStorageItem);
  });

  it('omits Debug with AI item when action is not registered', () => {
    sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
        .withArgs('ai-assistance.application-panel-context')
        .returns(false);

    const dummyEvent = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(dummyEvent);

    domStorageItemsView['populateContextMenu']({key: 'foo', value: 'value1'}, contextMenu);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.isUndefined(debugWithAiItem);
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
