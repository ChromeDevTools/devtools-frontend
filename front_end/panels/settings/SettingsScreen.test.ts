// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import {renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Settings from './settings.js';

const {urlString} = Platform.DevToolsPath;
const {EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW, ExperimentsSettingsTab} = Settings.SettingsScreen;

describe('SettingsScreen', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  const tabIds = ['preferences', 'keybinds'] as const;

  function setup() {
    const tabLinks = new Map<string, HTMLAnchorElement>();
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    const zoomManager = sinon.createStubInstance(UI.ZoomManager.ZoomManager);
    zoomManager.zoomFactor.returns(1);
    zoomManager.cssToDIP.callsFake(value => value);
    zoomManager.dipToCSS.callsFake(value => value);
    sinon.stub(UI.ZoomManager.ZoomManager, 'instance').returns(zoomManager);
    sinon.stub(UI.DockController.DockController, 'instance').returns(new UI.DockController.DockController(false));
    sinon.stub(UI.UIUserMetrics.UIUserMetrics, 'instance').returns(new UI.UIUserMetrics.UIUserMetrics());

    for (const id of tabIds) {
      UI.ViewManager.registerViewExtension({
        id,
        location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
        title: () => i18n.i18n.lockedString(id),
        commandPrompt: () => i18n.i18n.lockedString(id),
        async loadView() {
          const widget = new UI.Widget.Widget();
          const link = document.createElement('a');
          link.href = 'https://example.com/';
          link.textContent = 'Learn more';
          tabLinks.set(id, link);
          widget.contentElement.appendChild(link);
          widget.setDefaultFocusedElement(link);
          return widget;
        },
      });
    }
    UI.ViewManager.ViewManager.instance({forceNew: true, universe});
    Settings.SettingsScreen.SettingsScreen.instance({forceNew: true});
    return {tabLinks};
  }

  afterEach(() => {
    Settings.SettingsScreen.SettingsScreen.removeInstanceForTesting();
    UI.InspectorView.InspectorView.removeInstance();
    UI.ViewManager.ViewManager.removeInstance();
    UI.ViewManager.resetViewRegistration();
  });

  it('exposes settings tabs in a named non-modal dialog', async () => {
    const {tabLinks} = setup();
    for (const name of tabIds) {
      await Settings.SettingsScreen.SettingsScreen.showSettingsScreen({name, focusTabHeader: true});

      const dialog = UI.Dialog.Dialog.getInstance();
      assert.exists(dialog);
      assert.isTrue(dialog.isShowing());
      assert.strictEqual(dialog.contentElement.getAttribute('role'), 'dialog');
      assert.strictEqual(dialog.contentElement.getAttribute('aria-label'), 'Settings');
      assert.isNull(dialog.contentElement.getAttribute('aria-modal'));

      const focusedTab = UI.DOMUtilities.deepActiveElement(document);
      assert.exists(focusedTab);
      assert.strictEqual(focusedTab.getAttribute('role'), 'tab');
      assert.strictEqual(focusedTab.getAttribute('aria-selected'), 'true');
      assert.strictEqual(focusedTab.getAttribute('aria-label'), name);

      await Settings.SettingsScreen.SettingsScreen.showSettingsScreen({name});
      const focusedControl = UI.DOMUtilities.deepActiveElement(document);
      const expectedLink = tabLinks.get(name);
      assert.exists(expectedLink);
      assert.strictEqual(focusedControl, expectedLink);
    }
  });

  it('preserves modal semantics for dialogs stacked over settings', async () => {
    setup();
    await Settings.SettingsScreen.SettingsScreen.showSettingsScreen();
    const settingsDialog = UI.Dialog.Dialog.getInstance();
    assert.exists(settingsDialog);

    const modalDialog = new UI.Dialog.Dialog();
    modalDialog.show(undefined, true);

    assert.strictEqual(modalDialog.contentElement.getAttribute('role'), 'dialog');
    assert.strictEqual(modalDialog.contentElement.getAttribute('aria-modal'), 'true');
    assert.isTrue(settingsDialog.isShowing());

    modalDialog.hide();
    assert.strictEqual(UI.Dialog.Dialog.getInstance(), settingsDialog);
  });

  it('closes on Escape and restores focus', async () => {
    setup();
    const opener = document.createElement('button');
    renderElementIntoDOM(opener);
    opener.focus();

    await Settings.SettingsScreen.SettingsScreen.showSettingsScreen({focusTabHeader: true});
    const dialog = UI.Dialog.Dialog.getInstance();
    assert.exists(dialog);

    dialog.contentElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: UI.KeyboardShortcut.Keys.Esc.code,
      bubbles: true,
      composed: true,
    }));

    assert.isFalse(dialog.isShowing());
    assert.isFalse(UI.Dialog.Dialog.hasInstance());
    assert.strictEqual(UI.DOMUtilities.deepActiveElement(document), opener);
  });
});

function setupExperiments() {
  Root.Runtime.experiments.clearForTest();
  const expAlpha = Root.Runtime.experiments.register({
    name: 'alpha' as Root.ExperimentNames.ExperimentName,
    title: 'Alpha Experiment',
    aboutFlag: 'alpha-flag',
    isEnabled: false,
    requiresChromeRestart: false,
    docLink: urlString`https://example.com/alpha-doc`,
    feedbackLink: urlString`https://example.com/alpha-feedback`,
  });
  const expBeta = Root.Runtime.experiments.register({
    name: 'beta' as Root.ExperimentNames.ExperimentName,
    title: 'Beta Experiment (Restart)',
    aboutFlag: 'beta-flag',
    isEnabled: true,
    requiresChromeRestart: true,
  });
  return {expAlpha, expBeta};
}

describeWithEnvironment('ExperimentsSettingsTab presenter', () => {
  it('renders configurable experiments sorted alphabetically and sets context flavor', async () => {
    const {expAlpha, expBeta} = setupExperiments();
    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    assert.strictEqual(view.input.filterText, '');
    assert.deepEqual(view.input.experiments, [expAlpha, expBeta]);
    assert.strictEqual(UI.Context.Context.instance().flavor(ExperimentsSettingsTab), widget);

    widget.detach();
    assert.isNull(UI.Context.Context.instance().flavor(ExperimentsSettingsTab));
  });

  it('filters experiments based on search query and announces results', async () => {
    const {expAlpha} = setupExperiments();
    const alertSpy = sinon.spy(UI.ARIAUtils.LiveAnnouncer, 'alert');
    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    view.input.onFilterChanged('alpha');
    await view.nextInput;

    assert.strictEqual(view.input.filterText, 'alpha');
    assert.deepEqual(view.input.experiments, [expAlpha]);
    sinon.assert.calledWith(alertSpy, sinon.match(/1 experiment found/i));

    view.input.onFilterChanged('gamma');
    await view.nextInput;

    assert.strictEqual(view.input.filterText, 'gamma');
    assert.deepEqual(view.input.experiments, []);
    sinon.assert.calledWith(alertSpy, sinon.match(/no experiments match/i));

    alertSpy.resetHistory();
    view.input.onExperimentToggled(expAlpha, true);
    await view.nextInput;
    sinon.assert.notCalled(alertSpy);
  });

  it('toggling experiment with reload displays reload required warning', async () => {
    const {expAlpha} = setupExperiments();
    const setChromeFlagStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setChromeFlag');
    const experimentChangedStub = sinon.stub(Host.userMetrics, 'experimentChanged');
    const reloadWarningStub = sinon.stub(UI.InspectorView.InspectorView.instance(), 'displayReloadRequiredWarning');
    const restartWarningStub =
        sinon.stub(UI.InspectorView.InspectorView.instance(), 'displayChromeRestartRequiredWarning');

    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    view.input.onExperimentToggled(expAlpha, true);
    await view.nextInput;

    sinon.assert.calledWith(setChromeFlagStub, 'alpha-flag', true);
    assert.isTrue(expAlpha.isEnabled());
    sinon.assert.calledWith(experimentChangedStub, 'alpha', true);
    sinon.assert.calledOnce(reloadWarningStub);
    sinon.assert.notCalled(restartWarningStub);
  });

  it('toggling experiment with restart displays chrome restart required warning', async () => {
    const {expBeta} = setupExperiments();
    const setChromeFlagStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setChromeFlag');
    const experimentChangedStub = sinon.stub(Host.userMetrics, 'experimentChanged');
    const reloadWarningStub = sinon.stub(UI.InspectorView.InspectorView.instance(), 'displayReloadRequiredWarning');
    const restartWarningStub =
        sinon.stub(UI.InspectorView.InspectorView.instance(), 'displayChromeRestartRequiredWarning');

    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    view.input.onExperimentToggled(expBeta, false);
    await view.nextInput;

    sinon.assert.calledWith(setChromeFlagStub, 'beta-flag', false);
    assert.isFalse(expBeta.isEnabled());
    sinon.assert.calledWith(experimentChangedStub, 'beta', false);
    sinon.assert.calledOnce(restartWarningStub);
    sinon.assert.notCalled(reloadWarningStub);
  });

  it('opens documentation in a new tab', async () => {
    setupExperiments();
    const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');

    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    const url = urlString`https://example.com/alpha-doc`;
    view.input.onOpenDocumentation(url);

    sinon.assert.calledWith(openInNewTabStub, url);
  });

  it('highlights experiment element on highlightObject', async () => {
    const {expAlpha} = setupExperiments();
    const highlightStub = sinon.stub(PanelUtils.PanelUtils, 'highlightElement');

    const view = createViewFunctionStub(ExperimentsSettingsTab);
    const widget = new ExperimentsSettingsTab(undefined, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    const output = view.lastCall.args[1];
    const mockElement = document.createElement('div');
    output.setExperimentElement(expAlpha, mockElement);

    widget.highlightObject(expAlpha);

    sinon.assert.calledWith(highlightStub, mockElement);
  });
});

describeWithEnvironment('ExperimentsSettingsTab default view', () => {
  it('renders "no results" state when experiments list is empty', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW(
        {
          filterText: 'xyz',
          experiments: [],
          onFilterChanged: () => {},
          onExperimentToggled: () => {},
          onOpenDocumentation: () => {},
        },
        {
          setExperimentElement: () => {},
        },
        target,
    );

    const card = target.querySelector('devtools-card');
    assert.isNotNull(card);
    assert.strictEqual(card.getAttribute('heading'), 'Experiments');
    assert.include(target.textContent, 'No experiments match the filter');
    assert.isNull(target.querySelector('.settings-experiments-block'));
  });

  it('renders experiments with warning, checkboxes, doc button, and feedback link', () => {
    const {expAlpha, expBeta} = setupExperiments();
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    const onFilterChanged = sinon.spy();
    const onExperimentToggled = sinon.spy();
    const onOpenDocumentation = sinon.spy();
    const setExperimentElement = sinon.spy();

    EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW(
        {
          filterText: '',
          experiments: [expAlpha, expBeta],
          onFilterChanged,
          onExperimentToggled,
          onOpenDocumentation,
        },
        {
          setExperimentElement,
        },
        target,
    );

    // Warning section exists
    assert.isNotNull(target.querySelector('.experiments-warning-subsection'));
    assert.include(target.textContent, 'Warning: These experiments could be unstable or unreliable');

    // Filter input triggers onFilterChanged
    const filterInput = target.querySelector('devtools-toolbar-input');
    assert.isNotNull(filterInput);
    filterInput.dispatchEvent(new CustomEvent('change', {detail: 'test query'}));
    sinon.assert.calledWith(onFilterChanged, 'test query');

    // Checkboxes render correct state
    const checkboxes = target.querySelectorAll<UI.UIUtils.CheckboxLabel>('devtools-checkbox');
    assert.lengthOf(checkboxes, 2);
    assert.strictEqual(checkboxes[0].title, 'Alpha Experiment');
    assert.isFalse(checkboxes[0].checked);
    assert.strictEqual(checkboxes[0].jslogContext, 'alpha');
    assert.strictEqual(checkboxes[0].shadowRoot?.querySelector('input')?.getAttribute('jslog'),
                       'Toggle; track: change; context: alpha');
    assert.strictEqual(checkboxes[1].title, 'Beta Experiment (Restart)');
    assert.isTrue(checkboxes[1].checked);
    assert.strictEqual(checkboxes[1].jslogContext, 'beta');
    assert.strictEqual(checkboxes[1].shadowRoot?.querySelector('input')?.getAttribute('jslog'),
                       'Toggle; track: change; context: beta');

    // Clicking checkbox triggers onExperimentToggled
    const input0 = checkboxes[0].shadowRoot?.querySelector('input');
    assert.exists(input0);
    input0.click();
    sinon.assert.calledWith(onExperimentToggled, expAlpha, true);

    // Doc button triggers onOpenDocumentation
    const docButton = target.querySelector('.link-icon');
    assert.isNotNull(docButton);
    (docButton as HTMLElement).click();
    sinon.assert.calledWith(onOpenDocumentation, expAlpha.docLink);

    // Feedback link renders correctly
    const feedbackLink = target.querySelector('.feedback-link');
    assert.isNotNull(feedbackLink);
    assert.strictEqual(feedbackLink.getAttribute('href'), expAlpha.feedbackLink);
    assert.include(feedbackLink.textContent, 'Send feedback');

    // Verify output.setExperimentElement was called for each experiment
    sinon.assert.callCount(setExperimentElement, 2);
    sinon.assert.calledWith(setExperimentElement, expAlpha, sinon.match.any);
    sinon.assert.calledWith(setExperimentElement, expBeta, sinon.match.any);

    // Re-rendering a filtered list keeps the DOM node keyed to the matching experiment.
    const betaCheckbox = checkboxes[1];
    EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW(
        {
          filterText: 'beta',
          experiments: [expBeta],
          onFilterChanged,
          onExperimentToggled,
          onOpenDocumentation,
        },
        {
          setExperimentElement,
        },
        target,
    );
    const filteredCheckboxes = target.querySelectorAll<UI.UIUtils.CheckboxLabel>('devtools-checkbox');
    assert.lengthOf(filteredCheckboxes, 1);
    assert.strictEqual(filteredCheckboxes[0], betaCheckbox);
  });
});
