// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';

import type {ContrastIssue} from './CSSOverviewCompletedView.js';
import {CSSOverviewUnusedDeclarations, type UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

interface NodeStyleStats {
  elementCount: number;
  backgroundColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  textColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  textColorContrastIssues: Map<string, ContrastIssue[]>;
  fillColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  borderColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  fontInfo: Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>;
  unusedDeclarations: Map<string, UnusedDeclaration[]>;
}

export interface GlobalStyleStats {
  styleRules: number;
  inlineStyles: number;
  externalSheets: number;
  stats: {
    // Simple.
    type: number,
    class: number,
    id: number,
    universal: number,
    attribute: number,

    // Non-simple.
    nonSimple: number,
  };
}

export class CSSOverviewModel extends SDK.SDKModel.SDKModel<void> {
  readonly #runtimeAgent: ProtocolProxyApi.RuntimeApi;
  readonly #cssAgent: ProtocolProxyApi.CSSApi;
  readonly #domSnapshotAgent: ProtocolProxyApi.DOMSnapshotApi;

  constructor(target: SDK.Target.Target) {
    super(target);

    this.#runtimeAgent = target.runtimeAgent();
    this.#cssAgent = target.cssAgent();
    this.#domSnapshotAgent = target.domsnapshotAgent();
  }

  async getNodeStyleStats(): Promise<NodeStyleStats> {
    const backgroundColors = new Map<string, Set<Protocol.DOM.BackendNodeId>>();
    const textColors = new Map<string, Set<Protocol.DOM.BackendNodeId>>();
    const textColorContrastIssues = new Map<string, ContrastIssue[]>();
    const fillColors = new Map<string, Set<Protocol.DOM.BackendNodeId>>();
    const borderColors = new Map<string, Set<Protocol.DOM.BackendNodeId>>();
    const fontInfo = new Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>();
    const unusedDeclarations = new Map<string, UnusedDeclaration[]>();
    const snapshotConfig = {
      computedStyles: [
        'background-color',
        'color',
        'fill',
        'border-top-width',
        'border-top-color',
        'border-bottom-width',
        'border-bottom-color',
        'border-left-width',
        'border-left-color',
        'border-right-width',
        'border-right-color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'display',
        'width',
        'height',
        'vertical-align',
      ],
      includeTextColorOpacities: true,
      includeBlendedBackgroundColors: true,
    };

    const formatColor = (color: Common.Color.Color): string|null => {
      if (color instanceof Common.Color.Legacy) {
        return color.hasAlpha() ? color.asString(Common.Color.Format.HEXA) : color.asString(Common.Color.Format.HEX);
      }

      return color.asString();
    };

    const storeColor = (id: number, nodeId: number, target: Map<string, Set<number>>): Common.Color.Color|undefined => {
      if (id === -1) {
        return;
      }

      // Parse the color, discard transparent ones.
      const colorText = strings[id];
      if (!colorText) {
        return;
      }

      const color = Common.Color.parse(colorText);
      if (!color || color.asLegacyColor().rgba()[3] === 0) {
        return;
      }

      // Format the color and use as the key.
      const colorFormatted = formatColor(color);
      if (!colorFormatted) {
        return;
      }

      // Get the existing set of nodes with the color, or create a new set.
      const colorValues = target.get(colorFormatted) || new Set();
      colorValues.add(nodeId);

      // Store.
      target.set(colorFormatted, colorValues);

      return color;
    };

    const isSVGNode = (nodeName: string): boolean => {
      const validNodes = new Set([
        'altglyph',
        'circle',
        'ellipse',
        'path',
        'polygon',
        'polyline',
        'rect',
        'svg',
        'text',
        'textpath',
        'tref',
        'tspan',
      ]);
      return validNodes.has(nodeName.toLowerCase());
    };

    const isReplacedContent = (nodeName: string): boolean => {
      const validNodes = new Set(['iframe', 'video', 'embed', 'img']);
      return validNodes.has(nodeName.toLowerCase());
    };

    const isTableElementWithDefaultStyles = (nodeName: string, display: string): boolean => {
      const validNodes = new Set(['tr', 'td', 'thead', 'tbody']);
      return validNodes.has(nodeName.toLowerCase()) && display.startsWith('table');
    };

    let elementCount = 0;

    const {documents, strings} = await this.#domSnapshotAgent.invoke_captureSnapshot(snapshotConfig);
    for (const {nodes, layout} of documents) {
      // Track the number of elements in the documents.
      elementCount += layout.nodeIndex.length;

      for (let idx = 0; idx < layout.styles.length; idx++) {
        const styles = layout.styles[idx];
        const nodeIdx = layout.nodeIndex[idx];
        if (!nodes.backendNodeId || !nodes.nodeName) {
          continue;
        }
        const nodeId = nodes.backendNodeId[nodeIdx];
        const nodeName = nodes.nodeName[nodeIdx];

        const [backgroundColorIdx, textColorIdx, fillIdx, borderTopWidthIdx, borderTopColorIdx, borderBottomWidthIdx, borderBottomColorIdx, borderLeftWidthIdx, borderLeftColorIdx, borderRightWidthIdx, borderRightColorIdx, fontFamilyIdx, fontSizeIdx, fontWeightIdx, lineHeightIdx, positionIdx, topIdx, rightIdx, bottomIdx, leftIdx, displayIdx, widthIdx, heightIdx, verticalAlignIdx] =
            styles;

        storeColor(backgroundColorIdx, nodeId, backgroundColors);
        const textColor = storeColor(textColorIdx, nodeId, textColors);

        if (isSVGNode(strings[nodeName])) {
          storeColor(fillIdx, nodeId, fillColors);
        }

        if (strings[borderTopWidthIdx] !== '0px') {
          storeColor(borderTopColorIdx, nodeId, borderColors);
        }

        if (strings[borderBottomWidthIdx] !== '0px') {
          storeColor(borderBottomColorIdx, nodeId, borderColors);
        }

        if (strings[borderLeftWidthIdx] !== '0px') {
          storeColor(borderLeftColorIdx, nodeId, borderColors);
        }

        if (strings[borderRightWidthIdx] !== '0px') {
          storeColor(borderRightColorIdx, nodeId, borderColors);
        }

        /**
         * Create a structure like this for font info:
         *
         *                 / size (Map) -- nodes (Array)
         *                /
         * Font family (Map) ----- weight (Map) -- nodes (Array)
         *                \
         *                 \ line-height (Map) -- nodes (Array)
         */
        if (fontFamilyIdx && fontFamilyIdx !== -1) {
          const fontFamily = strings[fontFamilyIdx];
          const fontFamilyInfo = fontInfo.get(fontFamily) || new Map();

          const sizeLabel = 'font-size';
          const weightLabel = 'font-weight';
          const lineHeightLabel = 'line-height';

          const size = fontFamilyInfo.get(sizeLabel) || new Map();
          const weight = fontFamilyInfo.get(weightLabel) || new Map();
          const lineHeight = fontFamilyInfo.get(lineHeightLabel) || new Map();

          if (fontSizeIdx !== -1) {
            const fontSizeValue = strings[fontSizeIdx];
            const nodes = size.get(fontSizeValue) || [];
            nodes.push(nodeId);
            size.set(fontSizeValue, nodes);
          }

          if (fontWeightIdx !== -1) {
            const fontWeightValue = strings[fontWeightIdx];
            const nodes = weight.get(fontWeightValue) || [];
            nodes.push(nodeId);
            weight.set(fontWeightValue, nodes);
          }

          if (lineHeightIdx !== -1) {
            const lineHeightValue = strings[lineHeightIdx];
            const nodes = lineHeight.get(lineHeightValue) || [];
            nodes.push(nodeId);
            lineHeight.set(lineHeightValue, nodes);
          }

          // Set the data back.
          fontFamilyInfo.set(sizeLabel, size);
          fontFamilyInfo.set(weightLabel, weight);
          fontFamilyInfo.set(lineHeightLabel, lineHeight);
          fontInfo.set(fontFamily, fontFamilyInfo);
        }

        const blendedBackgroundColor =
            textColor && layout.blendedBackgroundColors && layout.blendedBackgroundColors[idx] !== -1 ?
            Common.Color.parse(strings[layout.blendedBackgroundColors[idx]]) :
            null;
        if (textColor && blendedBackgroundColor) {
          const contrastInfo = new ColorPicker.ContrastInfo.ContrastInfo({
            backgroundColors: [blendedBackgroundColor.asString(Common.Color.Format.HEXA)],
            computedFontSize: fontSizeIdx !== -1 ? strings[fontSizeIdx] : '',
            computedFontWeight: fontWeightIdx !== -1 ? strings[fontWeightIdx] : '',
          });
          const blendedTextColor =
              textColor.asLegacyColor().blendWithAlpha(layout.textColorOpacities ? layout.textColorOpacities[idx] : 1);
          contrastInfo.setColor(blendedTextColor);
          const formattedTextColor = formatColor(blendedTextColor);
          const formattedBackgroundColor = formatColor(blendedBackgroundColor.asLegacyColor());
          const key = `${formattedTextColor}_${formattedBackgroundColor}`;
          if (Root.Runtime.experiments.isEnabled('apca')) {
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
                  apca: true,
                },
              };
              if (textColorContrastIssues.has(key)) {
                (textColorContrastIssues.get(key) as ContrastIssue[]).push(issue);
              } else {
                textColorContrastIssues.set(key, [issue]);
              }
            }
          } else {
            const aaThreshold = contrastInfo.contrastRatioThreshold('aa') || 0;
            const aaaThreshold = contrastInfo.contrastRatioThreshold('aaa') || 0;
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
                  apca: false,
                },
              };
              if (textColorContrastIssues.has(key)) {
                (textColorContrastIssues.get(key) as ContrastIssue[]).push(issue);
              } else {
                textColorContrastIssues.set(key, [issue]);
              }
            }
          }
        }

        CSSOverviewUnusedDeclarations.checkForUnusedPositionValues(
            unusedDeclarations, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx);

        // Ignore SVG elements as, despite being inline by default, they can have width & height specified.
        // Also ignore replaced content, for similar reasons.
        if (!isSVGNode(strings[nodeName]) && !isReplacedContent(strings[nodeName])) {
          CSSOverviewUnusedDeclarations.checkForUnusedWidthAndHeightValues(
              unusedDeclarations, nodeId, strings, displayIdx, widthIdx, heightIdx);
        }

        if (verticalAlignIdx !== -1 && !isTableElementWithDefaultStyles(strings[nodeName], strings[displayIdx])) {
          CSSOverviewUnusedDeclarations.checkForInvalidVerticalAlignment(
              unusedDeclarations, nodeId, strings, displayIdx, verticalAlignIdx);
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
      elementCount,
    };
  }

  getComputedStyleForNode(nodeId: Protocol.DOM.NodeId): Promise<Protocol.CSS.GetComputedStyleForNodeResponse> {
    return this.#cssAgent.invoke_getComputedStyleForNode({nodeId});
  }

  async getMediaQueries(): Promise<Map<string, Protocol.CSS.CSSMedia[]>> {
    const queries = await this.#cssAgent.invoke_getMediaQueries();
    const queryMap = new Map<string, Protocol.CSS.CSSMedia[]>();

    if (!queries) {
      return queryMap;
    }

    for (const query of queries.medias) {
      // Ignore media queries applied to stylesheets; instead only use declared media rules.
      if (query.source === 'linkedSheet') {
        continue;
      }

      const entries = queryMap.get(query.text) || ([] as Protocol.CSS.CSSMedia[]);
      entries.push(query);
      queryMap.set(query.text, entries);
    }

    return queryMap;
  }

  async getGlobalStylesheetStats(): Promise<GlobalStyleStats|void> {
    // There are no ways to pull CSSOM values directly today, due to its unserializable format,
    // so instead we execute some JS within the page that extracts the relevant data and send that instead.
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
              for (const selector of selectorGroup.split(\/[\\t\\n\\f\\r ]+\/g)) {
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
                  const specialChars = \/[#\.:\\[\\]|\\+>~]\/;
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
    const {result} = await this.#runtimeAgent.invoke_evaluate({expression, returnByValue: true});

    // TODO(paullewis): Handle errors properly.
    if (result.type !== 'object') {
      return;
    }

    return result.value;
  }
}

SDK.SDKModel.SDKModel.register(CSSOverviewModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});
