// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/components/icon_button/icon_button.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import cssOverviewCompletedViewStyles from './cssOverviewCompletedView.css.js';
import { CSSOverviewSidebarPanel } from './CSSOverviewSidebarPanel.js';
const { styleMap, ref } = Directives;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     * @description Label for the summary in the CSS overview report
     */
    overviewSummary: 'Overview summary',
    /**
     * @description Title of colors subsection in the CSS overview panel
     */
    colors: 'Colors',
    /**
     * @description Title of font info subsection in the CSS overview panel
     */
    fontInfo: 'Font info',
    /**
     * @description Label to denote unused declarations in the target page
     */
    unusedDeclarations: 'Unused declarations',
    /**
     * @description Label for the number of media queries in the CSS overview report
     */
    mediaQueries: 'Media queries',
    /**
     * @description Title of the Elements Panel
     */
    elements: 'Elements',
    /**
     * @description Label for the number of External stylesheets in the CSS overview report
     */
    externalStylesheets: 'External stylesheets',
    /**
     * @description Label for the number of inline style elements in the CSS overview report
     */
    inlineStyleElements: 'Inline style elements',
    /**
     * @description Label for the number of style rules in CSS overview report
     */
    styleRules: 'Style rules',
    /**
     * @description Label for the number of type selectors in the CSS overview report
     */
    typeSelectors: 'Type selectors',
    /**
     * @description Label for the number of ID selectors in the CSS overview report
     */
    idSelectors: 'ID selectors',
    /**
     * @description Label for the number of class selectors in the CSS overview report
     */
    classSelectors: 'Class selectors',
    /**
     * @description Label for the number of universal selectors in the CSS overview report
     */
    universalSelectors: 'Universal selectors',
    /**
     * @description Label for the number of Attribute selectors in the CSS overview report
     */
    attributeSelectors: 'Attribute selectors',
    /**
     * @description Label for the number of non-simple selectors in the CSS overview report
     */
    nonsimpleSelectors: 'Non-simple selectors',
    /**
     * @description Label for unique background colors in the CSS overview panel
     * @example {32} PH1
     */
    backgroundColorsS: 'Background colors: {PH1}',
    /**
     * @description Label for unique text colors in the CSS overview panel
     * @example {32} PH1
     */
    textColorsS: 'Text colors: {PH1}',
    /**
     * @description Label for unique fill colors in the CSS overview panel
     * @example {32} PH1
     */
    fillColorsS: 'Fill colors: {PH1}',
    /**
     * @description Label for unique border colors in the CSS overview panel
     * @example {32} PH1
     */
    borderColorsS: 'Border colors: {PH1}',
    /**
     * @description Label to indicate that there are no fonts in use
     */
    thereAreNoFonts: 'There are no fonts.',
    /**
     * @description Message to show when no unused declarations in the target page
     */
    thereAreNoUnusedDeclarations: 'There are no unused declarations.',
    /**
     * @description Message to show when no media queries are found in the target page
     */
    thereAreNoMediaQueries: 'There are no media queries.',
    /**
     * @description Title of the Drawer for contrast issues in the CSS overview panel
     */
    contrastIssues: 'Contrast issues',
    /**
     * @description Text to indicate how many times this CSS rule showed up.
     */
    nOccurrences: '{n, plural, =1 {# occurrence} other {# occurrences}}',
    /**
     * @description Section header for contrast issues in the CSS overview panel
     * @example {1} PH1
     */
    contrastIssuesS: 'Contrast issues: {PH1}',
    /**
     * @description Title of the button for a contrast issue in the CSS overview panel
     * @example {#333333} PH1
     * @example {#333333} PH2
     * @example {2} PH3
     */
    textColorSOverSBackgroundResults: 'Text color {PH1} over {PH2} background results in low contrast for {PH3} elements',
    /**
     * @description Label aa text content in Contrast Details of the Color Picker
     */
    aa: 'AA',
    /**
     * @description Label aaa text content in Contrast Details of the Color Picker
     */
    aaa: 'AAA',
    /**
     * @description Label for the APCA contrast in Color Picker
     */
    apca: 'APCA',
    /**
     * @description Label for the column in the element list in the CSS overview report
     */
    element: 'Element',
    /**
     * @description Column header title denoting which declaration is unused
     */
    declaration: 'Declaration',
    /**
     * @description Text for the source of something
     */
    source: 'Source',
    /**
     * @description Text of a DOM element in Contrast Details of the Color Picker
     */
    contrastRatio: 'Contrast ratio',
    /**
     * @description Accessible title of a table in the CSS overview elements.
     */
    cssOverviewElements: 'CSS overview elements',
    /**
     * @description Title of the button to show the element in the CSS overview panel
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
};
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewCompletedView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function getBorderString(color) {
    let { h, s, l } = color.as("hsl" /* Common.Color.Format.HSL */);
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    // Reduce the lightness of the border to make sure that there's always a visible outline.
    l = Math.max(0, l - 15);
    return `1px solid hsl(${h}deg ${s}% ${l}%)`;
}
const formatter = new Intl.NumberFormat('en-US');
export const DEFAULT_VIEW = (input, output, target) => {
    function revealSection(section, setFocus) {
        if (!section) {
            return;
        }
        section.scrollIntoView();
        // Set focus for keyboard invoked event
        if (setFocus) {
            const focusableElement = section.querySelector('button, [tabindex="0"]');
            focusableElement?.focus();
        }
    }
    // clang-format off
    render(html `
      <style>${cssOverviewCompletedViewStyles}</style>
      <devtools-split-view direction="column" sidebar-position="first" sidebar-initial-size="200">
        <devtools-widget slot="sidebar" .widgetConfig=${widgetConfig(CSSOverviewSidebarPanel, {
        minimumSize: new Geometry.Size(100, 25),
        items: [
            { name: i18nString(UIStrings.overviewSummary), id: 'summary' },
            { name: i18nString(UIStrings.colors), id: 'colors' },
            { name: i18nString(UIStrings.fontInfo), id: 'font-info' },
            { name: i18nString(UIStrings.unusedDeclarations), id: 'unused-declarations' },
            { name: i18nString(UIStrings.mediaQueries), id: 'media-queries' }
        ],
        selectedId: input.selectedSection,
        onItemSelected: input.onSectionSelected,
        onReset: input.onReset,
    })}>
        </devtools-widget>
        <devtools-split-view sidebar-position="second" slot="main" direction="row" sidebar-initial-size="minimized">
          <div class="vbox overview-completed-view" slot="main" @click=${input.onClick}>
            <!-- Dupe the styles into the main container because of the shadow root will prevent outer styles. -->
            <style>${cssOverviewCompletedViewStyles}</style>
            <div class="results-section horizontally-padded summary"
                  ${ref(e => { output.revealSection.set('summary', revealSection.bind(null, e)); })}>
              <h1>${i18nString(UIStrings.overviewSummary)}</h1>
              ${renderSummary(input.elementCount, input.globalStyleStats, input.mediaQueries)}
            </div>
            <div class="results-section horizontally-padded colors"
                ${ref(e => { output.revealSection.set('colors', revealSection.bind(null, e)); })}>
                <h1>${i18nString(UIStrings.colors)}</h1>
                ${renderColors(input.backgroundColors, input.textColors, input.textColorContrastIssues, input.fillColors, input.borderColors)}
              </div>
              <div class="results-section font-info"
                    ${ref(e => { output.revealSection.set('font-info', revealSection.bind(null, e)); })}>
                <h1>${i18nString(UIStrings.fontInfo)}</h1>
                ${renderFontInfo(input.fontInfo)}
              </div>
              <div class="results-section unused-declarations"
                    ${ref(e => { output.revealSection.set('unused-declarations', revealSection.bind(null, e)); })}>
                <h1>${i18nString(UIStrings.unusedDeclarations)}</h1>
                ${renderUnusedDeclarations(input.unusedDeclarations)}
              </div>
              <div class="results-section media-queries"
                    ${ref(e => { output.revealSection.set('media-queries', revealSection.bind(null, e)); })}>
              <h1>${i18nString(UIStrings.mediaQueries)}</h1>
              ${renderMediaQueries(input.mediaQueries)}
            </div>
          </div>
          <devtools-widget slot="sidebar" .widgetConfig=${widgetConfig(e => {
        const tabbedPane = new UI.TabbedPane.TabbedPane(e);
        output.closeAllTabs = () => { tabbedPane.closeTabs(tabbedPane.tabIds()); };
        output.addTab = (id, tabTitle, view, jslogContext) => {
            if (!tabbedPane.hasTab(id)) {
                tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, 
                /* isCloseable */ true, undefined, undefined, jslogContext);
            }
            tabbedPane.selectTab(id);
            const splitView = tabbedPane.parentWidget();
            splitView.setSidebarMinimized(false);
        };
        tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, _ => {
            if (tabbedPane.tabIds().length === 0) {
                const splitView = tabbedPane.parentWidget();
                splitView.setSidebarMinimized(true);
            }
        });
        return tabbedPane;
    })}>
          </devtools-widget>
        </devtools-split-view>
      </devtools-split-view>`, target);
    // clang-format on
};
function renderSummary(elementCount, globalStyleStats, mediaQueries) {
    const renderSummaryItem = (label, value) => html `
    <li>
      <div class="label">${label}</div>
      <div class="value">${formatter.format(value)}</div>
    </li>`;
    return html `<ul>
    ${renderSummaryItem(i18nString(UIStrings.elements), elementCount)}
    ${renderSummaryItem(i18nString(UIStrings.externalStylesheets), globalStyleStats.externalSheets)}
    ${renderSummaryItem(i18nString(UIStrings.inlineStyleElements), globalStyleStats.inlineStyles)}
    ${renderSummaryItem(i18nString(UIStrings.styleRules), globalStyleStats.styleRules)}
    ${renderSummaryItem(i18nString(UIStrings.mediaQueries), mediaQueries.length)}
    ${renderSummaryItem(i18nString(UIStrings.typeSelectors), globalStyleStats.stats.type)}
    ${renderSummaryItem(i18nString(UIStrings.idSelectors), globalStyleStats.stats.id)}
    ${renderSummaryItem(i18nString(UIStrings.classSelectors), globalStyleStats.stats.class)}
    ${renderSummaryItem(i18nString(UIStrings.universalSelectors), globalStyleStats.stats.universal)}
    ${renderSummaryItem(i18nString(UIStrings.attributeSelectors), globalStyleStats.stats.attribute)}
    ${renderSummaryItem(i18nString(UIStrings.nonsimpleSelectors), globalStyleStats.stats.nonSimple)}
  </ul>`;
}
function renderColors(backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors) {
    // clang-format off
    return html `
    <h2>${i18nString(UIStrings.backgroundColorsS, { PH1: backgroundColors.length })}</h2>
    <ul>${backgroundColors.map(c => renderColor('background', c))}</ul>

    <h2>${i18nString(UIStrings.textColorsS, { PH1: textColors.length })}</h2>
    <ul>${textColors.map(c => renderColor('text', c))}</ul>

    ${textColorContrastIssues.size > 0 ? renderContrastIssues(textColorContrastIssues) : ''}

    <h2>${i18nString(UIStrings.fillColorsS, { PH1: fillColors.length })}</h2>
    <ul>${fillColors.map(c => renderColor('fill', c))}</ul>

    <h2>${i18nString(UIStrings.borderColorsS, { PH1: borderColors.length })}</h2>
    <ul>${borderColors.map(c => renderColor('border', c))}</ul>`;
    // clang-format on
}
function renderUnusedDeclarations(unusedDeclarations) {
    return unusedDeclarations.length > 0 ?
        renderGroup(unusedDeclarations, 'unused-declarations') :
        html `<div class="horizontally-padded">${i18nString(UIStrings.thereAreNoUnusedDeclarations)}</div>`;
}
function renderMediaQueries(mediaQueries) {
    return mediaQueries.length > 0 ?
        renderGroup(mediaQueries, 'media-queries') :
        html `<div class="horizontally-padded">${i18nString(UIStrings.thereAreNoMediaQueries)}</div>`;
}
function renderFontInfo(fonts) {
    return fonts.length > 0 ? html `${fonts.map(({ font, fontMetrics }) => html `
    <section class="font-family">
      <h2>${font}</h2>
      ${renderFontMetrics(font, fontMetrics)}
    </section>`)}` :
        html `<div>${i18nString(UIStrings.thereAreNoFonts)}</div>`;
}
function renderFontMetrics(font, fontMetricInfo) {
    return html `
    <div class="font-metric">
      ${fontMetricInfo.map(({ label, values }) => html `
        <div>
          <h3>${label}</h3>
          ${renderGroup(values, 'font-info', `${font}/${label}`)}
        </div>`)}
    </div>`;
}
function renderGroup(values, type, path = '') {
    const total = values.reduce((prev, curr) => prev + curr.nodes.length, 0);
    // clang-format off
    return html `
      <ul aria-label=${type}>
        ${values.map(({ title, nodes }) => {
        const width = 100 * nodes.length / total;
        const itemLabel = i18nString(UIStrings.nOccurrences, { n: nodes.length });
        return html `<li>
            <div class="title">${title}</div>
            <button data-type=${type} data-path=${path} data-label=${title}
            jslog=${VisualLogging.action().track({ click: true }).context(`css-overview.${type}`)}
            aria-label=${`${title}: ${itemLabel}`}>
              <div class="details">${itemLabel}</div>
              <div class="bar-container">
                <div class="bar" style=${styleMap({ width })}></div>
              </div>
            </button>
          </li>`;
    })}
  </ul>`;
    // clang-format on
}
function renderContrastIssues(issues) {
    // clang-format off
    return html `
    <h2>${i18nString(UIStrings.contrastIssuesS, { PH1: issues.size })}</h2>
    <ul>
      ${[...issues.entries()].map(([key, value]) => renderContrastIssue(key, value))}
    </ul>`;
    // clang-format on
}
function renderContrastIssue(key, issues) {
    console.assert(issues.length > 0);
    let minContrastIssue = issues[0];
    for (const issue of issues) {
        // APCA contrast can be a negative value that is to be displayed. But the
        // absolute value is used to compare against the threshold. Therefore, the min
        // absolute value is the worst contrast.
        if (Math.abs(issue.contrastRatio) < Math.abs(minContrastIssue.contrastRatio)) {
            minContrastIssue = issue;
        }
    }
    const color = (minContrastIssue.textColor.asString("hexa" /* Common.Color.Format.HEXA */));
    const backgroundColor = (minContrastIssue.backgroundColor.asString("hexa" /* Common.Color.Format.HEXA */));
    const showAPCA = Root.Runtime.experiments.isEnabled('apca');
    const title = i18nString(UIStrings.textColorSOverSBackgroundResults, {
        PH1: color,
        PH2: backgroundColor,
        PH3: issues.length,
    });
    const border = getBorderString(minContrastIssue.backgroundColor.asLegacyColor());
    // clang-format off
    return html `<li>
    <button
      title=${title} aria-label=${title}
      data-type="contrast" data-key=${key} data-section="contrast" class="block"
      style=${styleMap({ color, backgroundColor, border })}
      jslog=${VisualLogging.action('css-overview.contrast').track({ click: true })}>
      Text
    </button>
    <div class="block-title">
      ${showAPCA ? html `
        <div class="contrast-warning hidden" $="apca">
          <span class="threshold-label">${i18nString(UIStrings.apca)}</span>
          ${minContrastIssue.thresholdsViolated.apca ? createClearIcon() : createCheckIcon()}
        </div>` : html `
        <div class="contrast-warning hidden">
          <span class="threshold-label">${i18nString(UIStrings.aa)}</span>
          ${minContrastIssue.thresholdsViolated.aa ? createClearIcon() : createCheckIcon()}
        </div>
        <div class="contrast-warning hidden" $="aaa">
          <span class="threshold-label">${i18nString(UIStrings.aaa)}</span>
          ${minContrastIssue.thresholdsViolated.aaa ? createClearIcon() : createCheckIcon()}
        </div>`}
    </div>
  </li>`;
    // clang-format on
}
function renderColor(section, color) {
    const borderColor = Common.Color.parse(color)?.asLegacyColor();
    if (!borderColor) {
        return nothing;
    }
    // clang-format off
    return html `<li>
    <button title=${color} data-type="color" data-color=${color}
      data-section=${section} class="block"
      style=${styleMap({ backgroundColor: color, border: getBorderString(borderColor) })}
      jslog=${VisualLogging.action('css-overview.color').track({ click: true })}>
    </button>
    <div class="block-title color-text">${color}</div>
  </li>`;
    // clang-format on
}
export class CSSOverviewCompletedView extends UI.Widget.VBox {
    onReset = () => { };
    #selectedSection = 'summary';
    #cssModel;
    #domModel;
    #linkifier;
    #viewMap;
    #data;
    #view;
    #viewOutput = {
        revealSection: new Map(),
        closeAllTabs: () => { },
        addTab: (_id, _tabTitle, _view, _jslogContext) => { }
    };
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.registerRequiredCSS(cssOverviewCompletedViewStyles);
        this.#linkifier = new Components.Linkifier.Linkifier(/* maxLinkLength */ 20, /* useLinkDecorator */ true);
        this.#viewMap = new Map();
        this.#data = null;
    }
    set target(target) {
        if (!target) {
            return;
        }
        const cssModel = target.model(SDK.CSSModel.CSSModel);
        const domModel = target.model(SDK.DOMModel.DOMModel);
        if (!cssModel || !domModel) {
            throw new Error('Target must provide CSS and DOM models');
        }
        this.#cssModel = cssModel;
        this.#domModel = domModel;
    }
    #onSectionSelected(sectionId, withKeyboard) {
        const revealSection = this.#viewOutput.revealSection.get(sectionId);
        if (!revealSection) {
            return;
        }
        revealSection(withKeyboard);
    }
    #onReset() {
        this.#reset();
        this.onReset();
    }
    #reset() {
        this.#viewOutput.closeAllTabs();
        this.#viewMap = new Map();
        CSSOverviewCompletedView.pushedNodes.clear();
        this.#selectedSection = 'summary';
        this.requestUpdate();
    }
    #onClick(evt) {
        if (!evt.target) {
            return;
        }
        const target = evt.target;
        const dataset = target.dataset;
        const type = dataset.type;
        if (!type || !this.#data) {
            return;
        }
        let payload;
        switch (type) {
            case 'contrast': {
                const section = dataset.section;
                const key = dataset.key;
                if (!key) {
                    return;
                }
                // Remap the Set to an object that is the same shape as the unused declarations.
                const nodes = this.#data.textColorContrastIssues.get(key) || [];
                payload = { type, key, nodes, section };
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
                nodes = Array.from(nodes).map(nodeId => ({ nodeId }));
                payload = { type, color, nodes, section };
                break;
            }
            case 'unused-declarations': {
                const declaration = dataset.label;
                if (!declaration) {
                    return;
                }
                const nodes = this.#data.unusedDeclarations.get(declaration);
                if (!nodes) {
                    return;
                }
                payload = { type, declaration, nodes };
                break;
            }
            case 'media-queries': {
                const text = dataset.label;
                if (!text) {
                    return;
                }
                const nodes = this.#data.mediaQueries.get(text);
                if (!nodes) {
                    return;
                }
                payload = { type, text, nodes };
                break;
            }
            case 'font-info': {
                const value = dataset.label;
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
                const nodes = nodesIds.map(nodeId => ({ nodeId }));
                const name = `${value} (${fontFamily}, ${fontMetric})`;
                payload = { type, name, nodes };
                break;
            }
            default:
                return;
        }
        evt.consume();
        this.#createElementsView(payload);
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#data || !('backgroundColors' in this.#data) || !('textColors' in this.#data)) {
            return;
        }
        const viewInput = {
            elementCount: this.#data.elementCount,
            backgroundColors: this.#sortColorsByLuminance(this.#data.backgroundColors),
            textColors: this.#sortColorsByLuminance(this.#data.textColors),
            textColorContrastIssues: this.#data.textColorContrastIssues,
            fillColors: this.#sortColorsByLuminance(this.#data.fillColors),
            borderColors: this.#sortColorsByLuminance(this.#data.borderColors),
            globalStyleStats: this.#data.globalStyleStats,
            mediaQueries: this.#sortGroupBySize(this.#data.mediaQueries),
            unusedDeclarations: this.#sortGroupBySize(this.#data.unusedDeclarations),
            fontInfo: this.#sortFontInfo(this.#data.fontInfo),
            selectedSection: this.#selectedSection,
            onClick: this.#onClick.bind(this),
            onSectionSelected: this.#onSectionSelected.bind(this),
            onReset: this.#onReset.bind(this),
        };
        this.#view(viewInput, this.#viewOutput, this.element);
    }
    #createElementsView(payload) {
        let id = '';
        let tabTitle = '';
        switch (payload.type) {
            case 'contrast': {
                const { section, key } = payload;
                id = `${section}-${key}`;
                tabTitle = i18nString(UIStrings.contrastIssues);
                break;
            }
            case 'color': {
                const { section, color } = payload;
                id = `${section}-${color}`;
                tabTitle = `${color.toUpperCase()} (${section})`;
                break;
            }
            case 'unused-declarations': {
                const { declaration } = payload;
                id = `${declaration}`;
                tabTitle = `${declaration}`;
                break;
            }
            case 'media-queries': {
                const { text } = payload;
                id = `${text}`;
                tabTitle = `${text}`;
                break;
            }
            case 'font-info': {
                const { name } = payload;
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
        this.#viewOutput.addTab(id, tabTitle, view, payload.type);
    }
    #sortColorsByLuminance(srcColors) {
        return Array.from(srcColors.keys()).sort((colA, colB) => {
            const colorA = Common.Color.parse(colA)?.asLegacyColor();
            const colorB = Common.Color.parse(colB)?.asLegacyColor();
            if (!colorA || !colorB) {
                return 0;
            }
            return Common.ColorUtils.luminance(colorB.rgba()) - Common.ColorUtils.luminance(colorA.rgba());
        });
    }
    #sortFontInfo(fontInfo) {
        const fonts = Array.from(fontInfo.entries());
        return fonts.map(([font, fontMetrics]) => {
            const fontMetricInfo = Array.from(fontMetrics.entries());
            return {
                font,
                fontMetrics: fontMetricInfo.map(([label, values]) => {
                    return { label, values: this.#sortGroupBySize(values) };
                })
            };
        });
    }
    #sortGroupBySize(items) {
        // Sort by number of items descending.
        return Array.from(items.entries())
            .sort((d1, d2) => {
            const v1Nodes = d1[1];
            const v2Nodes = d2[1];
            return v2Nodes.length - v1Nodes.length;
        })
            .map(([title, nodes]) => ({ title, nodes }));
    }
    set overviewData(data) {
        this.#data = data;
        this.requestUpdate();
    }
    static pushedNodes = new Set();
}
export const ELEMENT_DETAILS_DEFAULT_VIEW = (input, _output, target) => {
    const { items, visibility } = input;
    // clang-format off
    render(html `
    <div>
      <devtools-data-grid class="element-grid" striped inline
         name=${i18nString(UIStrings.cssOverviewElements)}>
        <table>
          <tr>
            ${visibility.has('node-id') ? html `
              <th id="node-id" weight="50" sortable>
                ${i18nString(UIStrings.element)}
              </th>` : nothing}
            ${visibility.has('declaration') ? html `
              <th id="declaration" weight="50" sortable>
                ${i18nString(UIStrings.declaration)}
              </th>` : nothing}
            ${visibility.has('source-url') ? html `
              <th id="source-url" weight="100">
                ${i18nString(UIStrings.source)}
              </th>` : nothing}
            ${visibility.has('contrast-ratio') ? html `
              <th id="contrast-ratio" weight="25" width="150px" sortable fixed>
                ${i18nString(UIStrings.contrastRatio)}
              </th>` : nothing}
          </tr>
          ${items.map(({ data, link, showNode }) => html `
            <tr>
              ${visibility.has('node-id') ? renderNode(data, link, showNode) : nothing}
              ${visibility.has('declaration') ? renderDeclaration(data) : nothing}
              ${visibility.has('source-url') ? renderSourceURL(data, link) : nothing}
              ${visibility.has('contrast-ratio') ? renderContrastRatio(data) : nothing}
            </tr>`)}
        </table>
      </devtools-data-grid>
    </div>`, target);
    // clang-format on
};
export class ElementDetailsView extends UI.Widget.Widget {
    #domModel;
    #cssModel;
    #linkifier;
    #data;
    #view;
    constructor(domModel, cssModel, linkifier, view = ELEMENT_DETAILS_DEFAULT_VIEW) {
        super();
        this.#domModel = domModel;
        this.#cssModel = cssModel;
        this.#linkifier = linkifier;
        this.#view = view;
        this.#data = [];
    }
    set data(data) {
        this.#data = data;
        this.requestUpdate();
    }
    async performUpdate() {
        const visibility = new Set();
        if (!this.#data.length) {
            this.#view({ items: [], visibility }, {}, this.element);
            return;
        }
        const [firstItem] = this.#data;
        'nodeId' in firstItem && firstItem.nodeId && visibility.add('node-id');
        'declaration' in firstItem && firstItem.declaration && visibility.add('declaration');
        'sourceURL' in firstItem && firstItem.sourceURL && visibility.add('source-url');
        'contrastRatio' in firstItem && firstItem.contrastRatio && visibility.add('contrast-ratio');
        let relatedNodesMap;
        if ('nodeId' in firstItem && visibility.has('node-id')) {
            // Grab the nodes from the frontend, but only those that have not been
            // retrieved already.
            const nodeIds = this.#data.reduce((prev, curr) => {
                const nodeId = curr.nodeId;
                if (CSSOverviewCompletedView.pushedNodes.has(nodeId)) {
                    return prev;
                }
                CSSOverviewCompletedView.pushedNodes.add(nodeId);
                return prev.add(nodeId);
            }, new Set());
            relatedNodesMap = await this.#domModel.pushNodesByBackendIdsToFrontend(nodeIds);
        }
        const items = await Promise.all(this.#data.map(async (item) => {
            let link, showNode;
            if ('nodeId' in item && visibility.has('node-id')) {
                const frontendNode = relatedNodesMap?.get(item.nodeId) ?? null;
                if (frontendNode) {
                    link = await Common.Linkifier.Linkifier.linkify(frontendNode);
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
                    link = this.#linkifier.linkifyCSSLocation(matchingSelectorLocation);
                }
            }
            return { data: item, link, showNode };
        }));
        this.#view({ items, visibility }, {}, this.element);
    }
}
function renderNode(data, link, showNode) {
    if (!link) {
        return nothing;
    }
    return html `
    <td>
      ${link}
      <devtools-icon part="show-element" name="select-element"
          title=${i18nString(UIStrings.showElement)} tabindex="0"
          @click=${() => showNode?.()}></devtools-icon>
    </td>`;
}
function renderDeclaration(data) {
    if (!('declaration' in data)) {
        throw new Error('Declaration entry is missing a declaration.');
    }
    return html `<td>${data.declaration}</td>`;
}
function renderSourceURL(data, link) {
    if ('range' in data && data.range) {
        if (!link) {
            return html `<td>${i18nString(UIStrings.unableToLink)}</td>`;
        }
        return html `<td>${link}</td>`;
    }
    return html `<td>${i18nString(UIStrings.unableToLinkToInlineStyle)}</td>`;
}
function renderContrastRatio(data) {
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
    return html `
    <td>
      <div class="contrast-container-in-grid">
          <span class="contrast-preview" style=${styleMap({ border, color, backgroundColor })}>Aa</span>
          <span>${contrastRatioString}</span>
          ${showAPCA ?
        html `
            <span>${i18nString(UIStrings.apca)}</span>${data.thresholdsViolated.apca ? createClearIcon() : createCheckIcon()}`
        : html `
            <span>${i18nString(UIStrings.aa)}</span>${data.thresholdsViolated.aa ? createClearIcon() : createCheckIcon()}
            <span>${i18nString(UIStrings.aaa)}</span>${data.thresholdsViolated.aaa ? createClearIcon() : createCheckIcon()}`}
      </div>
    </td>`;
    // clang-format on
}
function createClearIcon() {
    return html `
    <devtools-icon name="clear" class="small" style="color:var(--icon-error);"></devtools-icon>`;
}
function createCheckIcon() {
    return html `
    <devtools-icon name="checkmark" class="small"
        style="color:var(--icon-checkmark-green);></devtools-icon>`;
}
//# sourceMappingURL=CSSOverviewCompletedView.js.map