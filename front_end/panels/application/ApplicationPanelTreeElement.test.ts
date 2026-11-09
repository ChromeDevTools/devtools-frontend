// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describe('ExpandableApplicationPanelTreeElement', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let panel: sinon.SinonStubbedInstance<Application.ResourcesPanel.ResourcesPanel>;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);

    const connection = new MockCDPConnection();
    target = universe.createTarget({url: urlString`https://example.com/page`, connection});
    target.setInspectedURL(urlString`https://example.com/page`);
    universe.targetManager.setScopeTarget(target);
    panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);
    UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, null);
  });

  afterEach(() => {
    UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, null);
  });

  function createLocalStorageCategory(origins: string[]): {
    treeOutline: UI.TreeOutline.TreeOutlineInShadow,
    category: Application.ApplicationPanelTreeElement.ExpandableApplicationPanelTreeElement,
    children: Application.ApplicationPanelSidebar.DOMStorageTreeElement[],
  } {
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    const category = new Application.ApplicationPanelTreeElement.ExpandableApplicationPanelTreeElement(
        panel, 'Local storage', 'No local storage', 'Local storage description', 'local-storage');
    treeOutline.appendChild(category);

    const children = origins.map(origin => {
      const domStorage = new SDK.DOMStorageModel.DOMStorage(domStorageModel, `${origin}/`, true);
      const child = new Application.ApplicationPanelSidebar.DOMStorageTreeElement(panel, domStorage);
      category.appendChild(child);
      return child;
    });

    return {treeOutline, category, children};
  }

  it('expands and selects the main-origin child when user-selected from a collapsed state', () => {
    const {treeOutline, category, children} =
        createLocalStorageCategory(['https://ads.third-party.test', 'https://example.com', 'https://cdn.example.org']);
    assert.isFalse(category.expanded);

    category.select(/* omitFocus= */ false, /* selectedByUser= */ true);

    assert.isTrue(category.expanded);
    assert.isTrue(universe.settings.createSetting('resources-local-storage-expanded', false).get());
    assert.strictEqual(treeOutline.selectedTreeElement, children[1]);
    sinon.assert.notCalled(panel.showCategoryView);
    sinon.assert.calledOnce(panel.showDOMStorage);
    assert.deepEqual(panel.setLastSelectedItemPath.lastCall?.args[0], [
      urlString`storage://https://example.com//local`,
      urlString`category://Local storage`,
    ]);

    const flavor = UI.Context.Context.instance().flavor(AiAssistance.StorageItem.StorageItem);
    assert.instanceOf(flavor, AiAssistance.StorageItem.DOMStorageItem);
    assert.strictEqual(flavor.origin, 'https://example.com');
    assert.isFalse(flavor.isGenericContext);
  });

  it('selects the sole child when no child matches the primary target origin', () => {
    const {treeOutline, category, children} = createLocalStorageCategory(['https://sub.third-party.test']);

    category.select(false, true);

    assert.isTrue(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, children[0]);
    sinon.assert.notCalled(panel.showCategoryView);
    sinon.assert.calledOnce(panel.showDOMStorage);
  });

  it('expands and shows the category view when multiple non-matching origins are present', () => {
    const {treeOutline, category} =
        createLocalStorageCategory(['https://ads.third-party.test', 'https://cdn.example.org']);

    category.select(false, true);

    assert.isTrue(category.expanded);
    assert.isTrue(universe.settings.createSetting('resources-local-storage-expanded', false).get());
    assert.strictEqual(treeOutline.selectedTreeElement, category);
    sinon.assert.calledOnceWithExactly(panel.showCategoryView, 'Local storage', 'Local storage',
                                       'Local storage description', null);
    sinon.assert.notCalled(panel.showDOMStorage);
  });

  it('selects the main-origin child when clicking an already-expanded category from outside', () => {
    const {treeOutline, category, children} =
        createLocalStorageCategory(['https://ads.third-party.test', 'https://example.com']);
    category.expand();
    assert.isTrue(category.expanded);

    const sibling =
        new Application.ApplicationPanelTreeElement.ApplicationPanelTreeElement(panel, 'Manifest', false, 'manifest');
    sibling.itemURL = urlString`manifest://example`;
    treeOutline.insertChild(sibling, 0);
    sibling.select(false, true);
    panel.showCategoryView.resetHistory();
    panel.showDOMStorage.resetHistory();

    category.select(false, true);

    assert.isTrue(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, children[1]);
    sinon.assert.notCalled(panel.showCategoryView);
    sinon.assert.calledOnce(panel.showDOMStorage);
  });

  it('keeps the category selected when navigating up from a selected child', () => {
    const {treeOutline, category, children} = createLocalStorageCategory(['https://example.com']);
    category.expand();
    children[0].select(false, true);
    panel.showDOMStorage.resetHistory();

    category.select(false, true);

    assert.isTrue(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, category);
    sinon.assert.calledOnceWithExactly(panel.showCategoryView, 'Local storage', 'Local storage',
                                       'Local storage description', null);
    sinon.assert.notCalled(panel.showDOMStorage);
  });

  it('keeps the category selected and collapsed when collapsed while a child is selected', () => {
    const {treeOutline, category, children} = createLocalStorageCategory(['https://example.com']);
    category.expand();
    children[0].select(false, true);
    panel.showDOMStorage.resetHistory();

    category.collapse();

    assert.isFalse(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, category);
    sinon.assert.calledOnceWithExactly(panel.showCategoryView, 'Local storage', 'Local storage',
                                       'Local storage description', null);
    sinon.assert.notCalled(panel.showDOMStorage);
  });

  it('re-expands and selects the child when clicking a collapsed, already-selected category', () => {
    const {treeOutline, category, children} = createLocalStorageCategory(['https://example.com']);
    category.expand();
    children[0].select(false, true);
    category.collapse();
    panel.showDOMStorage.resetHistory();

    category.select(false, true);

    assert.isTrue(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, children[0]);
    sinon.assert.calledOnce(panel.showDOMStorage);
  });

  it('does not auto-expand or select a child on programmatic selection', () => {
    const {treeOutline, category} = createLocalStorageCategory(['https://example.com']);

    category.select();

    assert.isFalse(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, category);
    sinon.assert.calledOnceWithExactly(panel.showCategoryView, 'Local storage', 'Local storage',
                                       'Local storage description', null);
    sinon.assert.notCalled(panel.showDOMStorage);
  });

  it('keeps an empty storage category selected and shows the empty headline', () => {
    const {treeOutline, category} = createLocalStorageCategory([]);

    category.select(false, true);

    assert.isFalse(category.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, category);
    sinon.assert.calledOnceWithExactly(panel.showCategoryView, 'Local storage', 'No local storage',
                                       'Local storage description', null);
  });

  it('matches unreachable main-frame origin for Cookies when the main document failed to load', () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    frame.resourceTreeModel.returns(resourceTreeModel);
    frame.unreachableUrl.returns(urlString`https://offline.example.test/error`);
    resourceTreeModel.mainFrame = frame;
    target.setInspectedURL(urlString`chrome-error://chromewebdata/`);

    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    const cookiesCategory = new Application.ApplicationPanelTreeElement.ExpandableApplicationPanelTreeElement(
        panel, 'Cookies', 'No cookies', 'Cookies description', 'cookies');
    treeOutline.appendChild(cookiesCategory);

    const thirdPartyCookie = new Application.ApplicationPanelSidebar.CookieTreeElement(
        panel, frame, new Common.ParsedURL.ParsedURL('https://ads.third-party.test/'));
    const unreachableCookie = new Application.ApplicationPanelSidebar.CookieTreeElement(
        panel, frame, new Common.ParsedURL.ParsedURL('https://offline.example.test/error'));
    cookiesCategory.appendChild(thirdPartyCookie);
    cookiesCategory.appendChild(unreachableCookie);

    cookiesCategory.select(false, true);

    assert.isTrue(cookiesCategory.expanded);
    assert.strictEqual(treeOutline.selectedTreeElement, unreachableCookie);
    sinon.assert.calledOnceWithExactly(panel.showCookies, target, 'https://offline.example.test');
  });
});
