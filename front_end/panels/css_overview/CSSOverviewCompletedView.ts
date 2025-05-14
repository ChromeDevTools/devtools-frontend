// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cssOverviewCompletedViewStyles from './cssOverviewCompletedView.css.js';
import {
  Events as CSSOverViewControllerEvents,
  type OverviewController,
  type PopulateNodesEvent,
  type PopulateNodesEventNodes,
  type PopulateNodesEventNodeTypes,
} from './CSSOverviewController.js';
import {CSSOverviewSidebarPanel, type ItemSelectedEvent, SidebarEvents} from './CSSOverviewSidebarPanel.js';
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

const {styleMap} = Directives;

const UIStrings = {
  /**
   *@description Label for the summary in the CSS overview report
   */
  overviewSummary: 'Overview summary',
  /**
   *@description Title of colors subsection in the CSS overview panel
   */
  colors: 'Colors',
  /**
   *@description Title of font info subsection in the CSS overview panel
   */
  fontInfo: 'Font info',
  /**
   *@description Label to denote unused declarations in the target page
   */
  unusedDeclarations: 'Unused declarations',
  /**
   *@description Label for the number of media queries in the CSS overview report
   */
  mediaQueries: 'Media queries',
  /**
   *@description Title of the Elements Panel
   */
  elements: 'Elements',
  /**
   *@description Label for the number of External stylesheets in the CSS overview report
   */
  externalStylesheets: 'External stylesheets',
  /**
   *@description Label for the number of inline style elements in the CSS overview report
   */
  inlineStyleElements: 'Inline style elements',
  /**
   *@description Label for the number of style rules in CSS overview report
   */
  styleRules: 'Style rules',
  /**
   *@description Label for the number of type selectors in the CSS overview report
   */
  typeSelectors: 'Type selectors',
  /**
   *@description Label for the number of ID selectors in the CSS overview report
   */
  idSelectors: 'ID selectors',
  /**
   *@description Label for the number of class selectors in the CSS overview report
   */
  classSelectors: 'Class selectors',
  /**
   *@description Label for the number of universal selectors in the CSS overview report
   */
  universalSelectors: 'Universal selectors',
  /**
   *@description Label for the number of Attribute selectors in the CSS overview report
   */
  attributeSelectors: 'Attribute selectors',
  /**
   *@description Label for the number of non-simple selectors in the CSS overview report
   */
  nonsimpleSelectors: 'Non-simple selectors',
  /**
   *@description Label for unique background colors in the CSS overview panel
   *@example {32} PH1
   */
  backgroundColorsS: 'Background colors: {PH1}',
  /**
   *@description Label for unique text colors in the CSS overview panel
   *@example {32} PH1
   */
  textColorsS: 'Text colors: {PH1}',
  /**
   *@description Label for unique fill colors in the CSS overview panel
   *@example {32} PH1
   */
  fillColorsS: 'Fill colors: {PH1}',
  /**
   *@description Label for unique border colors in the CSS overview panel
   *@example {32} PH1
   */
  borderColorsS: 'Border colors: {PH1}',
  /**
   *@description Label to indicate that there are no fonts in use
   */
  thereAreNoFonts: 'There are no fonts.',
  /**
   *@description Message to show when no unused declarations in the target page
   */
  thereAreNoUnusedDeclarations: 'There are no unused declarations.',
  /**
   *@description Message to show when no media queries are found in the target page
   */
  thereAreNoMediaQueries: 'There are no media queries.',
  /**
   *@description Title of the Drawer for contrast issues in the CSS overview panel
   */
  contrastIssues: 'Contrast issues',
  /**
   * @description Text to indicate how many times this CSS rule showed up.
   */
  nOccurrences: '{n, plural, =1 {# occurrence} other {# occurrences}}',
  /**
   *@description Section header for contrast issues in the CSS overview panel
   *@example {1} PH1
   */
  contrastIssuesS: 'Contrast issues: {PH1}',
  /**
   *@description Title of the button for a contrast issue in the CSS overview panel
   *@example {#333333} PH1
   *@example {#333333} PH2
   *@example {2} PH3
   */
  textColorSOverSBackgroundResults: 'Text color {PH1} over {PH2} background results in low contrast for {PH3} elements',
  /**
   *@description Label aa text content in Contrast Details of the Color Picker
   */
  aa: 'AA',
  /**
   *@description Label aaa text content in Contrast Details of the Color Picker
   */
  aaa: 'AAA',
  /**
   *@description Label for the APCA contrast in Color Picker
   */
  apca: 'APCA',
  /**
   *@description Label for the column in the element list in the CSS overview report
   */
  element: 'Element',
  /**
   *@description Column header title denoting which declaration is unused
   */
  declaration: 'Declaration',
  /**
   *@description Text for the source of something
   */
  source: 'Source',
  /**
   *@description Text of a DOM element in Contrast Details of the Color Picker
   */
  contrastRatio: 'Contrast ratio',
  /**
   *@description Accessible title of a table in the CSS overview elements.
   */
  cssOverviewElements: 'CSS overview elements',
  /**
   *@description Title of the button to show the element in the CSS overview panel
   */
  showElement: 'Show element',
  /**
   * @description Text to show in a table if the link to the style could not be created.
   */
  unableToLink: '(unable to link)',
  /**
   * @description Text to show in a table if the link to the inline style could not be created.
   */
  unableToLinkToInlineStyle: '(unable to link to inline style)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewCompletedView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type NodeStyleStats = Map<string, Set<number>>;

export interface ContrastIssue {
  nodeId: Protocol.DOM.BackendNodeId;
  contrastRatio: number;
  textColor: Common.Color.Color;
  backgroundColor: Common.Color.Color;
  thresholdsViolated: {
    aa: boolean,
    aaa: boolean,
    apca: boolean,
  };
}
export interface OverviewData {
  backgroundColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  textColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  textColorContrastIssues: Map<string, ContrastIssue[]>;
  fillColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  borderColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  globalStyleStats: {
    styleRules: number,
    inlineStyles: number,
    externalSheets: number,
    stats: {type: number, class: number, id: number, universal: number, attribute: number, nonSimple: number},
  };
  fontInfo: Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>;
  elementCount: number;
  mediaQueries: Map<string, Protocol.CSS.CSSMedia[]>;
  unusedDeclarations: Map<string, UnusedDeclaration[]>;
}

export type FontInfo = Map<string, Map<string, Map<string, number[]>>>;

function getBorderString(color: Common.Color.Color): string {
  let {h, s, l} = color.as(Common.Color.Format.HSL);
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  // Reduce the lightness of the border to make sure that there's always a visible outline.
  l = Math.max(0, l - 15);

  return `1px solid hsl(${h}deg ${s}% ${l}%)`;
}

export class CSSOverviewCompletedView extends UI.Widget.VBox {
  readonly #splitWidget: UI.SplitWidget.SplitWidget;
  #controller: OverviewController;
  #formatter: Intl.NumberFormat;
  readonly #mainContainer: UI.SplitWidget.SplitWidget;
  readonly #resultsContainer: UI.Widget.VBox;
  readonly #tabbedPane: UI.TabbedPane.TabbedPane;
  readonly #sideBar: CSSOverviewSidebarPanel;
  #cssModel?: SDK.CSSModel.CSSModel;
  #domModel?: SDK.DOMModel.DOMModel;
  #linkifier: Components.Linkifier.Linkifier;
  #viewMap: Map<string, ElementDetailsView>;
  #data: OverviewData|null;
  #fragment?: UI.Fragment.Fragment;

  constructor(controller: OverviewController) {
    super();
    this.registerRequiredCSS(cssOverviewCompletedViewStyles);

    this.#controller = controller;
    this.#formatter = new Intl.NumberFormat('en-US');

    this.#splitWidget = new UI.SplitWidget.SplitWidget(true, false, undefined, 200);
    this.#splitWidget.show(this.element);

    this.#mainContainer = new UI.SplitWidget.SplitWidget(true, true);
    this.#resultsContainer = new UI.Widget.VBox();
    this.#tabbedPane = new UI.TabbedPane.TabbedPane();

    // If closing the last tab, collapse the sidebar.
    this.#tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, _ => {
      if (this.#tabbedPane.tabIds().length === 0) {
        this.#mainContainer.setSidebarMinimized(true);
      }
    });

    // Dupe the styles into the main container because of the shadow root will prevent outer styles.

    this.#mainContainer.setMainWidget(this.#resultsContainer);
    this.#mainContainer.setSidebarWidget(this.#tabbedPane);
    this.#mainContainer.setVertical(false);
    this.#mainContainer.setSecondIsSidebar(true);
    this.#mainContainer.setSidebarMinimized(true);
    this.#mainContainer.registerRequiredCSS(cssOverviewCompletedViewStyles);

    this.#sideBar = new CSSOverviewSidebarPanel();
    this.#sideBar.setMinimumSize(100, 25);
    this.#splitWidget.setSidebarWidget(this.#sideBar);
    this.#splitWidget.setMainWidget(this.#mainContainer);

    this.#linkifier = new Components.Linkifier.Linkifier(/* maxLinkLength */ 20, /* useLinkDecorator */ true);

    this.#viewMap = new Map();

    this.#sideBar.items = [
      {name: i18nString(UIStrings.overviewSummary), id: 'summary'}, {name: i18nString(UIStrings.colors), id: 'colors'},
      {name: i18nString(UIStrings.fontInfo), id: 'font-info'},
      {name: i18nString(UIStrings.unusedDeclarations), id: 'unused-declarations'},
      {name: i18nString(UIStrings.mediaQueries), id: 'media-queries'}
    ];
    this.#sideBar.selectedId = 'summary';

    this.#sideBar.addEventListener(SidebarEvents.ITEM_SELECTED, this.#sideBarItemSelected, this);
    this.#sideBar.addEventListener(SidebarEvents.RESET, this.#sideBarReset, this);
    this.#controller.addEventListener(CSSOverViewControllerEvents.RESET, this.#reset, this);
    this.#controller.addEventListener(CSSOverViewControllerEvents.POPULATE_NODES, this.#createElementsView, this);
    this.#resultsContainer.element.addEventListener('click', this.#onClick.bind(this));

    this.#data = null;
  }

  initializeModels(target: SDK.Target.Target): void {
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!cssModel || !domModel) {
      throw new Error('Target must provide CSS and DOM models');
    }
    this.#cssModel = cssModel;
    this.#domModel = domModel;
  }

  #sideBarItemSelected(event: Common.EventTarget.EventTargetEvent<ItemSelectedEvent>): void {
    const {data} = event;
    const section = (this.#fragment as UI.Fragment.Fragment).$(data.id);
    if (!section) {
      return;
    }

    section.scrollIntoView();
    // Set focus for keyboard invoked event
    if (!data.isMouseEvent && data.key === 'Enter') {
      const focusableElement: HTMLElement|null = section.querySelector('button, [tabindex="0"]');
      focusableElement?.focus();
    }
  }

  #sideBarReset(): void {
    this.#controller.dispatchEventToListeners(CSSOverViewControllerEvents.RESET);
  }

  #reset(): void {
    this.#resultsContainer.element.removeChildren();
    this.#mainContainer.setSidebarMinimized(true);
    this.#tabbedPane.closeTabs(this.#tabbedPane.tabIds());
    this.#viewMap = new Map();
    CSSOverviewCompletedView.pushedNodes.clear();
    this.#sideBar.selectedId = 'summary';
  }

  #onClick(evt: Event): void {
    if (!evt.target) {
      return;
    }
    const target = (evt.target as HTMLElement);
    const dataset = target.dataset;

    const type = dataset.type;
    if (!type || !this.#data) {
      return;
    }

    let payload: PopulateNodesEvent;
    switch (type) {
      case 'contrast': {
        const section = dataset.section;
        const key = dataset.key;

        if (!key) {
          return;
        }

        // Remap the Set to an object that is the same shape as the unused declarations.
        const nodes = this.#data.textColorContrastIssues.get(key) || [];
        payload = {type, key, nodes, section};
        break;
      }
      case 'color': {
        const color = dataset.color;
        const section = dataset.section;
        if (!color) {
          return;
        }

        let nodes;
        switch (section) {
          case 'text':
            nodes = this.#data.textColors.get(color);
            break;

          case 'background':
            nodes = this.#data.backgroundColors.get(color);
            break;

          case 'fill':
            nodes = this.#data.fillColors.get(color);
            break;

          case 'border':
            nodes = this.#data.borderColors.get(color);
            break;
        }

        if (!nodes) {
          return;
        }

        // Remap the Set to an object that is the same shape as the unused declarations.
        nodes = Array.from(nodes).map(nodeId => ({nodeId}));
        payload = {type, color, nodes, section};
        break;
      }

      case 'unused-declarations': {
        const declaration = dataset.declaration;
        if (!declaration) {
          return;
        }
        const nodes = this.#data.unusedDeclarations.get(declaration);
        if (!nodes) {
          return;
        }

        payload = {type, declaration, nodes};
        break;
      }

      case 'media-queries': {
        const text = dataset.text;
        if (!text) {
          return;
        }
        const nodes = this.#data.mediaQueries.get(text);
        if (!nodes) {
          return;
        }

        payload = {type, text, nodes};
        break;
      }

      case 'font-info': {
        const value = dataset.value;
        if (!dataset.path) {
          return;
        }

        const [fontFamily, fontMetric] = dataset.path.split('/');
        if (!value) {
          return;
        }

        const fontFamilyInfo = this.#data.fontInfo.get(fontFamily);
        if (!fontFamilyInfo) {
          return;
        }

        const fontMetricInfo = fontFamilyInfo.get(fontMetric);
        if (!fontMetricInfo) {
          return;
        }

        const nodesIds = fontMetricInfo.get(value);
        if (!nodesIds) {
          return;
        }

        const nodes = nodesIds.map(nodeId => ({nodeId}));
        const name = `${value} (${fontFamily}, ${fontMetric})`;
        payload = {type, name, nodes};
        break;
      }

      default:
        return;
    }

    evt.consume();
    this.#controller.dispatchEventToListeners(CSSOverViewControllerEvents.POPULATE_NODES, {payload});
    this.#mainContainer.setSidebarMinimized(false);
  }

  async #render(data: OverviewData): Promise<void> {
    if (!data || !('backgroundColors' in data) || !('textColors' in data)) {
      return;
    }

    this.#data = data;
    const {
      mediaQueries,
      unusedDeclarations,
      fontInfo,
    } = this.#data;

    this.#fragment = UI.Fragment.Fragment.build`
    <div class="vbox overview-completed-view">
      <div $="summary" class="results-section horizontally-padded summary">
        <h1>${i18nString(UIStrings.overviewSummary)}</h1>
        ${this.#renderSummary(data)}
      </div>
      <div $="colors" class="results-section horizontally-padded colors">
        <h1>${i18nString(UIStrings.colors)}</h1>
        ${this.#renderColors(data)}
      </div>
      <div $="font-info" class="results-section font-info">
        <h1>${i18nString(UIStrings.fontInfo)}</h1>
        ${this.#renderFontInfo(fontInfo)}
      </div>
      <div $="unused-declarations" class="results-section unused-declarations">
        <h1>${i18nString(UIStrings.unusedDeclarations)}</h1>
        ${this.#renderUnusedDeclarations(unusedDeclarations)}
      </div>
      <div $="media-queries" class="results-section media-queries">
        <h1>${i18nString(UIStrings.mediaQueries)}</h1>
        ${this.#renderMediaQueries(mediaQueries)}
      </div>
    </div>`;

    this.#resultsContainer.element.appendChild(this.#fragment.element());
  }

  #renderSummary(data: OverviewData): UI.Fragment.Fragment {
    const {
      elementCount,
      globalStyleStats,
      mediaQueries,
    } = data;
    const renderSummaryItem = (label: string, value: number): UI.Fragment.Fragment => UI.Fragment.Fragment.build`
      <li>
        <div class="label">${label}</div>
        <div class="value">${this.#formatter.format(value)}</div>
      </li>`;
    return UI.Fragment.Fragment.build`<ul>
      ${renderSummaryItem(i18nString(UIStrings.elements), elementCount)}
      ${renderSummaryItem(i18nString(UIStrings.externalStylesheets), globalStyleStats.externalSheets)}
      ${renderSummaryItem(i18nString(UIStrings.inlineStyleElements), globalStyleStats.inlineStyles)}
      ${renderSummaryItem(i18nString(UIStrings.styleRules), globalStyleStats.styleRules)}
      ${renderSummaryItem(i18nString(UIStrings.mediaQueries), mediaQueries.size)}
      ${renderSummaryItem(i18nString(UIStrings.typeSelectors), globalStyleStats.stats.type)}
      ${renderSummaryItem(i18nString(UIStrings.idSelectors), globalStyleStats.stats.id)}
      ${renderSummaryItem(i18nString(UIStrings.classSelectors), globalStyleStats.stats.class)}
      ${renderSummaryItem(i18nString(UIStrings.universalSelectors), globalStyleStats.stats.universal)}
      ${renderSummaryItem(i18nString(UIStrings.attributeSelectors), globalStyleStats.stats.attribute)}
      ${renderSummaryItem(i18nString(UIStrings.nonsimpleSelectors), globalStyleStats.stats.nonSimple)}
    </ul>`;
  }

  #renderColors(data: OverviewData): UI.Fragment.Fragment {
    const {
      backgroundColors,
      textColors,
      textColorContrastIssues,
      fillColors,
      borderColors,
    } = data;
    // Convert rgb values from the computed styles to either undefined or HEX(A) strings.
    const sortedBackgroundColors = this.#sortColorsByLuminance(backgroundColors);
    const sortedTextColors = this.#sortColorsByLuminance(textColors);
    const sortedFillColors = this.#sortColorsByLuminance(fillColors);
    const sortedBorderColors = this.#sortColorsByLuminance(borderColors);

    return UI.Fragment.Fragment.build`
      <h2>${i18nString(UIStrings.backgroundColorsS, {
      PH1: sortedBackgroundColors.length
    })}</h2>
      <ul>${sortedBackgroundColors.map(this.#renderColor.bind(this, 'background'))}</ul>

      <h2>${i18nString(UIStrings.textColorsS, {
      PH1: sortedTextColors.length
    })}</h2>
      <ul>${sortedTextColors.map(this.#renderColor.bind(this, 'text'))}</ul>

      ${textColorContrastIssues.size > 0 ? this.#renderContrastIssues(textColorContrastIssues) : ''}

      <h2>${i18nString(UIStrings.fillColorsS, {
      PH1: sortedFillColors.length
    })}</h2>
      <ul>${sortedFillColors.map(this.#renderColor.bind(this, 'fill'))}</ul>

      <h2>${i18nString(UIStrings.borderColorsS, {
      PH1: sortedBorderColors.length
    })}</h2>
      <ul>${sortedBorderColors.map(this.#renderColor.bind(this, 'border'))}</ul>`;
  }

  #renderUnusedDeclarations(unusedDeclarations: Map<string, UnusedDeclaration[]>): UI.Fragment.Fragment {
    return unusedDeclarations.size > 0 ? this.#renderGroup(unusedDeclarations, 'unused-declarations', 'declaration') :
                                         UI.Fragment.Fragment.build`<div class="horizontally-padded">${
                                             i18nString(UIStrings.thereAreNoUnusedDeclarations)}</div>`;
  }

  #renderMediaQueries(mediaQueries: Map<string, Protocol.CSS.CSSMedia[]>): UI.Fragment.Fragment {
    return mediaQueries.size > 0 ? this.#renderGroup(mediaQueries, 'media-queries', 'text') :
                                   UI.Fragment.Fragment.build`<div class="horizontally-padded">${
                                       i18nString(UIStrings.thereAreNoMediaQueries)}</div>`;
  }

  #createElementsView(evt: Common.EventTarget.EventTargetEvent<{payload: PopulateNodesEvent}>): void {
    const {payload} = evt.data;

    let id = '';
    let tabTitle = '';

    switch (payload.type) {
      case 'contrast': {
        const {section, key} = payload;
        id = `${section}-${key}`;
        tabTitle = i18nString(UIStrings.contrastIssues);
        break;
      }

      case 'color': {
        const {section, color} = payload;
        id = `${section}-${color}`;
        tabTitle = `${color.toUpperCase()} (${section})`;
        break;
      }

      case 'unused-declarations': {
        const {declaration} = payload;
        id = `${declaration}`;
        tabTitle = `${declaration}`;
        break;
      }

      case 'media-queries': {
        const {text} = payload;
        id = `${text}`;
        tabTitle = `${text}`;
        break;
      }

      case 'font-info': {
        const {name} = payload;
        id = `${name}`;
        tabTitle = `${name}`;
        break;
      }
    }

    let view = this.#viewMap.get(id);
    if (!view) {
      if (!this.#domModel || !this.#cssModel) {
        throw new Error('Unable to initialize CSS overview, missing models');
      }
      view = new ElementDetailsView(this.#domModel, this.#cssModel, this.#linkifier);
      view.data = payload.nodes;
      this.#viewMap.set(id, view);
    }

    if (!this.#tabbedPane.hasTab(id)) {
      this.#tabbedPane.appendTab(
          id, tabTitle, view, undefined, undefined, /* isCloseable */ true, undefined, undefined, payload.type);
    }

    this.#tabbedPane.selectTab(id);
  }

  #renderFontInfo(fontInfo: Map<string, Map<string, Map<string, number[]>>>): UI.Fragment.Fragment {
    const fonts = Array.from(fontInfo.entries());
    return fontInfo.size > 0 ? UI.Fragment.Fragment.build`${fonts.map(([font, fontMetrics]) => {
      return UI.Fragment.Fragment.build`<section class="font-family"><h2>${font}</h2> ${
          this.#renderFontMetrics(font, fontMetrics)}</section>`;
    })}` :
                               UI.Fragment.Fragment.build`<div>${i18nString(UIStrings.thereAreNoFonts)}</div>`;
  }

  #renderFontMetrics(font: string, fontMetrics: Map<string, Map<string, number[]>>): UI.Fragment.Fragment {
    const fontMetricInfo = Array.from(fontMetrics.entries());

    return UI.Fragment.Fragment.build`
  <div class="font-metric">
  ${fontMetricInfo.map(([label, values]) => {
      const sanitizedPath = `${font}/${label}`;
      return UI.Fragment.Fragment.build`
  <div>
  <h3>${label}</h3>
  ${this.#renderGroup(values, 'font-info', 'value', sanitizedPath)}
  </div>`;
    })}
  </div>`;
  }

  #renderGroup(
      items: Map<string, Array<number|UnusedDeclaration|Protocol.CSS.CSSMedia>>, type: string, dataLabel: string,
      path = ''): UI.Fragment.Fragment {
    // Sort by number of items descending.
    const values = Array.from(items.entries()).sort((d1, d2) => {
      const v1Nodes = d1[1];
      const v2Nodes = d2[1];
      return v2Nodes.length - v1Nodes.length;
    });

    const total = values.reduce((prev, curr) => prev + curr[1].length, 0);

    return UI.Fragment.Fragment.build`<ul aria-label="${type}">
    ${values.map(([title, nodes]) => {
      const width = 100 * nodes.length / total;
      const itemLabel = i18nString(UIStrings.nOccurrences, {n: nodes.length});

      return UI.Fragment.Fragment.build`<li>
        <div class="title">${title}</div>
        <button data-type="${type}" data-path="${path}" data-${dataLabel}="${title}"
        jslog="${VisualLogging.action().track({click: true}).context(`css-overview.${type}`)}"
        aria-label="${title}: ${itemLabel}">
          <div class="details">${itemLabel}</div>
          <div class="bar-container">
            <div class="bar" style="width: ${width}%;"></div>
          </div>
        </button>
      </li>`;
    })}
    </ul>`;
  }

  #renderContrastIssues(issues: Map<string, ContrastIssue[]>): UI.Fragment.Fragment {
    return UI.Fragment.Fragment.build`
  <h2>${i18nString(UIStrings.contrastIssuesS, {
      PH1: issues.size,
    })}</h2>
  <ul>
  ${[...issues.entries()].map(([key, value]) => this.#renderContrastIssue(key, value))}
  </ul>
  `;
  }

  #renderContrastIssue(key: string, issues: ContrastIssue[]): UI.Fragment.Fragment {
    console.assert(issues.length > 0);

    let minContrastIssue: ContrastIssue = issues[0];
    for (const issue of issues) {
      // APCA contrast can be a negative value that is to be displayed. But the
      // absolute value is used to compare against the threshold. Therefore, the min
      // absolute value is the worst contrast.
      if (Math.abs(issue.contrastRatio) < Math.abs(minContrastIssue.contrastRatio)) {
        minContrastIssue = issue;
      }
    }

    const color = (minContrastIssue.textColor.asString(Common.Color.Format.HEXA));
    const backgroundColor = (minContrastIssue.backgroundColor.asString(Common.Color.Format.HEXA));

    const showAPCA = Root.Runtime.experiments.isEnabled('apca');

    const title = i18nString(UIStrings.textColorSOverSBackgroundResults, {
      PH1: color,
      PH2: backgroundColor,
      PH3: issues.length,
    });

    const blockFragment = UI.Fragment.Fragment.build`<li>
      <button
        title="${title}" aria-label="${title}"
        data-type="contrast" data-key="${key}" data-section="contrast" class="block" $="color"
        jslog="${VisualLogging.action('css-overview.contrast').track({
      click: true,
    })}">
        Text
      </button>
      <div class="block-title">
        <div class="contrast-warning hidden" $="aa"><span class="threshold-label">${
        i18nString(UIStrings.aa)}</span></div>
        <div class="contrast-warning hidden" $="aaa"><span class="threshold-label">${
        i18nString(UIStrings.aaa)}</span></div>
        <div class="contrast-warning hidden" $="apca"><span class="threshold-label">${
        i18nString(UIStrings.apca)}</span></div>
      </div>
    </li>`;

    if (showAPCA) {
      const apca = (blockFragment.$('apca') as HTMLElement);
      if (minContrastIssue.thresholdsViolated.apca) {
        apca.appendChild(createClearIcon());
      } else {
        apca.appendChild(createCheckIcon());
      }
      apca.classList.remove('hidden');
    } else {
      const aa = (blockFragment.$('aa') as HTMLElement);
      if (minContrastIssue.thresholdsViolated.aa) {
        aa.appendChild(createClearIcon());
      } else {
        aa.appendChild(createCheckIcon());
      }
      const aaa = (blockFragment.$('aaa') as HTMLElement);
      if (minContrastIssue.thresholdsViolated.aaa) {
        aaa.appendChild(createClearIcon());
      } else {
        aaa.appendChild(createCheckIcon());
      }
      aa.classList.remove('hidden');
      aaa.classList.remove('hidden');
    }

    const block = (blockFragment.$('color') as HTMLElement);
    block.style.backgroundColor = backgroundColor;
    block.style.color = color;
    block.style.border = getBorderString(minContrastIssue.backgroundColor.asLegacyColor());

    return blockFragment;
  }

  #renderColor(section: string, color: string): UI.Fragment.Fragment|undefined {
    const blockFragment = UI.Fragment.Fragment.build`<li>
      <button title=${color} data-type="color" data-color="${color}"
        data-section="${section}" class="block" $="color"
        jslog="${VisualLogging.action('css-overview.color').track({
      click: true,
    })}"></button>
      <div class="block-title color-text">${color}</div>
    </li>`;

    const block = (blockFragment.$('color') as HTMLElement);
    block.style.backgroundColor = color;

    const borderColor = Common.Color.parse(color)?.asLegacyColor();
    if (!borderColor) {
      return;
    }
    block.style.border = getBorderString(borderColor);

    return blockFragment;
  }

  #sortColorsByLuminance(srcColors: Map<string, Set<number>>): string[] {
    return Array.from(srcColors.keys()).sort((colA, colB) => {
      const colorA = Common.Color.parse(colA)?.asLegacyColor();
      const colorB = Common.Color.parse(colB)?.asLegacyColor();
      if (!colorA || !colorB) {
        return 0;
      }
      return Common.ColorUtils.luminance(colorB.rgba()) - Common.ColorUtils.luminance(colorA.rgba());
    });
  }

  setOverviewData(data: OverviewData): void {
    void this.#render(data);
  }

  static readonly pushedNodes = new Set<Protocol.DOM.BackendNodeId>();
}

interface ViewInput {
  items: Array<{
    data: PopulateNodesEventNodeTypes,
    link?: HTMLElement,
    showNode?: () => void,
  }>;
  visibility: Set<string>;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const {items, visibility} = input;
  // clang-format off
  render(html`
    <div>
      <devtools-data-grid class="element-grid" striped inline
         name=${i18nString(UIStrings.cssOverviewElements)}>
        <table>
          <tr>
            ${visibility.has('node-id') ? html`
              <th id="node-id" weight="50" sortable>
                ${i18nString(UIStrings.element)}
              </th>` : nothing}
            ${visibility.has('declaration') ? html`
              <th id="declaration" weight="50" sortable>
                ${i18nString(UIStrings.declaration)}
              </th>` : nothing}
            ${visibility.has('source-url') ? html`
              <th id="source-url" weight="100">
                ${i18nString(UIStrings.source)}
              </th>` : nothing}
            ${visibility.has('contrast-ratio') ? html`
              <th id="contrast-ratio" weight="25" width="150px" sortable fixed>
                ${i18nString(UIStrings.contrastRatio)}
              </th>` : nothing}
          </tr>
          ${items.map(({data, link, showNode}) => html`
            <tr>
              ${visibility.has('node-id') ? renderNode(data, link, showNode) : nothing}
              ${visibility.has('declaration') ? renderDeclaration(data) : nothing}
              ${visibility.has('source-url') ? renderSourceURL(data, link) : nothing}
              ${visibility.has('contrast-ratio') ? renderContrastRatio(data) : nothing}
            </tr>`)}
        </table>
      </devtools-data-grid>
    </div>`,
    target, {host: input});
  // clang-format on
};

export class ElementDetailsView extends UI.Widget.Widget {
  #domModel: SDK.DOMModel.DOMModel;
  readonly #cssModel: SDK.CSSModel.CSSModel;
  readonly #linkifier: Components.Linkifier.Linkifier;
  #data: PopulateNodesEventNodes;
  readonly #view: View;

  constructor(
      domModel: SDK.DOMModel.DOMModel, cssModel: SDK.CSSModel.CSSModel, linkifier: Components.Linkifier.Linkifier,
      view: View = DEFAULT_VIEW) {
    super();

    this.#domModel = domModel;
    this.#cssModel = cssModel;
    this.#linkifier = linkifier;
    this.#view = view;
    this.#data = [];
  }

  set data(data: PopulateNodesEventNodes) {
    this.#data = data;
    this.requestUpdate();
  }

  override async performUpdate(): Promise<void> {
    const visibility = new Set<string>();
    if (!this.#data.length) {
      this.#view({items: [], visibility}, {}, this.element);
      return;
    }

    const [firstItem] = this.#data;
    'nodeId' in firstItem && firstItem.nodeId && visibility.add('node-id');
    'declaration' in firstItem && firstItem.declaration && visibility.add('declaration');
    'sourceURL' in firstItem && firstItem.sourceURL && visibility.add('source-url');
    'contrastRatio' in firstItem && firstItem.contrastRatio && visibility.add('contrast-ratio');

    let relatedNodesMap: Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>|null|undefined;
    if ('nodeId' in firstItem && visibility.has('node-id')) {
      // Grab the nodes from the frontend, but only those that have not been
      // retrieved already.
      const nodeIds = (this.#data as Array<{nodeId: Protocol.DOM.BackendNodeId}>).reduce((prev, curr) => {
        const nodeId = curr.nodeId;
        if (CSSOverviewCompletedView.pushedNodes.has(nodeId)) {
          return prev;
        }
        CSSOverviewCompletedView.pushedNodes.add(nodeId);
        return prev.add(nodeId);
      }, new Set<Protocol.DOM.BackendNodeId>());
      relatedNodesMap = await this.#domModel.pushNodesByBackendIdsToFrontend(nodeIds);
    }

    const items = await Promise.all(this.#data.map(async item => {
      let link, showNode;
      if ('nodeId' in item && visibility.has('node-id')) {
        const frontendNode = relatedNodesMap?.get(item.nodeId) ?? null;
        if (frontendNode) {
          link = await Common.Linkifier.Linkifier.linkify(frontendNode) as HTMLElement;
          showNode = () => frontendNode.scrollIntoView();
        }
      }
      if ('range' in item && item.range && item.styleSheetId && visibility.has('source-url')) {
        const ruleLocation = TextUtils.TextRange.TextRange.fromObject(item.range);
        const styleSheetHeader = this.#cssModel.styleSheetHeaderForId(item.styleSheetId);
        if (styleSheetHeader) {
          const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
          const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
          const matchingSelectorLocation = new SDK.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
          link = this.#linkifier.linkifyCSSLocation(matchingSelectorLocation) as HTMLElement;
        }
      }

      return {data: item, link, showNode};
    }));

    this.#view({items, visibility}, {}, this.element);
  }
}

function renderNode(data: PopulateNodesEventNodeTypes, link?: HTMLElement, showNode?: () => void): TemplateResult {
  if (!link) {
    return html``;
  }
  return html`
    <td>
      ${link}
      <devtools-icon part="show-element" name="select-element"
          title=${i18nString(UIStrings.showElement)} tabindex="0"
          @click=${() => showNode && showNode()}></devtools-icon>
    </td>`;
}

function renderDeclaration(data: PopulateNodesEventNodeTypes): TemplateResult {
  if (!('declaration' in data)) {
    throw new Error('Declaration entry is missing a declaration.');
  }
  return html`<td>${data.declaration}</td>`;
}

function renderSourceURL(data: PopulateNodesEventNodeTypes, link?: HTMLElement): TemplateResult {
  if ('range' in data && data.range) {
    if (!link) {
      return html`<td>${i18nString(UIStrings.unableToLink)}</td>`;
    }
    return html`<td>${link}</td>`;
  }
  return html`<td>${i18nString(UIStrings.unableToLinkToInlineStyle)}</td>`;
}

function renderContrastRatio(data: PopulateNodesEventNodeTypes): TemplateResult {
  if (!('contrastRatio' in data)) {
    throw new Error('Contrast ratio entry is missing a contrast ratio.');
  }
  const showAPCA = Root.Runtime.experiments.isEnabled('apca');
  const contrastRatio = Platform.NumberUtilities.floor(data.contrastRatio, 2);
  const contrastRatioString = showAPCA ? contrastRatio + '%' : contrastRatio;
  const border = getBorderString(data.backgroundColor);
  const color = data.textColor.asString();
  const backgroundColor = data.backgroundColor.asString();

  // clang-format off
  return html`
    <td>
      <div class="contrast-container-in-grid">
          <span class="contrast-preview" style=${styleMap({border, color, backgroundColor})}>Aa</span>
          <span>${contrastRatioString}</span>
          ${showAPCA ?
            html`
            <span>${i18nString(UIStrings.apca)}</span>${data.thresholdsViolated.apca ? createClearIcon() : createCheckIcon()}`
          : html`
            <span>${i18nString(UIStrings.aa)}</span>${data.thresholdsViolated.aa ? createClearIcon() : createCheckIcon()}
            <span>${i18nString(UIStrings.aaa)}</span>${data.thresholdsViolated.aaa ? createClearIcon() : createCheckIcon()}`
          }
      </div>
    </td>`;
  // clang-format on
}

function createClearIcon(): IconButton.Icon.Icon {
  const icon = new IconButton.Icon.Icon();
  icon.data = {iconName: 'clear', color: 'var(--icon-error)', width: '14px', height: '14px'};
  return icon;
}

function createCheckIcon(): IconButton.Icon.Icon {
  const icon = new IconButton.Icon.Icon();
  icon.data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '14px', height: '14px'};
  return icon;
}
