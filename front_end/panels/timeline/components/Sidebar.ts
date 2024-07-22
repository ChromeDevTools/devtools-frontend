// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as TraceEngine from '../../../models/trace/trace.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../overlays/overlays.js';

import * as Insights from './insights/insights.js';
import sidebarStyles from './sidebar.css.js';
import * as SidebarAnnotationsTab from './SidebarAnnotationsTab.js';
import {SidebarSingleNavigation, type SidebarSingleNavigationData} from './SidebarSingleNavigation.js';

const DEFAULT_EXPANDED_WIDTH = 240;

export const enum SidebarTabsName {
  INSIGHTS = 'Insights',
  ANNOTATIONS = 'Annotations',
}
export const DEFAULT_SIDEBAR_TAB = SidebarTabsName.INSIGHTS;

export enum InsightsCategories {
  ALL = 'All',
  INP = 'INP',
  LCP = 'LCP',
  CLS = 'CLS',
  OTHER = 'Other',
}

export interface ActiveInsight {
  name: string;
  navigationId: string;
  createOverlayFn: (() => Overlays.Overlays.TimelineOverlay[]);
}

export class RemoveAnnotation extends Event {
  static readonly eventName = 'removeannotation';

  constructor(public removedAnnotation: TraceEngine.Types.File.Annotation) {
    super(RemoveAnnotation.eventName, {bubbles: true, composed: true});
  }
}

export const enum WidgetEvents {
  SidebarCollapseClick = 'SidebarCollapseClick',
}

export type WidgetEventTypes = {
  [WidgetEvents.SidebarCollapseClick]: {},
};

export class SidebarWidget extends Common.ObjectWrapper.eventMixin<WidgetEventTypes, typeof UI.SplitWidget.SplitWidget>(
    UI.SplitWidget.SplitWidget) {
  #sidebarUI = new SidebarUI();

  constructor() {
    super(true /* isVertical */, false /* secondIsSidebar */, undefined /* settingName */, DEFAULT_EXPANDED_WIDTH);

    this.sidebarElement().append(this.#sidebarUI);

    this.#sidebarUI.addEventListener('closebuttonclick', () => {
      this.dispatchEventToListeners(
          WidgetEvents.SidebarCollapseClick,
          {},
      );
    });
  }

  updateContentsOnExpand(): void {
    this.#sidebarUI.onWidgetShow();
  }

  setAnnotationsTabContent(updatedAnnotations: TraceEngine.Types.File.Annotation[]): void {
    this.#sidebarUI.annotations = updatedAnnotations;
  }

  setTraceParsedData(traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null): void {
    this.#sidebarUI.traceParsedData = traceParsedData;
  }

  setInsights(insights: TraceEngine.Insights.Types.TraceInsightData): void {
    this.#sidebarUI.insights = insights;
  }

  setActiveInsight(activeInsight: ActiveInsight|null): void {
    this.#sidebarUI.activeInsight = activeInsight;
  }
}

export class SidebarUI extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #activeTab: SidebarTabsName = DEFAULT_SIDEBAR_TAB;
  #selectedCategory: InsightsCategories = InsightsCategories.ALL;

  #traceParsedData?: TraceEngine.Handlers.Types.TraceParseData|null;
  #insights: TraceEngine.Insights.Types.TraceInsightData|null = null;
  #annotations: TraceEngine.Types.File.Annotation[] = [];

  #renderBound = this.#render.bind(this);

  /**
   * When a trace has multiple navigations, we show an accordion with each
   * navigation in. You can only have one of these open at any time, and we
   * track it via this ID.
   */
  #activeNavigationId: string|null = null;

  #activeInsight: ActiveInsight|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarStyles];
  }

  onWidgetShow(): void {
    // Called when the SidebarWidget is expanded in order to render. Because
    // this happens distinctly from any data being passed in, we need to expose
    // a method to allow the widget to let us know when to render. This also
    // matters because this is when we can update the underline below the
    // active tab, now that the sidebar is visible and has width.
    this.#render();
  }

  set annotations(annotations: TraceEngine.Types.File.Annotation[]) {
    this.#annotations = annotations;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  set insights(insights: TraceEngine.Insights.Types.TraceInsightData) {
    if (insights === this.#insights) {
      return;
    }
    this.#insights = insights;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  set activeInsight(activeInsight: ActiveInsight|null) {
    this.#activeInsight = activeInsight;
    // Reset toggled insights when we have new insights.
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  set traceParsedData(traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null) {
    if (this.#traceParsedData === traceParsedData) {
      // If this is the same trace, do not re-render.
      return;
    }
    this.#traceParsedData = traceParsedData;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #closeButtonClick(): void {
    this.dispatchEvent(new Event('closebuttonclick'));
  }

  #onTabHeaderClicked(activeTab: SidebarTabsName): void {
    if (activeTab === this.#activeTab) {
      return;
    }
    this.#activeTab = activeTab;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #renderHeader(): LitHtml.LitTemplate {
    // clang-format off
    return LitHtml.html`
      <div class="tabs-header">
        <input
          type="button"
          value=${SidebarTabsName.INSIGHTS}
          ?active=${this.#activeTab === SidebarTabsName.INSIGHTS}
          @click=${()=>this.#onTabHeaderClicked(SidebarTabsName.INSIGHTS)}>
        <input
          type="button"
          value=${SidebarTabsName.ANNOTATIONS}
          ?active=${this.#activeTab === SidebarTabsName.ANNOTATIONS}
          @click=${()=>this.#onTabHeaderClicked(SidebarTabsName.ANNOTATIONS)}>
      </div>
    `;
    // clang-format on
  }

  #onTargetSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.#selectedCategory = event.itemValue as InsightsCategories;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #renderInsightsTabContent(): LitHtml.TemplateResult {
    const navigations = this.#traceParsedData?.Meta.mainFrameNavigations ?? [];

    const hasMultipleNavigations = navigations.length > 1;

    // clang-format off
    return LitHtml.html`
      <${Menus.SelectMenu.SelectMenu.litTagName}
            class="target-select-menu"
            @selectmenuselected=${this.#onTargetSelected}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .showConnector=${false}
            .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
            .buttonTitle=${this.#selectedCategory}
            jslog=${VisualLogging.dropDown('timeline.sidebar-insights-category-select').track({click: true})}
          >
          ${Object.values(InsightsCategories).map(insightsCategory => {
            return LitHtml.html`
              <${Menus.Menu.MenuItem.litTagName} .value=${insightsCategory}>
                ${insightsCategory}
              </${Menus.Menu.MenuItem.litTagName}>
            `;
          })}
      </${Menus.SelectMenu.SelectMenu.litTagName}>

      ${navigations.map(navigation => {
        const id = navigation.args.data?.navigationId;
        const url = navigation.args.data?.documentLoaderURL;
        if(!id || !url) {
          return LitHtml.nothing;
        }
        const data = {
          traceParsedData: this.#traceParsedData ?? null,
          insights: this.#insights,
          navigationId: id,
          activeCategory: this.#selectedCategory,
          activeInsight: this.#activeInsight,
        };

        const contents = LitHtml.html`
          <${SidebarSingleNavigation.litTagName}
            .data=${data as SidebarSingleNavigationData}>
          </${SidebarSingleNavigation.litTagName}>
        `;

        if(hasMultipleNavigations) {
          return LitHtml.html`<div class="multi-nav-container">
            <details ?open=${id === this.#activeNavigationId} class="navigation-wrapper"><summary @click=${() => this.#navigationClicked(id)}>${url}</summary>${contents}</details>
            </div>`;
        }

        return contents;
      })}
    `;
    // clang-format on
  }

  #navigationClicked(id: string): (event: Event) => void {
    // New navigation clicked. Update the active insight.
    if (id !== this.#activeInsight?.navigationId) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    this.#activeNavigationId = id;
    return (event: Event) => {
      event.preventDefault();
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
    };
  }

  #renderContent(): LitHtml.TemplateResult|HTMLElement|null {
    switch (this.#activeTab) {
      case SidebarTabsName.INSIGHTS:
        return this.#renderInsightsTabContent();
      case SidebarTabsName.ANNOTATIONS:
        return LitHtml.html`
        <${SidebarAnnotationsTab.SidebarAnnotationsTab.litTagName} .annotations=${this.#annotations}></${
            SidebarAnnotationsTab.SidebarAnnotationsTab.litTagName}>
      `;
      default:
        return null;
    }
  }

  #updateActiveIndicatorPosition(): void {
    const insightsTabHeaderElement = this.#shadow.querySelector('.tabs-header input:nth-child(1)');
    const annotationTabHeaderElement = this.#shadow.querySelector('.tabs-header input:nth-child(2)');
    const tabSliderElement = this.#shadow.querySelector<HTMLElement>('.tab-slider');
    if (insightsTabHeaderElement && annotationTabHeaderElement && tabSliderElement) {
      const insightsTabHeaderWidth = insightsTabHeaderElement.getBoundingClientRect().width;
      const annotationTabHeaderWidth = annotationTabHeaderElement.getBoundingClientRect().width;

      switch (this.#activeTab) {
        case SidebarTabsName.INSIGHTS:
          tabSliderElement.style.left = '0';
          tabSliderElement.style.width = `${insightsTabHeaderWidth}px`;
          return;
        case SidebarTabsName.ANNOTATIONS:
          tabSliderElement.style.left = `${insightsTabHeaderWidth}px`;
          tabSliderElement.style.width = `${annotationTabHeaderWidth}px`;
          return;
      }
    }
  }

  #render(): void {
    // clang-format off
    const output = LitHtml.html`<div class="sidebar">
      <div class="tab-bar">
        ${this.#renderHeader()}
        <${IconButton.Icon.Icon.litTagName}
          name='left-panel-close'
          @click=${this.#closeButtonClick}
          class="sidebar-toggle-button"
          jslog=${VisualLogging.action('timeline.sidebar-close').track({click: true})}
        ></${IconButton.Icon.Icon.litTagName}>
      </div>
      <div class="tab-slider"></div>
      <div class="tab-headers-bottom-line"></div>
      <div class="sidebar-body">${this.#renderContent()}</div>
    </div>`;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
    this.#updateActiveIndicatorPosition();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar': SidebarWidget;
  }
}

customElements.define('devtools-performance-sidebar', SidebarUI);
