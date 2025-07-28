// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import * as Root from '../../../../core/root/root.js';
import * as Trace from '../../../../models/trace/trace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';

import * as Insights from './insights.js';

const {html} = Lit;

describeWithEnvironment('BaseInsightComponent', () => {
  const {BaseInsightComponent} = Insights.BaseInsightComponent;
  class TestInsightComponentNoAISupport extends BaseInsightComponent<Trace.Insights.Types.InsightModel> {
    override internalName = 'test-insight';

    override hasAskAiSupport() {
      return false;
    }

    override createOverlays(): Trace.Types.Overlays.Overlay[] {
      return [];
    }
    override renderContent(): Lit.LitTemplate {
      return html`<div>test content</div>`;
    }
  }
  class TestInsightComponentWithAISupport extends BaseInsightComponent<Trace.Insights.Types.InsightModel> {
    override internalName = 'test-insight';
    override hasAskAiSupport() {
      return true;
    }
    override createOverlays(): Trace.Types.Overlays.Overlay[] {
      return [];
    }
    override renderContent(): Lit.LitTemplate {
      return html`<div>test content</div>`;
    }
  }
  customElements.define('test-insight-component-no-ai-support', TestInsightComponentNoAISupport);
  customElements.define('test-insight-component-ai-support', TestInsightComponentWithAISupport);

  describe('sidebar insight component rendering', () => {
    it('renders insight title even when not active', async () => {
      const component = new TestInsightComponentNoAISupport();
      component.selected = false;
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();

      assert.isNotNull(component.shadowRoot);
      const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
      assert.isNotNull(titleElement);
      const descElement = component.shadowRoot.querySelector<HTMLElement>('.insight-description');
      assert.isNull(descElement);
      const contentElement = component.shadowRoot.querySelector<HTMLElement>('.insight-content');
      assert.isNull(contentElement);
      assert.deepEqual(titleElement.textContent, 'LCP by Phase');
    });

    it('renders title, description and content when toggled', async () => {
      const component = new TestInsightComponentNoAISupport();
      component.selected = true;
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();

      assert.isNotNull(component.shadowRoot);
      const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
      assert.isNotNull(titleElement);
      assert.deepEqual(titleElement.textContent, 'LCP by Phase');

      const descElement = component.shadowRoot.querySelector<HTMLElement>('.insight-description');
      assert.isNotNull(descElement);
      // It's in the markdown component.
      assert.include(descElement.children[0].shadowRoot?.textContent?.trim(), 'some description');

      const contentElement = component.shadowRoot.querySelector<HTMLElement>('.insight-content');
      assert.isNotNull(contentElement);
      assert.strictEqual(contentElement.textContent, 'test content');
    });
  });

  describe('estimated savings output', () => {
    let testComponentIndex = 0;  // used for defining the custom element and making it unique
    function makeTestComponent(opts: {wastedBytes?: number, timeSavings?: number}) {
      class TestInsight extends BaseInsightComponent<Trace.Insights.Types.InsightModel> {
        override internalName = 'test-insight';
        override createOverlays(): Trace.Types.Overlays.Overlay[] {
          return [];
        }

        override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
          return opts.timeSavings ? Trace.Types.Timing.Milli(opts.timeSavings) : null;
        }

        override getEstimatedSavingsBytes(): number|null {
          return opts.wastedBytes ?? null;
        }

        override renderContent(): Lit.LitTemplate {
          return html`<div>test content</div>`;
        }
      }
      customElements.define(`test-insight-est-savings-${testComponentIndex++}`, TestInsight);
      return new TestInsight();
    }

    it('outputs the correct estimated savings for both bytes and time', async () => {
      const component = makeTestComponent({wastedBytes: 5_000, timeSavings: 50});
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();
      const estSavings = component.shadowRoot?.querySelector<HTMLElement>('slot[name=insight-savings]');
      assert.isOk(estSavings);
      assert.strictEqual(estSavings.innerText, 'Est savings: 50 ms & 5.0 kB');
    });

    it('outputs the correct estimated savings for bytes only', async () => {
      const component = makeTestComponent({wastedBytes: 5_000});
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();
      const estSavings = component.shadowRoot?.querySelector<HTMLElement>('slot[name=insight-savings]');
      assert.isOk(estSavings);
      assert.strictEqual(estSavings.innerText, 'Est savings: 5.0 kB');
    });

    it('outputs the correct estimated savings for time only', async () => {
      const component = makeTestComponent({timeSavings: 50});
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();
      const estSavings = component.shadowRoot?.querySelector<HTMLElement>('slot[name=insight-savings]');
      assert.isOk(estSavings);
      assert.strictEqual(estSavings.innerText, 'Est savings: 50 ms');
    });

    it('includes the output in the insight aria label', async () => {
      const component = makeTestComponent({wastedBytes: 5_000, timeSavings: 50});
      component.model = {
        insightKey: 'LCPBreakdown',
        strings: {},
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        state: 'fail',
        frameId: '123',
      };
      renderElementIntoDOM(component);

      await RenderCoordinator.done();
      const label = component.shadowRoot?.querySelector('header')?.getAttribute('aria-label');
      assert.isOk(label);

      assert.strictEqual(
          label,
          'View details for LCP by Phase insight. Estimated savings for this insight: 50 ms and 5.0 kB transfer size');
    });
  });

  describe('Ask AI Insights', () => {
    const FAKE_PARSED_TRACE = {} as unknown as Trace.Handlers.Types.ParsedTrace;
    const FAKE_LCP_MODEL = {
      insightKey: 'LCPBreakdown',
      strings: {},
      title: 'LCP by Phase' as Common.UIString.LocalizedString,
      description: 'some description' as Common.UIString.LocalizedString,
      category: Trace.Insights.Types.InsightCategory.ALL,
      state: 'fail',
      frameId: '123',
    } as const;
    const FAKE_INSIGHT_SET_BOUNDS =
        Trace.Helpers.Timing.traceWindowFromMicroSeconds(0 as Trace.Types.Timing.Micro, 0 as Trace.Types.Timing.Micro);
    async function renderComponent({insightHasAISupport}: {insightHasAISupport: boolean}):
        Promise<TestInsightComponentNoAISupport|TestInsightComponentWithAISupport> {
      const component =
          insightHasAISupport ? new TestInsightComponentWithAISupport() : new TestInsightComponentNoAISupport();
      component.selected = true;
      component.model = FAKE_LCP_MODEL;
      // We don't need a real trace for these tests.
      component.parsedTrace = FAKE_PARSED_TRACE;
      component.bounds = FAKE_INSIGHT_SET_BOUNDS;
      renderElementIntoDOM(component);

      await RenderCoordinator.done();
      return component;
    }

    it('renders the "Ask AI" button when perf insights AI is enabled and the Insight supports it', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
        },
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isOk(button);
    });

    it('does not render the "Ask AI" button when AI is disabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isNotOk(button);
    });

    it('adds a descriptive aria label to the button', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
        },
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isOk(button);
      assert.strictEqual(button.getAttribute('aria-label'), 'Ask AI about LCP by Phase insight');
    });

    it('does not render the "Ask AI" button if disabled by enterprise policy', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        },
        aidaAvailability: {
          enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.DISABLE,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isNull(button);
    });

    it('does not show the button if the feature is enabled but the Insight does not support it', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        }
      });
      const component = await renderComponent({insightHasAISupport: false});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isNull(button);
    });

    it('sets the context when the user clicks the button', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
        },
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isOk(button);
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs(sinon.match(/drjones\.performance-insight-context/))
          .returns(true);

      const FAKE_ACTION = sinon.createStubInstance(UI.ActionRegistration.Action);
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'getAction')
          .withArgs(sinon.match(/drjones\.performance-insight-context/))
          .returns(FAKE_ACTION);

      dispatchClickEvent(button);
      const context = UI.Context.Context.instance().flavor(Utils.AIContext.AgentFocus);
      assert.instanceOf(context, Utils.AIContext.AgentFocus);
    });

    it('clears the active context when it gets toggled shut', async () => {
      const focus = {data: {type: 'insight'}} as unknown as Utils.AIContext.AgentFocus;
      UI.Context.Context.instance().setFlavor(Utils.AIContext.AgentFocus, focus);
      const component = await renderComponent({insightHasAISupport: true});
      const header = component.shadowRoot?.querySelector('header');
      assert.isOk(header);
      dispatchClickEvent(header);
      const context = UI.Context.Context.instance().flavor(Utils.AIContext.AgentFocus);
      assert.isNull(context);
    });

    it('does not render the "Ask AI" button when the perf agent is not enabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: false,
        }
      });
      const component = await renderComponent(
          {insightHasAISupport: true});  // The Insight supports it, but the feature is not enabled
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isNull(button);
    });

    it('does not render the "Ask AI" button when the perf agent is enabled but the insights ai is not', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: false,
        }
      });
      const component = await renderComponent({insightHasAISupport: true});
      assert.isOk(component.shadowRoot);
      const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
      assert.isNull(button);
    });
  });
});
