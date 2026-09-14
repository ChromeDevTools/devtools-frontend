// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Settings from './settings.js';

const {urlString} = Platform.DevToolsPath;
const {EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW, ExperimentsSettingsTab} = Settings.SettingsScreen;

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
    assert.strictEqual(checkboxes[1].title, 'Beta Experiment (Restart)');
    assert.isTrue(checkboxes[1].checked);

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
  });
});
