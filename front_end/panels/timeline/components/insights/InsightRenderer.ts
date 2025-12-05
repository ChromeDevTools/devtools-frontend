// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';

import type {BaseInsightComponent} from './BaseInsightComponent.js';
import {Cache} from './Cache.js';
import {CLSCulprits} from './CLSCulprits.js';
import {DocumentLatency} from './DocumentLatency.js';
import {DOMSize} from './DOMSize.js';
import {DuplicatedJavaScript} from './DuplicatedJavaScript.js';
import {FontDisplay} from './FontDisplay.js';
import {ForcedReflow} from './ForcedReflow.js';
import {ImageDelivery} from './ImageDelivery.js';
import {INPBreakdown} from './INPBreakdown.js';
import {LCPBreakdown} from './LCPBreakdown.js';
import {LCPDiscovery} from './LCPDiscovery.js';
import {LegacyJavaScript} from './LegacyJavaScript.js';
import {ModernHTTP} from './ModernHTTP.js';
import {NetworkDependencyTree} from './NetworkDependencyTree.js';
import {RenderBlocking} from './RenderBlocking.js';
import {SlowCSSSelector} from './SlowCSSSelector.js';
import {ThirdParties} from './ThirdParties.js';
import {Viewport} from './Viewport.js';

const {widgetConfig} = UI.Widget;

type InsightWidgetElement = UI.Widget.WidgetElement<BaseInsightComponent<Trace.Insights.Types.InsightModel>>;

/**
 * Every insight (INCLUDING experimental ones).
 *
 * Order does not matter (but keep alphabetized).
 */
const INSIGHT_NAME_TO_COMPONENT = {
  Cache,
  CLSCulprits,
  DocumentLatency,
  DOMSize,
  DuplicatedJavaScript,
  FontDisplay,
  ForcedReflow,
  ImageDelivery,
  INPBreakdown,
  LCPDiscovery,
  LCPBreakdown,
  LegacyJavaScript,
  ModernHTTP,
  NetworkDependencyTree,
  RenderBlocking,
  SlowCSSSelector,
  ThirdParties,
  Viewport,
};

export class InsightRenderer {
  #insightWidgetCache = new WeakMap<Trace.Insights.Types.InsightModel, InsightWidgetElement>();

  renderInsightToWidgetElement(
      parsedTrace: Trace.TraceModel.ParsedTrace, insightSet: Trace.Insights.Types.InsightSet,
      model: Trace.Insights.Types.InsightModel, insightName: string,
      options: Partial<Pick<
          BaseInsightComponent<Trace.Insights.Types.InsightModel>,
          'selected'|'agentFocus'|'fieldMetrics'|'isAIAssistanceContext'>>): InsightWidgetElement {
    let widgetElement = this.#insightWidgetCache.get(model);
    if (!widgetElement) {
      widgetElement = document.createElement('devtools-widget') as InsightWidgetElement;
      widgetElement.classList.add('insight-component-widget');
      this.#insightWidgetCache.set(model, widgetElement);
    }

    const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName as keyof typeof INSIGHT_NAME_TO_COMPONENT];
    widgetElement.widgetConfig = widgetConfig(componentClass, {
      selected: options.selected ?? false,
      parsedTrace,
      // The `model` passed in as a parameter is the base type, but since
      // `componentClass` is the union of every derived insight component, the
      // `model` for the widget config is the union of every model. That can't be
      // satisfied, so disable typescript.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      bounds: insightSet.bounds,
      insightSetKey: insightSet.id,
      agentFocus: options.agentFocus ?? null,
      fieldMetrics: options.fieldMetrics ?? null,
      isAIAssistanceContext: options.isAIAssistanceContext ?? false,
    });

    return widgetElement;
  }
}
