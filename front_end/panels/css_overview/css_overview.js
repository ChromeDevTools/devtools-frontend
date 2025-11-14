var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/css_overview/CSSOverviewUnusedDeclarations.js
var CSSOverviewUnusedDeclarations_exports = {};
__export(CSSOverviewUnusedDeclarations_exports, {
  CSSOverviewUnusedDeclarations: () => CSSOverviewUnusedDeclarations
});
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Label to explain why top values are ignored
   */
  topAppliedToAStatically: "`Top` applied to a statically positioned element",
  /**
   * @description Label to explain why left (opposite to right) values are ignored.
   */
  leftAppliedToAStatically: "`Left` applied to a statically positioned element",
  /**
   * @description Label to explain why right values are ignored
   */
  rightAppliedToAStatically: "`Right` applied to a statically positioned element",
  /**
   * @description Label to explain why bottom values are ignored
   */
  bottomAppliedToAStatically: "`Bottom` applied to a statically positioned element",
  /**
   * @description Label to explain why width values are ignored
   */
  widthAppliedToAnInlineElement: "`Width` applied to an inline element",
  /**
   * @description Label to explain why height values are ignored
   */
  heightAppliedToAnInlineElement: "`Height` applied to an inline element",
  /**
   * @description Label to explain why vertical-align values are ignored
   */
  verticalAlignmentAppliedTo: "Vertical alignment applied to element which is neither `inline` nor `table-cell`"
};
var str_ = i18n.i18n.registerUIStrings("panels/css_overview/CSSOverviewUnusedDeclarations.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var CSSOverviewUnusedDeclarations = class {
  static add(target, key, item2) {
    const values = target.get(key) || [];
    values.push(item2);
    target.set(key, values);
  }
  static checkForUnusedPositionValues(unusedDeclarations, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx) {
    if (strings[positionIdx] !== "static") {
      return;
    }
    if (strings[topIdx] !== "auto") {
      const reason = i18nString(UIStrings.topAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `top: ${strings[topIdx]}`,
        nodeId
      });
    }
    if (strings[leftIdx] !== "auto") {
      const reason = i18nString(UIStrings.leftAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `left: ${strings[leftIdx]}`,
        nodeId
      });
    }
    if (strings[rightIdx] !== "auto") {
      const reason = i18nString(UIStrings.rightAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `right: ${strings[rightIdx]}`,
        nodeId
      });
    }
    if (strings[bottomIdx] !== "auto") {
      const reason = i18nString(UIStrings.bottomAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `bottom: ${strings[bottomIdx]}`,
        nodeId
      });
    }
  }
  static checkForUnusedWidthAndHeightValues(unusedDeclarations, nodeId, strings, displayIdx, widthIdx, heightIdx) {
    if (strings[displayIdx] !== "inline") {
      return;
    }
    if (strings[widthIdx] !== "auto") {
      const reason = i18nString(UIStrings.widthAppliedToAnInlineElement);
      this.add(unusedDeclarations, reason, {
        declaration: `width: ${strings[widthIdx]}`,
        nodeId
      });
    }
    if (strings[heightIdx] !== "auto") {
      const reason = i18nString(UIStrings.heightAppliedToAnInlineElement);
      this.add(unusedDeclarations, reason, {
        declaration: `height: ${strings[heightIdx]}`,
        nodeId
      });
    }
  }
  static checkForInvalidVerticalAlignment(unusedDeclarations, nodeId, strings, displayIdx, verticalAlignIdx) {
    if (!strings[displayIdx] || strings[displayIdx].startsWith("inline") || strings[displayIdx].startsWith("table")) {
      return;
    }
    if (strings[verticalAlignIdx] !== "baseline") {
      const reason = i18nString(UIStrings.verticalAlignmentAppliedTo);
      this.add(unusedDeclarations, reason, {
        declaration: `vertical-align: ${strings[verticalAlignIdx]}`,
        nodeId
      });
    }
  }
};

// gen/front_end/panels/css_overview/CSSOverviewModel.js
var CSSOverviewModel_exports = {};
__export(CSSOverviewModel_exports, {
  CSSOverviewModel: () => CSSOverviewModel
});
import * as Common from "./../../core/common/common.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as ColorPicker from "./../../ui/legacy/components/color_picker/color_picker.js";
var CSSOverviewModel = class extends SDK.SDKModel.SDKModel {
  #runtimeAgent;
  #cssAgent;
  #domSnapshotAgent;
  constructor(target) {
    super(target);
    this.#runtimeAgent = target.runtimeAgent();
    this.#cssAgent = target.cssAgent();
    this.#domSnapshotAgent = target.domsnapshotAgent();
  }
  async getNodeStyleStats() {
    const backgroundColors = /* @__PURE__ */ new Map();
    const textColors = /* @__PURE__ */ new Map();
    const textColorContrastIssues = /* @__PURE__ */ new Map();
    const fillColors = /* @__PURE__ */ new Map();
    const borderColors = /* @__PURE__ */ new Map();
    const fontInfo = /* @__PURE__ */ new Map();
    const unusedDeclarations = /* @__PURE__ */ new Map();
    const snapshotConfig = {
      computedStyles: [
        "background-color",
        "color",
        "fill",
        "border-top-width",
        "border-top-color",
        "border-bottom-width",
        "border-bottom-color",
        "border-left-width",
        "border-left-color",
        "border-right-width",
        "border-right-color",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "position",
        "top",
        "right",
        "bottom",
        "left",
        "display",
        "width",
        "height",
        "vertical-align"
      ],
      includeTextColorOpacities: true,
      includeBlendedBackgroundColors: true
    };
    const formatColor = (color) => {
      if (color instanceof Common.Color.Legacy) {
        return color.hasAlpha() ? color.asString(
          "hexa"
          /* Common.Color.Format.HEXA */
        ) : color.asString(
          "hex"
          /* Common.Color.Format.HEX */
        );
      }
      return color.asString();
    };
    const storeColor = (id, nodeId, target) => {
      if (id === -1) {
        return;
      }
      const colorText = strings[id];
      if (!colorText) {
        return;
      }
      const color = Common.Color.parse(colorText);
      if (!color || color.asLegacyColor().rgba()[3] === 0) {
        return;
      }
      const colorFormatted = formatColor(color);
      if (!colorFormatted) {
        return;
      }
      const colorValues = target.get(colorFormatted) || /* @__PURE__ */ new Set();
      colorValues.add(nodeId);
      target.set(colorFormatted, colorValues);
      return color;
    };
    const isSVGNode = (nodeName) => {
      const validNodes = /* @__PURE__ */ new Set([
        "altglyph",
        "circle",
        "ellipse",
        "path",
        "polygon",
        "polyline",
        "rect",
        "svg",
        "text",
        "textpath",
        "tref",
        "tspan"
      ]);
      return validNodes.has(nodeName.toLowerCase());
    };
    const isReplacedContent = (nodeName) => {
      const validNodes = /* @__PURE__ */ new Set(["iframe", "video", "embed", "img"]);
      return validNodes.has(nodeName.toLowerCase());
    };
    const isTableElementWithDefaultStyles = (nodeName, display) => {
      const validNodes = /* @__PURE__ */ new Set(["tr", "td", "thead", "tbody"]);
      return validNodes.has(nodeName.toLowerCase()) && display.startsWith("table");
    };
    let elementCount = 0;
    const { documents, strings } = await this.#domSnapshotAgent.invoke_captureSnapshot(snapshotConfig);
    for (const { nodes, layout } of documents) {
      elementCount += layout.nodeIndex.length;
      for (let idx = 0; idx < layout.styles.length; idx++) {
        const styles = layout.styles[idx];
        const nodeIdx = layout.nodeIndex[idx];
        if (!nodes.backendNodeId || !nodes.nodeName) {
          continue;
        }
        const nodeId = nodes.backendNodeId[nodeIdx];
        const nodeName = nodes.nodeName[nodeIdx];
        const [backgroundColorIdx, textColorIdx, fillIdx, borderTopWidthIdx, borderTopColorIdx, borderBottomWidthIdx, borderBottomColorIdx, borderLeftWidthIdx, borderLeftColorIdx, borderRightWidthIdx, borderRightColorIdx, fontFamilyIdx, fontSizeIdx, fontWeightIdx, lineHeightIdx, positionIdx, topIdx, rightIdx, bottomIdx, leftIdx, displayIdx, widthIdx, heightIdx, verticalAlignIdx] = styles;
        storeColor(backgroundColorIdx, nodeId, backgroundColors);
        const textColor = storeColor(textColorIdx, nodeId, textColors);
        if (isSVGNode(strings[nodeName])) {
          storeColor(fillIdx, nodeId, fillColors);
        }
        if (strings[borderTopWidthIdx] !== "0px") {
          storeColor(borderTopColorIdx, nodeId, borderColors);
        }
        if (strings[borderBottomWidthIdx] !== "0px") {
          storeColor(borderBottomColorIdx, nodeId, borderColors);
        }
        if (strings[borderLeftWidthIdx] !== "0px") {
          storeColor(borderLeftColorIdx, nodeId, borderColors);
        }
        if (strings[borderRightWidthIdx] !== "0px") {
          storeColor(borderRightColorIdx, nodeId, borderColors);
        }
        if (fontFamilyIdx && fontFamilyIdx !== -1) {
          const fontFamily = strings[fontFamilyIdx];
          const fontFamilyInfo = fontInfo.get(fontFamily) || /* @__PURE__ */ new Map();
          const sizeLabel = "font-size";
          const weightLabel = "font-weight";
          const lineHeightLabel = "line-height";
          const size = fontFamilyInfo.get(sizeLabel) || /* @__PURE__ */ new Map();
          const weight = fontFamilyInfo.get(weightLabel) || /* @__PURE__ */ new Map();
          const lineHeight = fontFamilyInfo.get(lineHeightLabel) || /* @__PURE__ */ new Map();
          if (fontSizeIdx !== -1) {
            const fontSizeValue = strings[fontSizeIdx];
            const nodes2 = size.get(fontSizeValue) || [];
            nodes2.push(nodeId);
            size.set(fontSizeValue, nodes2);
          }
          if (fontWeightIdx !== -1) {
            const fontWeightValue = strings[fontWeightIdx];
            const nodes2 = weight.get(fontWeightValue) || [];
            nodes2.push(nodeId);
            weight.set(fontWeightValue, nodes2);
          }
          if (lineHeightIdx !== -1) {
            const lineHeightValue = strings[lineHeightIdx];
            const nodes2 = lineHeight.get(lineHeightValue) || [];
            nodes2.push(nodeId);
            lineHeight.set(lineHeightValue, nodes2);
          }
          fontFamilyInfo.set(sizeLabel, size);
          fontFamilyInfo.set(weightLabel, weight);
          fontFamilyInfo.set(lineHeightLabel, lineHeight);
          fontInfo.set(fontFamily, fontFamilyInfo);
        }
        const blendedBackgroundColor = textColor && layout.blendedBackgroundColors && layout.blendedBackgroundColors[idx] !== -1 ? Common.Color.parse(strings[layout.blendedBackgroundColors[idx]]) : null;
        if (textColor && blendedBackgroundColor) {
          const contrastInfo = new ColorPicker.ContrastInfo.ContrastInfo({
            backgroundColors: [blendedBackgroundColor.asString(
              "hexa"
              /* Common.Color.Format.HEXA */
            )],
            computedFontSize: fontSizeIdx !== -1 ? strings[fontSizeIdx] : "",
            computedFontWeight: fontWeightIdx !== -1 ? strings[fontWeightIdx] : ""
          });
          const blendedTextColor = textColor.asLegacyColor().blendWithAlpha(layout.textColorOpacities ? layout.textColorOpacities[idx] : 1);
          contrastInfo.setColor(blendedTextColor);
          const formattedTextColor = formatColor(blendedTextColor);
          const formattedBackgroundColor = formatColor(blendedBackgroundColor.asLegacyColor());
          const key = `${formattedTextColor}_${formattedBackgroundColor}`;
          if (Root.Runtime.experiments.isEnabled("apca")) {
            const contrastRatio = contrastInfo.contrastRatioAPCA();
            const threshold = contrastInfo.contrastRatioAPCAThreshold();
            const passes = contrastRatio && threshold ? Math.abs(contrastRatio) >= threshold : false;
            if (!passes && contrastRatio) {
              const issue = {
                nodeId,
                contrastRatio,
                textColor: blendedTextColor,
                backgroundColor: blendedBackgroundColor,
                thresholdsViolated: {
                  aa: false,
                  aaa: false,
                  apca: true
                }
              };
              if (textColorContrastIssues.has(key)) {
                textColorContrastIssues.get(key).push(issue);
              } else {
                textColorContrastIssues.set(key, [issue]);
              }
            }
          } else {
            const aaThreshold = contrastInfo.contrastRatioThreshold("aa") || 0;
            const aaaThreshold = contrastInfo.contrastRatioThreshold("aaa") || 0;
            const contrastRatio = contrastInfo.contrastRatio() || 0;
            if (aaThreshold > contrastRatio || aaaThreshold > contrastRatio) {
              const issue = {
                nodeId,
                contrastRatio,
                textColor: blendedTextColor,
                backgroundColor: blendedBackgroundColor,
                thresholdsViolated: {
                  aa: aaThreshold > contrastRatio,
                  aaa: aaaThreshold > contrastRatio,
                  apca: false
                }
              };
              if (textColorContrastIssues.has(key)) {
                textColorContrastIssues.get(key).push(issue);
              } else {
                textColorContrastIssues.set(key, [issue]);
              }
            }
          }
        }
        CSSOverviewUnusedDeclarations.checkForUnusedPositionValues(unusedDeclarations, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx);
        if (!isSVGNode(strings[nodeName]) && !isReplacedContent(strings[nodeName])) {
          CSSOverviewUnusedDeclarations.checkForUnusedWidthAndHeightValues(unusedDeclarations, nodeId, strings, displayIdx, widthIdx, heightIdx);
        }
        if (verticalAlignIdx !== -1 && !isTableElementWithDefaultStyles(strings[nodeName], strings[displayIdx])) {
          CSSOverviewUnusedDeclarations.checkForInvalidVerticalAlignment(unusedDeclarations, nodeId, strings, displayIdx, verticalAlignIdx);
        }
      }
    }
    return {
      backgroundColors,
      textColors,
      textColorContrastIssues,
      fillColors,
      borderColors,
      fontInfo,
      unusedDeclarations,
      elementCount
    };
  }
  getComputedStyleForNode(nodeId) {
    return this.#cssAgent.invoke_getComputedStyleForNode({ nodeId });
  }
  async getMediaQueries() {
    const queries = await this.#cssAgent.invoke_getMediaQueries();
    const queryMap = /* @__PURE__ */ new Map();
    if (!queries) {
      return queryMap;
    }
    for (const query of queries.medias) {
      if (query.source === "linkedSheet") {
        continue;
      }
      const entries = queryMap.get(query.text) || [];
      entries.push(query);
      queryMap.set(query.text, entries);
    }
    return queryMap;
  }
  async getGlobalStylesheetStats() {
    const expression = `(function() {
      let styleRules = 0;
      let inlineStyles = 0;
      let externalSheets = 0;
      const stats = {
        // Simple.
        type: new Set(),
        class: new Set(),
        id: new Set(),
        universal: new Set(),
        attribute: new Set(),

        // Non-simple.
        nonSimple: new Set()
      };

      for (const styleSheet of document.styleSheets) {
        if (styleSheet.href) {
          externalSheets++;
        } else {
          inlineStyles++;
        }

        // Attempting to grab rules can trigger a DOMException.
        // Try it and if it fails skip to the next stylesheet.
        let rules;
        try {
          rules = styleSheet.rules;
        } catch (err) {
          continue;
        }

        for (const rule of rules) {
          if ('selectorText' in rule) {
            styleRules++;

            // Each group that was used.
            for (const selectorGroup of rule.selectorText.split(',')) {
              // Each selector in the group.
              for (const selector of selectorGroup.split(/[\\t\\n\\f\\r ]+/g)) {
                if (selector.startsWith('.')) {
                  // Class.
                  stats.class.add(selector);
                } else if (selector.startsWith('#')) {
                  // Id.
                  stats.id.add(selector);
                } else if (selector.startsWith('*')) {
                  // Universal.
                  stats.universal.add(selector);
                } else if (selector.startsWith('[')) {
                  // Attribute.
                  stats.attribute.add(selector);
                } else {
                  // Type or non-simple selector.
                  const specialChars = /[#.:\\[\\]|\\+>~]/;
                  if (specialChars.test(selector)) {
                    stats.nonSimple.add(selector);
                  } else {
                    stats.type.add(selector);
                  }
                }
              }
            }
          }
        }
      }

      return {
        styleRules,
        inlineStyles,
        externalSheets,
        stats: {
          // Simple.
          type: stats.type.size,
          class: stats.class.size,
          id: stats.id.size,
          universal: stats.universal.size,
          attribute: stats.attribute.size,

          // Non-simple.
          nonSimple: stats.nonSimple.size
        }
      }
    })()`;
    const { result } = await this.#runtimeAgent.invoke_evaluate({ expression, returnByValue: true });
    if (result.type !== "object") {
      return;
    }
    return result.value;
  }
};
SDK.SDKModel.SDKModel.register(CSSOverviewModel, { capabilities: 2, autostart: false });

// gen/front_end/panels/css_overview/CSSOverviewProcessingView.js
var CSSOverviewProcessingView_exports = {};
__export(CSSOverviewProcessingView_exports, {
  CSSOverviewProcessingView: () => CSSOverviewProcessingView,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { html, render } from "./../../ui/lit/lit.js";

// gen/front_end/panels/css_overview/cssOverviewProcessingView.css.js
var cssOverviewProcessingView_css_default = `/**
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.overview-processing-view {
  overflow: hidden;
  padding: 16px;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.overview-processing-view h1 {
  font-size: 16px;
  text-align: center;
  font-weight: normal;
  margin: 0;
  padding: 8px;
}

.overview-processing-view h2 {
  font-size: 12px;
  text-align: center;
  font-weight: normal;
  margin: 0;
  padding-top: 32px;
}

/*# sourceURL=${import.meta.resolve("./cssOverviewProcessingView.css")} */`;

// gen/front_end/panels/css_overview/CSSOverviewProcessingView.js
var UIStrings2 = {
  /**
   * @description Text to cancel something
   */
  cancel: "Cancel"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/css_overview/CSSOverviewProcessingView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <style>${cssOverviewProcessingView_css_default}</style>
    <div style="overflow:auto">
      <div class="vbox overview-processing-view">
        <h1>Processing page</h1>
        <div>
          <devtools-button
              @click=${input.onCancel}
              .jslogContext=${"css-overview.cancel-processing"}
              .variant=${"outlined"}>${i18nString2(UIStrings2.cancel)}</devtools-button>
        </div>
      </div>
    </div>`, target);
};
var CSSOverviewProcessingView = class extends UI.Widget.Widget {
  #onCancel = () => {
  };
  #view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }
  set onCancel(onCancel) {
    this.#onCancel = onCancel;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({ onCancel: this.#onCancel }, {}, this.element);
  }
};

// gen/front_end/panels/css_overview/CSSOverviewCompletedView.js
var CSSOverviewCompletedView_exports = {};
__export(CSSOverviewCompletedView_exports, {
  CSSOverviewCompletedView: () => CSSOverviewCompletedView,
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  ELEMENT_DETAILS_DEFAULT_VIEW: () => ELEMENT_DETAILS_DEFAULT_VIEW,
  ElementDetailsView: () => ElementDetailsView
});
import "./../../ui/legacy/components/data_grid/data_grid.js";
import "./../../ui/components/icon_button/icon_button.js";
import * as Common2 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html3, nothing, render as render3 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon from "./../common/common.js";

// gen/front_end/panels/css_overview/cssOverviewCompletedView.css.js
var cssOverviewCompletedView_css_default = `/**
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .overview-completed-view {
    overflow: auto;

    --overview-default-padding: 28px;
    --overview-icon-padding: 32px;
  }

  .overview-completed-view .summary ul,
  .overview-completed-view .colors ul {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .overview-completed-view .summary ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, 140px);
    gap: 16px;
  }

  .overview-completed-view .colors ul li {
    display: inline-block;
    margin: 0 0 16px;
    padding: 0 8px 0 0;
  }

  .overview-completed-view .summary ul li {
    display: flex;
    flex-direction: column;
    grid-column-start: auto;
  }

  .overview-completed-view li .label {
    font-size: 12px;
    padding-bottom: 2px;
  }

  .overview-completed-view li .value {
    font-size: 17px;
  }

  .overview-completed-view ul li span {
    font-weight: bold;
  }

  .unused-rules-grid .header-container,
  .unused-rules-grid .data-container,
  .unused-rules-grid table.data {
    position: relative;
  }

  .unused-rules-grid .data-container {
    top: 0;
    max-height: 350px;
  }

  .unused-rules-grid {
    border-left: none;
    border-right: none;
  }
  /** Ensure links are rendered at the correct height */

  .unused-rules-grid .monospace {
    display: block;
    height: 18px;
  }

  .element-grid {
    flex: 1;
    border-left: none;
    border-right: none;
    overflow: auto;
  }

  .block {
    width: 65px;
    height: 25px;
    border-radius: 3px;
    margin-right: 16px;
  }

  .block-title {
    padding-top: 4px;
    font-size: 12px;
    color: var(--sys-color-on-surface);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .block-title.color-text {
    text-transform: none;
    max-width: 65px;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: text;
    user-select: text;
    overflow: hidden;
  }

  .results-section {
    flex-shrink: 0;
    border-bottom: 1px solid var(--sys-color-divider);
    padding: var(--overview-default-padding) 0 var(--overview-default-padding) 0;
  }

  .horizontally-padded {
    padding-left: var(--overview-default-padding);
    padding-right: var(--overview-default-padding);
  }

  .results-section h1 {
    font-size: 15px;
    font-weight: normal;
    padding: 0;
    margin: 0 0 20px;
    padding-left: calc(var(--overview-default-padding) + var(--overview-icon-padding));
    position: relative;
    height: 26px;
    line-height: 26px;
  }

  .results-section h1::before {
    content: "";
    display: block;
    position: absolute;
    left: var(--overview-default-padding);
    top: 0;
    width: 26px;
    height: 26px;
    /* stylelint-disable-next-line custom-property-pattern */
    background-image: var(--image-file-cssoverview_icons_2x);
    background-size: 104px 26px;
  }

  .results-section.horizontally-padded h1 {
    padding-left: var(--overview-icon-padding);
  }

  .results-section.horizontally-padded h1::before {
    left: 0;
  }

  .results-section.summary h1 {
    padding-left: 0;
  }

  .results-section.summary h1::before {
    display: none;
  }

  .results-section.colors h1::before {
    background-position: 0 0;
  }

  .results-section.font-info h1::before {
    background-position: -26px 0;
  }

  .results-section.unused-declarations h1::before {
    background-position: -52px 0;
  }

  .results-section.media-queries h1::before {
    background-position: -78px 0;
  }

  .results-section.colors h2 {
    margin-top: 20px;
    font-size: 13px;
    font-weight: normal;
  }

  .overview-completed-view .font-info ul,
  .overview-completed-view .media-queries ul,
  .overview-completed-view .unused-declarations ul {
    width: 100%;
    list-style: none;
    margin: 0;
    padding: 0 var(--overview-default-padding);
  }

  .overview-completed-view .font-info ul li,
  .overview-completed-view .media-queries ul li,
  .overview-completed-view .unused-declarations ul li {
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 12px;
    margin-bottom: 4px;
    align-items: center;
  }

  .overview-completed-view .font-info button .details,
  .overview-completed-view .media-queries button .details,
  .overview-completed-view .unused-declarations button .details {
    min-width: 100px;
    text-align: right;
    margin-right: 8px;
    color: var(--sys-color-primary);
    pointer-events: none;
  }

  .overview-completed-view .font-info button .bar-container,
  .overview-completed-view .media-queries button .bar-container,
  .overview-completed-view .unused-declarations button .bar-container {
    flex: 1;
    pointer-events: none;
  }

  .overview-completed-view .font-info button .bar,
  .overview-completed-view .media-queries button .bar,
  .overview-completed-view .unused-declarations button .bar {
    height: 8px;
    background: var(--sys-color-primary-bright);
    border-radius: 2px;
    min-width: 2px;
  }

  .overview-completed-view .font-info button,
  .overview-completed-view .media-queries button,
  .overview-completed-view .unused-declarations button {
    border: none;
    padding: 0;
    padding-right: 10px;
    margin: 0;
    display: flex;
    align-items: center;
    border-radius: 2px;
    cursor: pointer;
    height: 28px;
    background: none;

    &:focus-visible {
      outline: 2px solid var(--sys-color-state-focus-ring);
    }

    &:hover {
      border-radius: 12px;
      background: var(--sys-color-state-hover-on-subtle);
    }

    &:hover .details,
    &:focus .details {
      color: color-mix(in srgb, var(--sys-color-primary), var(--sys-color-state-hover-on-prominent) 6%);
    }

    &:hover .bar,
    &:focus .bar {
      background-color: color-mix(in srgb, var(--sys-color-primary-bright), var(--sys-color-state-hover-on-prominent) 6%);
      color: var(--sys-color-on-primary);
    }
  }

  .overview-completed-view .font-info .font-metric {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .overview-completed-view .font-info ul {
    padding: 0;
  }

  .overview-completed-view .font-info ul li {
    grid-template-columns: 1fr 4fr;
  }

  .overview-completed-view .font-info h2 {
    font-size: 14px;
    font-weight: bold;
    margin: 0 0 1em;
  }

  .overview-completed-view .font-info h3 {
    font-size: 13px;
    font-weight: normal;
    font-style: italic;
    margin: 0 0 0.5em;
  }

  .overview-completed-view .font-info {
    padding-bottom: 0;
  }

  .overview-completed-view .font-family {
    padding: var(--overview-default-padding);
  }

  .overview-completed-view .font-family:nth-child(2n+1) {
    background: var(--sys-color-cdt-base-container);
  }

  .overview-completed-view .font-family:first-of-type {
    padding-top: 0;
  }

  .contrast-warning {
    display: flex;
    align-items: center;
    margin-top: 2px;
  }

  .contrast-warning .threshold-label {
    font-weight: normal;
    width: 30px;
  }

  .contrast-warning devtools-icon {
    margin-left: 2px;
  }

  .contrast-preview {
    padding: 0 5px;
  }

  .contrast-container-in-grid {
    display: flex;
    align-items: center;
  }

  .contrast-container-in-grid > * {
    margin-right: 5px;
    min-width: initial;
  }

  ::part(node-id-column) {
    align-items: center;
    height: 20px;

    --show-element-display: none;
  }

  ::part(node-id-column):focus,
  ::part(node-id-column):hover {
    --show-element-display: inline-block;
  }

  ::part(show-element) {
    display: var(--show-element-display);
    height: 16px;
    width: 16px;
  }

  .results-section.colors {
    forced-color-adjust: none; /* show colors in high contrast theme */
  }
}

/*# sourceURL=${import.meta.resolve("./cssOverviewCompletedView.css")} */`;

// gen/front_end/panels/css_overview/CSSOverviewSidebarPanel.js
var CSSOverviewSidebarPanel_exports = {};
__export(CSSOverviewSidebarPanel_exports, {
  CSSOverviewSidebarPanel: () => CSSOverviewSidebarPanel,
  DEFAULT_VIEW: () => DEFAULT_VIEW2
});
import "./../../ui/legacy/legacy.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives, html as html2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/css_overview/cssOverviewSidebarPanel.css.js
var cssOverviewSidebarPanel_css_default = `/**
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .overview-sidebar-panel {
    display: flex;
    background: var(--sys-color-cdt-base-container);
    min-width: fit-content;
    flex-direction: column;
  }

  .overview-sidebar-panel-item {
    height: 30px;
    padding-left: 30px;
    display: flex;
    align-items: center;
    color: var(--sys-color-on-surface);
    white-space: nowrap;

    &:hover {
      background: var(--sys-color-state-hover-on-subtle);
    }

    &:focus {
      background: var(--sys-color-state-focus-highlight);
    }

    &.selected {
      background: var(--sys-color-tonal-container);
      color: var(--sys-color-on-tonal-container);
    }
  }

  .overview-toolbar {
    border-bottom: 1px solid var(--sys-color-divider);
    flex: 0 0 auto;
  }

  .overview-sidebar-panel-item:focus-visible {
    outline-width: unset;
  }

  @media (forced-colors: active) {
    .overview-sidebar-panel-item.selected {
      forced-color-adjust: none; /* crbug.com/1166705 workaround */
      background: Highlight;
      color: HighlightText;
    }

    .overview-sidebar-panel-item:hover {
      forced-color-adjust: none; /* crbug.com/1166705 workaround */
      background: Highlight;
      color: HighlightText;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./cssOverviewSidebarPanel.css")} */`;

// gen/front_end/panels/css_overview/CSSOverviewSidebarPanel.js
var { classMap } = Directives;
var UIStrings3 = {
  /**
   * @description Label for the 'Clear overview' button in the CSS overview report
   */
  clearOverview: "Clear overview",
  /**
   * @description Accessible label for the CSS overview panel sidebar
   */
  cssOverviewPanelSidebar: "CSS overview panel sidebar"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/css_overview/CSSOverviewSidebarPanel.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var DEFAULT_VIEW2 = (input, _output, target) => {
  const onClick = (event) => {
    if (event.target instanceof HTMLElement) {
      const id = event.target.dataset.id;
      if (id) {
        input.onItemClick(id);
      }
    }
  };
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    if (event.target instanceof HTMLElement) {
      const id = event.target.dataset.id;
      if (id) {
        input.onItemKeyDown(id, event.key);
      }
    }
    event.consume(true);
  };
  render2(html2`
      <style>${cssOverviewSidebarPanel_css_default}</style>
      <div class="overview-sidebar-panel" @click=${onClick} @keydown=${onKeyDown}
           aria-label=${i18nString3(UIStrings3.cssOverviewPanelSidebar)} role="tree">
        <div class="overview-toolbar">
          <devtools-toolbar>
            <devtools-button title=${i18nString3(UIStrings3.clearOverview)} @click=${input.onReset}
                .iconName=${"clear"} .variant=${"toolbar"}
                .jslogContext=${"css-overview.clear-overview"}></devtools-button>
          </devtools-toolbar>
        </div>
        ${input.items.map(({ id, name }) => {
    const selected = id === input.selectedId;
    return html2`
            <div class="overview-sidebar-panel-item ${classMap({ selected })}"
                ?autofocus=${selected}
                role="treeitem" data-id=${id} tabindex="0"
                jslog=${VisualLogging.item(`css-overview.${id}`).track({ click: true, keydown: "Enter|ArrowUp|ArrowDown" })}>
              ${name}
            </div>`;
  })}
      </div>`, target);
};
var CSSOverviewSidebarPanel = class extends UI2.Widget.VBox {
  #view;
  #items = [];
  #selectedId;
  #onItemSelected = (_id, _shouldFocus) => {
  };
  #onReset = () => {
  };
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true, delegatesFocus: true });
    this.#view = view;
  }
  performUpdate() {
    const viewInput = {
      items: this.#items,
      selectedId: this.#selectedId,
      onReset: this.#onReset,
      onItemClick: this.#onItemClick.bind(this),
      onItemKeyDown: this.#onItemKeyDown.bind(this)
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  set items(items) {
    this.#items = items;
    this.requestUpdate();
  }
  set selectedId(id) {
    void this.#select(id);
  }
  set onItemSelected(callback) {
    this.#onItemSelected = callback;
    this.requestUpdate();
  }
  set onReset(callback) {
    this.#onReset = callback;
    this.requestUpdate();
  }
  #select(id, shouldFocus = false) {
    this.#selectedId = id;
    this.requestUpdate();
    this.#onItemSelected(id, shouldFocus);
    return this.updateComplete;
  }
  #onItemClick(id) {
    void this.#select(id, false);
  }
  #onItemKeyDown(id, key) {
    if (key === "Enter") {
      void this.#select(id, true);
    } else {
      let currItemIndex = -1;
      for (let idx = 0; idx < this.#items.length; idx++) {
        if (this.#items[idx].id === id) {
          currItemIndex = idx;
          break;
        }
      }
      if (currItemIndex < 0) {
        return;
      }
      const moveTo = key === "ArrowDown" ? 1 : -1;
      const nextItemIndex = (currItemIndex + moveTo) % this.#items.length;
      const nextItemId = this.#items[nextItemIndex].id;
      if (!nextItemId) {
        return;
      }
      void this.#select(nextItemId, false).then(() => {
        this.element.blur();
        this.element.focus();
      });
    }
  }
};

// gen/front_end/panels/css_overview/CSSOverviewCompletedView.js
var { styleMap, ref } = Directives2;
var { widgetConfig } = UI3.Widget;
var UIStrings4 = {
  /**
   * @description Label for the summary in the CSS overview report
   */
  overviewSummary: "Overview summary",
  /**
   * @description Title of colors subsection in the CSS overview panel
   */
  colors: "Colors",
  /**
   * @description Title of font info subsection in the CSS overview panel
   */
  fontInfo: "Font info",
  /**
   * @description Label to denote unused declarations in the target page
   */
  unusedDeclarations: "Unused declarations",
  /**
   * @description Label for the number of media queries in the CSS overview report
   */
  mediaQueries: "Media queries",
  /**
   * @description Title of the Elements Panel
   */
  elements: "Elements",
  /**
   * @description Label for the number of External stylesheets in the CSS overview report
   */
  externalStylesheets: "External stylesheets",
  /**
   * @description Label for the number of inline style elements in the CSS overview report
   */
  inlineStyleElements: "Inline style elements",
  /**
   * @description Label for the number of style rules in CSS overview report
   */
  styleRules: "Style rules",
  /**
   * @description Label for the number of type selectors in the CSS overview report
   */
  typeSelectors: "Type selectors",
  /**
   * @description Label for the number of ID selectors in the CSS overview report
   */
  idSelectors: "ID selectors",
  /**
   * @description Label for the number of class selectors in the CSS overview report
   */
  classSelectors: "Class selectors",
  /**
   * @description Label for the number of universal selectors in the CSS overview report
   */
  universalSelectors: "Universal selectors",
  /**
   * @description Label for the number of Attribute selectors in the CSS overview report
   */
  attributeSelectors: "Attribute selectors",
  /**
   * @description Label for the number of non-simple selectors in the CSS overview report
   */
  nonsimpleSelectors: "Non-simple selectors",
  /**
   * @description Label for unique background colors in the CSS overview panel
   * @example {32} PH1
   */
  backgroundColorsS: "Background colors: {PH1}",
  /**
   * @description Label for unique text colors in the CSS overview panel
   * @example {32} PH1
   */
  textColorsS: "Text colors: {PH1}",
  /**
   * @description Label for unique fill colors in the CSS overview panel
   * @example {32} PH1
   */
  fillColorsS: "Fill colors: {PH1}",
  /**
   * @description Label for unique border colors in the CSS overview panel
   * @example {32} PH1
   */
  borderColorsS: "Border colors: {PH1}",
  /**
   * @description Label to indicate that there are no fonts in use
   */
  thereAreNoFonts: "There are no fonts.",
  /**
   * @description Message to show when no unused declarations in the target page
   */
  thereAreNoUnusedDeclarations: "There are no unused declarations.",
  /**
   * @description Message to show when no media queries are found in the target page
   */
  thereAreNoMediaQueries: "There are no media queries.",
  /**
   * @description Title of the Drawer for contrast issues in the CSS overview panel
   */
  contrastIssues: "Contrast issues",
  /**
   * @description Text to indicate how many times this CSS rule showed up.
   */
  nOccurrences: "{n, plural, =1 {# occurrence} other {# occurrences}}",
  /**
   * @description Section header for contrast issues in the CSS overview panel
   * @example {1} PH1
   */
  contrastIssuesS: "Contrast issues: {PH1}",
  /**
   * @description Title of the button for a contrast issue in the CSS overview panel
   * @example {#333333} PH1
   * @example {#333333} PH2
   * @example {2} PH3
   */
  textColorSOverSBackgroundResults: "Text color {PH1} over {PH2} background results in low contrast for {PH3} elements",
  /**
   * @description Label aa text content in Contrast Details of the Color Picker
   */
  aa: "AA",
  /**
   * @description Label aaa text content in Contrast Details of the Color Picker
   */
  aaa: "AAA",
  /**
   * @description Label for the APCA contrast in Color Picker
   */
  apca: "APCA",
  /**
   * @description Label for the column in the element list in the CSS overview report
   */
  element: "Element",
  /**
   * @description Column header title denoting which declaration is unused
   */
  declaration: "Declaration",
  /**
   * @description Text for the source of something
   */
  source: "Source",
  /**
   * @description Text of a DOM element in Contrast Details of the Color Picker
   */
  contrastRatio: "Contrast ratio",
  /**
   * @description Accessible title of a table in the CSS overview elements.
   */
  cssOverviewElements: "CSS overview elements",
  /**
   * @description Title of the button to show the element in the CSS overview panel
   */
  showElement: "Show element",
  /**
   * @description Text to show in a table if the link to the style could not be created.
   */
  unableToLink: "(unable to link)",
  /**
   * @description Text to show in a table if the link to the inline style could not be created.
   */
  unableToLinkToInlineStyle: "(unable to link to inline style)"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/css_overview/CSSOverviewCompletedView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
function getBorderString(color) {
  let { h, s, l } = color.as(
    "hsl"
    /* Common.Color.Format.HSL */
  );
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  l = Math.max(0, l - 15);
  return `1px solid hsl(${h}deg ${s}% ${l}%)`;
}
var formatter = new Intl.NumberFormat("en-US");
var DEFAULT_VIEW3 = (input, output, target) => {
  function revealSection(section, setFocus) {
    if (!section) {
      return;
    }
    section.scrollIntoView();
    if (setFocus) {
      const focusableElement = section.querySelector('button, [tabindex="0"]');
      focusableElement?.focus();
    }
  }
  render3(html3`
      <style>${cssOverviewCompletedView_css_default}</style>
      <devtools-split-view direction="column" sidebar-position="first" sidebar-initial-size="200">
        <devtools-widget slot="sidebar" .widgetConfig=${widgetConfig(CSSOverviewSidebarPanel, {
    minimumSize: new Geometry.Size(100, 25),
    items: [
      { name: i18nString4(UIStrings4.overviewSummary), id: "summary" },
      { name: i18nString4(UIStrings4.colors), id: "colors" },
      { name: i18nString4(UIStrings4.fontInfo), id: "font-info" },
      { name: i18nString4(UIStrings4.unusedDeclarations), id: "unused-declarations" },
      { name: i18nString4(UIStrings4.mediaQueries), id: "media-queries" }
    ],
    selectedId: input.selectedSection,
    onItemSelected: input.onSectionSelected,
    onReset: input.onReset
  })}>
        </devtools-widget>
        <devtools-split-view sidebar-position="second" slot="main" direction="row" sidebar-initial-size="minimized">
          <div class="vbox overview-completed-view" slot="main" @click=${input.onClick}>
            <!-- Dupe the styles into the main container because of the shadow root will prevent outer styles. -->
            <style>${cssOverviewCompletedView_css_default}</style>
            <div class="results-section horizontally-padded summary"
                  ${ref((e) => {
    output.revealSection.set("summary", revealSection.bind(null, e));
  })}>
              <h1>${i18nString4(UIStrings4.overviewSummary)}</h1>
              ${renderSummary(input.elementCount, input.globalStyleStats, input.mediaQueries)}
            </div>
            <div class="results-section horizontally-padded colors"
                ${ref((e) => {
    output.revealSection.set("colors", revealSection.bind(null, e));
  })}>
                <h1>${i18nString4(UIStrings4.colors)}</h1>
                ${renderColors(input.backgroundColors, input.textColors, input.textColorContrastIssues, input.fillColors, input.borderColors)}
              </div>
              <div class="results-section font-info"
                    ${ref((e) => {
    output.revealSection.set("font-info", revealSection.bind(null, e));
  })}>
                <h1>${i18nString4(UIStrings4.fontInfo)}</h1>
                ${renderFontInfo(input.fontInfo)}
              </div>
              <div class="results-section unused-declarations"
                    ${ref((e) => {
    output.revealSection.set("unused-declarations", revealSection.bind(null, e));
  })}>
                <h1>${i18nString4(UIStrings4.unusedDeclarations)}</h1>
                ${renderUnusedDeclarations(input.unusedDeclarations)}
              </div>
              <div class="results-section media-queries"
                    ${ref((e) => {
    output.revealSection.set("media-queries", revealSection.bind(null, e));
  })}>
              <h1>${i18nString4(UIStrings4.mediaQueries)}</h1>
              ${renderMediaQueries(input.mediaQueries)}
            </div>
          </div>
          <devtools-widget slot="sidebar" .widgetConfig=${widgetConfig((e) => {
    const tabbedPane = new UI3.TabbedPane.TabbedPane(e);
    output.closeAllTabs = () => {
      tabbedPane.closeTabs(tabbedPane.tabIds());
    };
    output.addTab = (id, tabTitle, view, jslogContext) => {
      if (!tabbedPane.hasTab(id)) {
        tabbedPane.appendTab(
          id,
          tabTitle,
          view,
          void 0,
          void 0,
          /* isCloseable */
          true,
          void 0,
          void 0,
          jslogContext
        );
      }
      tabbedPane.selectTab(id);
      const splitView = tabbedPane.parentWidget();
      splitView.setSidebarMinimized(false);
    };
    tabbedPane.addEventListener(UI3.TabbedPane.Events.TabClosed, (_) => {
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
};
function renderSummary(elementCount, globalStyleStats, mediaQueries) {
  const renderSummaryItem = (label, value) => html3`
    <li>
      <div class="label">${label}</div>
      <div class="value">${formatter.format(value)}</div>
    </li>`;
  return html3`<ul>
    ${renderSummaryItem(i18nString4(UIStrings4.elements), elementCount)}
    ${renderSummaryItem(i18nString4(UIStrings4.externalStylesheets), globalStyleStats.externalSheets)}
    ${renderSummaryItem(i18nString4(UIStrings4.inlineStyleElements), globalStyleStats.inlineStyles)}
    ${renderSummaryItem(i18nString4(UIStrings4.styleRules), globalStyleStats.styleRules)}
    ${renderSummaryItem(i18nString4(UIStrings4.mediaQueries), mediaQueries.length)}
    ${renderSummaryItem(i18nString4(UIStrings4.typeSelectors), globalStyleStats.stats.type)}
    ${renderSummaryItem(i18nString4(UIStrings4.idSelectors), globalStyleStats.stats.id)}
    ${renderSummaryItem(i18nString4(UIStrings4.classSelectors), globalStyleStats.stats.class)}
    ${renderSummaryItem(i18nString4(UIStrings4.universalSelectors), globalStyleStats.stats.universal)}
    ${renderSummaryItem(i18nString4(UIStrings4.attributeSelectors), globalStyleStats.stats.attribute)}
    ${renderSummaryItem(i18nString4(UIStrings4.nonsimpleSelectors), globalStyleStats.stats.nonSimple)}
  </ul>`;
}
function renderColors(backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors) {
  return html3`
    <h2>${i18nString4(UIStrings4.backgroundColorsS, { PH1: backgroundColors.length })}</h2>
    <ul>${backgroundColors.map((c) => renderColor("background", c))}</ul>

    <h2>${i18nString4(UIStrings4.textColorsS, { PH1: textColors.length })}</h2>
    <ul>${textColors.map((c) => renderColor("text", c))}</ul>

    ${textColorContrastIssues.size > 0 ? renderContrastIssues(textColorContrastIssues) : ""}

    <h2>${i18nString4(UIStrings4.fillColorsS, { PH1: fillColors.length })}</h2>
    <ul>${fillColors.map((c) => renderColor("fill", c))}</ul>

    <h2>${i18nString4(UIStrings4.borderColorsS, { PH1: borderColors.length })}</h2>
    <ul>${borderColors.map((c) => renderColor("border", c))}</ul>`;
}
function renderUnusedDeclarations(unusedDeclarations) {
  return unusedDeclarations.length > 0 ? renderGroup(unusedDeclarations, "unused-declarations") : html3`<div class="horizontally-padded">${i18nString4(UIStrings4.thereAreNoUnusedDeclarations)}</div>`;
}
function renderMediaQueries(mediaQueries) {
  return mediaQueries.length > 0 ? renderGroup(mediaQueries, "media-queries") : html3`<div class="horizontally-padded">${i18nString4(UIStrings4.thereAreNoMediaQueries)}</div>`;
}
function renderFontInfo(fonts) {
  return fonts.length > 0 ? html3`${fonts.map(({ font, fontMetrics }) => html3`
    <section class="font-family">
      <h2>${font}</h2>
      ${renderFontMetrics(font, fontMetrics)}
    </section>`)}` : html3`<div>${i18nString4(UIStrings4.thereAreNoFonts)}</div>`;
}
function renderFontMetrics(font, fontMetricInfo) {
  return html3`
    <div class="font-metric">
      ${fontMetricInfo.map(({ label, values }) => html3`
        <div>
          <h3>${label}</h3>
          ${renderGroup(values, "font-info", `${font}/${label}`)}
        </div>`)}
    </div>`;
}
function renderGroup(values, type, path = "") {
  const total = values.reduce((prev, curr) => prev + curr.nodes.length, 0);
  return html3`
      <ul aria-label=${type}>
        ${values.map(({ title, nodes }) => {
    const width = 100 * nodes.length / total;
    const itemLabel = i18nString4(UIStrings4.nOccurrences, { n: nodes.length });
    return html3`<li>
            <div class="title">${title}</div>
            <button data-type=${type} data-path=${path} data-label=${title}
            jslog=${VisualLogging2.action().track({ click: true }).context(`css-overview.${type}`)}
            aria-label=${`${title}: ${itemLabel}`}>
              <div class="details">${itemLabel}</div>
              <div class="bar-container">
                <div class="bar" style=${styleMap({ width })}></div>
              </div>
            </button>
          </li>`;
  })}
  </ul>`;
}
function renderContrastIssues(issues) {
  return html3`
    <h2>${i18nString4(UIStrings4.contrastIssuesS, { PH1: issues.size })}</h2>
    <ul>
      ${[...issues.entries()].map(([key, value]) => renderContrastIssue(key, value))}
    </ul>`;
}
function renderContrastIssue(key, issues) {
  console.assert(issues.length > 0);
  let minContrastIssue = issues[0];
  for (const issue of issues) {
    if (Math.abs(issue.contrastRatio) < Math.abs(minContrastIssue.contrastRatio)) {
      minContrastIssue = issue;
    }
  }
  const color = minContrastIssue.textColor.asString(
    "hexa"
    /* Common.Color.Format.HEXA */
  );
  const backgroundColor = minContrastIssue.backgroundColor.asString(
    "hexa"
    /* Common.Color.Format.HEXA */
  );
  const showAPCA = Root2.Runtime.experiments.isEnabled("apca");
  const title = i18nString4(UIStrings4.textColorSOverSBackgroundResults, {
    PH1: color,
    PH2: backgroundColor,
    PH3: issues.length
  });
  const border = getBorderString(minContrastIssue.backgroundColor.asLegacyColor());
  return html3`<li>
    <button
      title=${title} aria-label=${title}
      data-type="contrast" data-key=${key} data-section="contrast" class="block"
      style=${styleMap({ color, backgroundColor, border })}
      jslog=${VisualLogging2.action("css-overview.contrast").track({ click: true })}>
      Text
    </button>
    <div class="block-title">
      ${showAPCA ? html3`
        <div class="contrast-warning hidden">
          <span class="threshold-label">${i18nString4(UIStrings4.apca)}</span>
          ${minContrastIssue.thresholdsViolated.apca ? createClearIcon() : createCheckIcon()}
        </div>` : html3`
        <div class="contrast-warning hidden">
          <span class="threshold-label">${i18nString4(UIStrings4.aa)}</span>
          ${minContrastIssue.thresholdsViolated.aa ? createClearIcon() : createCheckIcon()}
        </div>
        <div class="contrast-warning hidden">
          <span class="threshold-label">${i18nString4(UIStrings4.aaa)}</span>
          ${minContrastIssue.thresholdsViolated.aaa ? createClearIcon() : createCheckIcon()}
        </div>`}
    </div>
  </li>`;
}
function renderColor(section, color) {
  const borderColor = Common2.Color.parse(color)?.asLegacyColor();
  if (!borderColor) {
    return nothing;
  }
  return html3`<li>
    <button title=${color} data-type="color" data-color=${color}
      data-section=${section} class="block"
      style=${styleMap({ backgroundColor: color, border: getBorderString(borderColor) })}
      jslog=${VisualLogging2.action("css-overview.color").track({ click: true })}>
    </button>
    <div class="block-title color-text">${color}</div>
  </li>`;
}
var CSSOverviewCompletedView = class _CSSOverviewCompletedView extends UI3.Widget.VBox {
  onReset = () => {
  };
  #selectedSection = "summary";
  #cssModel;
  #domModel;
  #linkifier;
  #viewMap;
  #data;
  #view;
  #viewOutput = {
    revealSection: /* @__PURE__ */ new Map(),
    closeAllTabs: () => {
    },
    addTab: (_id, _tabTitle, _view, _jslogContext) => {
    }
  };
  constructor(element, view = DEFAULT_VIEW3) {
    super(element);
    this.#view = view;
    this.registerRequiredCSS(cssOverviewCompletedView_css_default);
    this.#linkifier = new Components.Linkifier.Linkifier(
      /* maxLinkLength */
      20,
      /* useLinkDecorator */
      true
    );
    this.#viewMap = /* @__PURE__ */ new Map();
    this.#data = null;
  }
  set target(target) {
    if (!target) {
      return;
    }
    const cssModel = target.model(SDK2.CSSModel.CSSModel);
    const domModel = target.model(SDK2.DOMModel.DOMModel);
    if (!cssModel || !domModel) {
      throw new Error("Target must provide CSS and DOM models");
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
    this.#viewMap = /* @__PURE__ */ new Map();
    _CSSOverviewCompletedView.pushedNodes.clear();
    this.#selectedSection = "summary";
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
      case "contrast": {
        const section = dataset.section;
        const key = dataset.key;
        if (!key) {
          return;
        }
        const nodes = this.#data.textColorContrastIssues.get(key) || [];
        payload = { type, key, nodes, section };
        break;
      }
      case "color": {
        const color = dataset.color;
        const section = dataset.section;
        if (!color) {
          return;
        }
        let nodes;
        switch (section) {
          case "text":
            nodes = this.#data.textColors.get(color);
            break;
          case "background":
            nodes = this.#data.backgroundColors.get(color);
            break;
          case "fill":
            nodes = this.#data.fillColors.get(color);
            break;
          case "border":
            nodes = this.#data.borderColors.get(color);
            break;
        }
        if (!nodes) {
          return;
        }
        nodes = Array.from(nodes).map((nodeId) => ({ nodeId }));
        payload = { type, color, nodes, section };
        break;
      }
      case "unused-declarations": {
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
      case "media-queries": {
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
      case "font-info": {
        const value = dataset.label;
        if (!dataset.path) {
          return;
        }
        const [fontFamily, fontMetric] = dataset.path.split("/");
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
        const nodes = nodesIds.map((nodeId) => ({ nodeId }));
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
    if (!this.#data || !("backgroundColors" in this.#data) || !("textColors" in this.#data)) {
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
      onReset: this.#onReset.bind(this)
    };
    this.#view(viewInput, this.#viewOutput, this.element);
  }
  #createElementsView(payload) {
    let id = "";
    let tabTitle = "";
    switch (payload.type) {
      case "contrast": {
        const { section, key } = payload;
        id = `${section}-${key}`;
        tabTitle = i18nString4(UIStrings4.contrastIssues);
        break;
      }
      case "color": {
        const { section, color } = payload;
        id = `${section}-${color}`;
        tabTitle = `${color.toUpperCase()} (${section})`;
        break;
      }
      case "unused-declarations": {
        const { declaration } = payload;
        id = `${declaration}`;
        tabTitle = `${declaration}`;
        break;
      }
      case "media-queries": {
        const { text } = payload;
        id = `${text}`;
        tabTitle = `${text}`;
        break;
      }
      case "font-info": {
        const { name } = payload;
        id = `${name}`;
        tabTitle = `${name}`;
        break;
      }
    }
    let view = this.#viewMap.get(id);
    if (!view) {
      if (!this.#domModel || !this.#cssModel) {
        throw new Error("Unable to initialize CSS overview, missing models");
      }
      view = new ElementDetailsView(this.#domModel, this.#cssModel, this.#linkifier);
      view.data = payload.nodes;
      this.#viewMap.set(id, view);
    }
    this.#viewOutput.addTab(id, tabTitle, view, payload.type);
  }
  #sortColorsByLuminance(srcColors) {
    return Array.from(srcColors.keys()).sort((colA, colB) => {
      const colorA = Common2.Color.parse(colA)?.asLegacyColor();
      const colorB = Common2.Color.parse(colB)?.asLegacyColor();
      if (!colorA || !colorB) {
        return 0;
      }
      return Common2.ColorUtils.luminance(colorB.rgba()) - Common2.ColorUtils.luminance(colorA.rgba());
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
    return Array.from(items.entries()).sort((d1, d2) => {
      const v1Nodes = d1[1];
      const v2Nodes = d2[1];
      return v2Nodes.length - v1Nodes.length;
    }).map(([title, nodes]) => ({ title, nodes }));
  }
  set overviewData(data) {
    this.#data = data;
    this.requestUpdate();
  }
  static pushedNodes = /* @__PURE__ */ new Set();
};
var ELEMENT_DETAILS_DEFAULT_VIEW = (input, _output, target) => {
  const { items, visibility } = input;
  render3(html3`
    <div>
      <devtools-data-grid class="element-grid" striped inline
         name=${i18nString4(UIStrings4.cssOverviewElements)}>
        <table>
          <tr>
            ${visibility.has("node-id") ? html3`
              <th id="node-id" weight="50" sortable>
                ${i18nString4(UIStrings4.element)}
              </th>` : nothing}
            ${visibility.has("declaration") ? html3`
              <th id="declaration" weight="50" sortable>
                ${i18nString4(UIStrings4.declaration)}
              </th>` : nothing}
            ${visibility.has("source-url") ? html3`
              <th id="source-url" weight="100">
                ${i18nString4(UIStrings4.source)}
              </th>` : nothing}
            ${visibility.has("contrast-ratio") ? html3`
              <th id="contrast-ratio" weight="25" width="150px" sortable fixed>
                ${i18nString4(UIStrings4.contrastRatio)}
              </th>` : nothing}
          </tr>
          ${items.map(({ data, link, showNode }) => html3`
            <tr>
              ${visibility.has("node-id") ? renderNode(data, link, showNode) : nothing}
              ${visibility.has("declaration") ? renderDeclaration(data) : nothing}
              ${visibility.has("source-url") ? renderSourceURL(data, link) : nothing}
              ${visibility.has("contrast-ratio") ? renderContrastRatio(data) : nothing}
            </tr>`)}
        </table>
      </devtools-data-grid>
    </div>`, target);
};
var ElementDetailsView = class extends UI3.Widget.Widget {
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
    const visibility = /* @__PURE__ */ new Set();
    if (!this.#data.length) {
      this.#view({ items: [], visibility }, {}, this.element);
      return;
    }
    const [firstItem] = this.#data;
    "nodeId" in firstItem && firstItem.nodeId && visibility.add("node-id");
    "declaration" in firstItem && firstItem.declaration && visibility.add("declaration");
    "sourceURL" in firstItem && firstItem.sourceURL && visibility.add("source-url");
    "contrastRatio" in firstItem && firstItem.contrastRatio && visibility.add("contrast-ratio");
    let relatedNodesMap;
    if ("nodeId" in firstItem && visibility.has("node-id")) {
      const nodeIds = this.#data.reduce((prev, curr) => {
        const nodeId = curr.nodeId;
        if (CSSOverviewCompletedView.pushedNodes.has(nodeId)) {
          return prev;
        }
        CSSOverviewCompletedView.pushedNodes.add(nodeId);
        return prev.add(nodeId);
      }, /* @__PURE__ */ new Set());
      relatedNodesMap = await this.#domModel.pushNodesByBackendIdsToFrontend(nodeIds);
    }
    const items = await Promise.all(this.#data.map(async (item2) => {
      let link, showNode;
      if ("nodeId" in item2 && visibility.has("node-id")) {
        const frontendNode = relatedNodesMap?.get(item2.nodeId) ?? null;
        if (frontendNode) {
          link = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(frontendNode);
          showNode = () => frontendNode.scrollIntoView();
        }
      }
      if ("range" in item2 && item2.range && item2.styleSheetId && visibility.has("source-url")) {
        const ruleLocation = TextUtils.TextRange.TextRange.fromObject(item2.range);
        const styleSheetHeader = this.#cssModel.styleSheetHeaderForId(item2.styleSheetId);
        if (styleSheetHeader) {
          const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
          const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
          const matchingSelectorLocation = new SDK2.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
          link = this.#linkifier.linkifyCSSLocation(matchingSelectorLocation);
        }
      }
      return { data: item2, link, showNode };
    }));
    this.#view({ items, visibility }, {}, this.element);
  }
};
function renderNode(data, link, showNode) {
  if (!link) {
    return nothing;
  }
  return html3`
    <td>
      ${link}
      <devtools-icon part="show-element" name="select-element"
          title=${i18nString4(UIStrings4.showElement)} tabindex="0"
          @click=${() => showNode?.()}></devtools-icon>
    </td>`;
}
function renderDeclaration(data) {
  if (!("declaration" in data)) {
    throw new Error("Declaration entry is missing a declaration.");
  }
  return html3`<td>${data.declaration}</td>`;
}
function renderSourceURL(data, link) {
  if ("range" in data && data.range) {
    if (!link) {
      return html3`<td>${i18nString4(UIStrings4.unableToLink)}</td>`;
    }
    return html3`<td>${link}</td>`;
  }
  return html3`<td>${i18nString4(UIStrings4.unableToLinkToInlineStyle)}</td>`;
}
function renderContrastRatio(data) {
  if (!("contrastRatio" in data)) {
    throw new Error("Contrast ratio entry is missing a contrast ratio.");
  }
  const showAPCA = Root2.Runtime.experiments.isEnabled("apca");
  const contrastRatio = Platform.NumberUtilities.floor(data.contrastRatio, 2);
  const contrastRatioString = showAPCA ? contrastRatio + "%" : contrastRatio;
  const border = getBorderString(data.backgroundColor);
  const color = data.textColor.asString();
  const backgroundColor = data.backgroundColor.asString();
  return html3`
    <td>
      <div class="contrast-container-in-grid">
          <span class="contrast-preview" style=${styleMap({ border, color, backgroundColor })}>Aa</span>
          <span>${contrastRatioString}</span>
          ${showAPCA ? html3`
            <span>${i18nString4(UIStrings4.apca)}</span>${data.thresholdsViolated.apca ? createClearIcon() : createCheckIcon()}` : html3`
            <span>${i18nString4(UIStrings4.aa)}</span>${data.thresholdsViolated.aa ? createClearIcon() : createCheckIcon()}
            <span>${i18nString4(UIStrings4.aaa)}</span>${data.thresholdsViolated.aaa ? createClearIcon() : createCheckIcon()}`}
      </div>
    </td>`;
}
function createClearIcon() {
  return html3`
    <devtools-icon name="clear" class="small" style="color:var(--icon-error);"></devtools-icon>`;
}
function createCheckIcon() {
  return html3`
    <devtools-icon name="checkmark" class="small"
        style="color:var(--icon-checkmark-green);"></devtools-icon>`;
}

// gen/front_end/panels/css_overview/CSSOverviewPanel.js
var CSSOverviewPanel_exports = {};
__export(CSSOverviewPanel_exports, {
  CSSOverviewPanel: () => CSSOverviewPanel,
  DEFAULT_VIEW: () => DEFAULT_VIEW5
});
import * as Host from "./../../core/host/host.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import { html as html5, render as render5 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/css_overview/CSSOverviewStartView.js
import "./../../ui/components/panel_feedback/panel_feedback.js";
import "./../../ui/components/panel_introduction_steps/panel_introduction_steps.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import { html as html4, render as render4 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/css_overview/cssOverviewStartView.css.js
var cssOverviewStartView_css_default = `/**
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  h1 {
    font-weight: normal;
  }

  .css-overview-start-view {
    padding: 24px;
    display: flex;
    flex-direction: column;
    background-color: var(--sys-color-cdt-base-container);
    overflow: auto;
  }

  .start-capture-wrapper {
    width: fit-content;
  }

  .preview-feature {
    padding: 12px 16px;
    border: 1px solid var(--sys-color-neutral-outline);
    color: var(--sys-color-on-surface);
    font-size: 13px;
    line-height: 20px;
    border-radius: 12px;
    margin: 42px 0;
    letter-spacing: 0.01em;
  }

  .preview-header {
    color: var(--sys-color-primary);
    font-size: 13px;
    line-height: 20px;
    letter-spacing: 0.01em;
    margin: 9px 0 14px;
  }

  .preview-icon {
    vertical-align: middle;
  }

  .feedback-prompt {
    margin-bottom: 24px;
  }

  .feedback-prompt .devtools-link {
    color: -webkit-link;
    cursor: pointer;
    text-decoration: underline;
  }

  .resources {
    display: flex;
    flex-direction: row;
  }

  .thumbnail-wrapper {
    width: 144px;
    height: 92px;
    margin-right: 20px;
  }

  .video-doc-header {
    font-size: 13px;
    line-height: 20px;
    letter-spacing: 0.04em;
    color: var(--sys-color-on-surface);
    margin-bottom: 2px;
  }

  devtools-feedback-button {
    align-self: flex-end;
  }

  .resources .devtools-link {
    font-size: 14px;
    line-height: 22px;
    letter-spacing: 0.04em;
    text-decoration-line: underline;
    color: var(--sys-color-primary);
  }
}

/*# sourceURL=${import.meta.resolve("./cssOverviewStartView.css")} */`;

// gen/front_end/panels/css_overview/CSSOverviewStartView.js
var UIStrings5 = {
  /**
   * @description Label for the capture button in the CSS overview panel
   */
  captureOverview: "Capture overview",
  /**
   * @description Header for the summary of CSS overview
   */
  identifyCSSImprovements: "Identify potential CSS improvements",
  /**
   * @description First point of the summarized features of CSS overview
   */
  capturePageCSSOverview: "Capture an overview of your page\u2019s CSS",
  /**
   * @description Second point of the summarized features of CSS overview
   */
  identifyCSSImprovementsWithExampleIssues: "Identify potential CSS improvements (e.g. low contrast issues, unused declarations, color or font mismatches)",
  /**
   * @description Third point of the summarized features of CSS overview
   */
  locateAffectedElements: "Locate the affected elements in the Elements panel",
  /**
   * @description Title of the link to the quick start video and documentation to CSS overview panel
   */
  quickStartWithCSSOverview: "Quick start: get started with the new CSS overview panel"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/css_overview/CSSOverviewStartView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var FEEDBACK_LINK = "https://g.co/devtools/css-overview-feedback";
var DOC_LINK = "https://developer.chrome.com/docs/devtools/css-overview";
var DEFAULT_VIEW4 = (input, output, target) => {
  render4(html4`
    <style>${cssOverviewStartView_css_default}</style>
    <div class="css-overview-start-view">
      <devtools-panel-introduction-steps>
        <span slot="title">${i18nString5(UIStrings5.identifyCSSImprovements)}</span>
        <span slot="step-1">${i18nString5(UIStrings5.capturePageCSSOverview)}</span>
        <span slot="step-2">${i18nString5(UIStrings5.identifyCSSImprovementsWithExampleIssues)}</span>
        <span slot="step-3">${i18nString5(UIStrings5.locateAffectedElements)}</span>
      </devtools-panel-introduction-steps>
      <div class="start-capture-wrapper">
        <devtools-button
          class="start-capture"
          autofocus
          .variant=${"primary"}
          .jslogContext=${"css-overview.capture-overview"}
          @click=${input.onStartCapture}>
          ${i18nString5(UIStrings5.captureOverview)}
        </devtools-button>
      </div>
      <devtools-panel-feedback .data=${{
    feedbackUrl: FEEDBACK_LINK,
    quickStartUrl: DOC_LINK,
    quickStartLinkText: i18nString5(UIStrings5.quickStartWithCSSOverview)
  }}>
      </devtools-panel-feedback>
      <devtools-feedback-button .data=${{
    feedbackUrl: FEEDBACK_LINK
  }}>
      </devtools-feedback-button>
    </div>`, target);
};
var CSSOverviewStartView = class extends UI4.Widget.Widget {
  #view;
  onStartCapture = () => {
  };
  constructor(element, view = DEFAULT_VIEW4) {
    super(element, { useShadowDom: true, delegatesFocus: true });
    this.#view = view;
    this.performUpdate();
  }
  performUpdate() {
    this.#view({ onStartCapture: this.onStartCapture }, {}, this.contentElement);
  }
};

// gen/front_end/panels/css_overview/CSSOverviewPanel.js
var { widgetConfig: widgetConfig2 } = UI5.Widget;
var DEFAULT_VIEW5 = (input, _output, target) => {
  render5(input.state === "start" ? html5`
      <devtools-widget .widgetConfig=${widgetConfig2(CSSOverviewStartView, { onStartCapture: input.onStartCapture })}></devtools-widget>` : input.state === "processing" ? html5`
      <devtools-widget .widgetConfig=${widgetConfig2(CSSOverviewProcessingView, { onCancel: input.onCancel })}></devtools-widget>` : html5`
      <devtools-widget .widgetConfig=${widgetConfig2(CSSOverviewCompletedView, {
    onReset: input.onReset,
    overviewData: input.overviewData,
    target: input.target
  })}></devtools-widget>`, target);
};
var CSSOverviewPanel = class extends UI5.Panel.Panel {
  #currentUrl;
  #model;
  #backgroundColors;
  #textColors;
  #fillColors;
  #borderColors;
  #fontInfo;
  #mediaQueries;
  #unusedDeclarations;
  #elementCount;
  #globalStyleStats;
  #textColorContrastIssues;
  #state;
  #view;
  constructor(view = DEFAULT_VIEW5) {
    super("css-overview");
    this.#currentUrl = SDK3.TargetManager.TargetManager.instance().inspectedURL();
    SDK3.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged", this.#checkUrlAndResetIfChanged, this);
    this.#view = view;
    SDK3.TargetManager.TargetManager.instance().observeTargets(this);
    this.#reset();
  }
  #onStartCapture() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureCssOverviewClicked);
    void this.#startOverview();
  }
  #checkUrlAndResetIfChanged() {
    if (this.#currentUrl === SDK3.TargetManager.TargetManager.instance().inspectedURL()) {
      return;
    }
    this.#currentUrl = SDK3.TargetManager.TargetManager.instance().inspectedURL();
    this.#reset();
  }
  targetAdded(target) {
    if (target !== SDK3.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#model = target.model(CSSOverviewModel) ?? void 0;
  }
  targetRemoved() {
  }
  #getModel() {
    if (!this.#model) {
      throw new Error("Did not retrieve model information yet.");
    }
    return this.#model;
  }
  #reset() {
    this.#backgroundColors = /* @__PURE__ */ new Map();
    this.#textColors = /* @__PURE__ */ new Map();
    this.#fillColors = /* @__PURE__ */ new Map();
    this.#borderColors = /* @__PURE__ */ new Map();
    this.#fontInfo = /* @__PURE__ */ new Map();
    this.#mediaQueries = /* @__PURE__ */ new Map();
    this.#unusedDeclarations = /* @__PURE__ */ new Map();
    this.#elementCount = 0;
    this.#globalStyleStats = {
      styleRules: 0,
      inlineStyles: 0,
      externalSheets: 0,
      stats: {
        // Simple.
        type: 0,
        class: 0,
        id: 0,
        universal: 0,
        attribute: 0,
        // Non-simple.
        nonSimple: 0
      }
    };
    this.#textColorContrastIssues = /* @__PURE__ */ new Map();
    this.#renderInitialView();
  }
  #renderInitialView() {
    this.#state = "start";
    this.performUpdate();
  }
  #renderOverviewStartedView() {
    this.#state = "processing";
    this.performUpdate();
  }
  #renderOverviewCompletedView() {
    this.#state = "completed";
    this.performUpdate();
  }
  performUpdate() {
    const viewInput = {
      state: this.#state,
      onStartCapture: this.#onStartCapture.bind(this),
      onCancel: this.#reset.bind(this),
      onReset: this.#reset.bind(this),
      target: this.#model?.target(),
      overviewData: {
        backgroundColors: this.#backgroundColors,
        textColors: this.#textColors,
        textColorContrastIssues: this.#textColorContrastIssues,
        fillColors: this.#fillColors,
        borderColors: this.#borderColors,
        globalStyleStats: this.#globalStyleStats,
        fontInfo: this.#fontInfo,
        elementCount: this.#elementCount,
        mediaQueries: this.#mediaQueries,
        unusedDeclarations: this.#unusedDeclarations
      }
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  async #startOverview() {
    this.#renderOverviewStartedView();
    const model = this.#getModel();
    const [globalStyleStats, { elementCount, backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors, fontInfo, unusedDeclarations }, mediaQueries] = await Promise.all([
      model.getGlobalStylesheetStats(),
      model.getNodeStyleStats(),
      model.getMediaQueries()
    ]);
    if (elementCount) {
      this.#elementCount = elementCount;
    }
    if (globalStyleStats) {
      this.#globalStyleStats = globalStyleStats;
    }
    if (mediaQueries) {
      this.#mediaQueries = mediaQueries;
    }
    if (backgroundColors) {
      this.#backgroundColors = backgroundColors;
    }
    if (textColors) {
      this.#textColors = textColors;
    }
    if (textColorContrastIssues) {
      this.#textColorContrastIssues = textColorContrastIssues;
    }
    if (fillColors) {
      this.#fillColors = fillColors;
    }
    if (borderColors) {
      this.#borderColors = borderColors;
    }
    if (fontInfo) {
      this.#fontInfo = fontInfo;
    }
    if (unusedDeclarations) {
      this.#unusedDeclarations = unusedDeclarations;
    }
    this.#renderOverviewCompletedView();
  }
};
export {
  CSSOverviewCompletedView_exports as CSSOverviewCompletedView,
  CSSOverviewModel_exports as CSSOverviewModel,
  CSSOverviewPanel_exports as CSSOverviewPanel,
  CSSOverviewProcessingView_exports as CSSOverviewProcessingView,
  CSSOverviewSidebarPanel_exports as CSSOverviewSidebarPanel,
  CSSOverviewUnusedDeclarations_exports as CSSOverviewUnusedDeclarations
};
//# sourceMappingURL=css_overview.js.map
