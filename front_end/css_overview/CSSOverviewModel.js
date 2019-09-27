// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    this._runtimeAgent = target.runtimeAgent();
    this._cssAgent = target.cssAgent();
    this._domAgent = target.domAgent();
  }

  getFlattenedDocument() {
    return this._domAgent.getFlattenedDocument(-1, true);
  }

  getComputedStyleForNode(nodeId) {
    return this._cssAgent.getComputedStyleForNode(nodeId);
  }

  async getGlobalStylesheetStats() {
    // There are no ways to pull CSSOM values directly today, due to its unserializable format,
    // so instead we execute some JS within the page that extracts the relevant data and send that instead.
    const expression = `(function() {
      let styleRules = 0;
      let mediaRules = 0;
      let inlineStyles = 0;
      let externalSheets = 0;
      for (const { rules, href } of document.styleSheets) {
        if (href) {
          externalSheets++;
        } else {
          inlineStyles++;
        }

        for (const rule of rules) {
          if ('selectorText' in rule) {
            styleRules++;
          } else if ('conditionText' in rule) {
            mediaRules++;
          }
        }
      }

      return {
        styleRules,
        mediaRules,
        inlineStyles,
        externalSheets
      }
    })()`;
    const {result} = await this._runtimeAgent.invoke_evaluate({expression, returnByValue: true});

    // TODO(paullewis): Handle errors properly.
    if (result.type !== 'object')
      return;

    return result.value;
  }

  async getStylesStatsForNode(nodeId) {
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

    const matches = await this._cssAgent.invoke_getMatchedStylesForNode({nodeId});
    if (!matches || !matches.matchedCSSRules || !matches.matchedCSSRules.length)
      return;

    matches.matchedCSSRules.forEach(cssRule => {
      const {matchingSelectors} = cssRule;
      const {origin, selectorList} = cssRule.rule;
      const isExternalSheet = origin === 'regular';
      if (!isExternalSheet || !selectorList)
        return;


      const selectors = matchingSelectors.map(idx => selectorList.selectors[idx]);

      // Each group of selectors, e.g. foo.baz, foo .bar, foo { ... }
      for (const {text} of selectors) {
        // Each group that was used.
        for (const selectorGroup of text.split(',')) {
          // Each selector in the group.
          for (const selector of selectorGroup.split(/[\t\n\f\r ]+/g)) {
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
              const specialChars = /[#\.:\[\]|\+>~]/;
              if (specialChars.test(selector))
                stats.nonSimple.add(selector);
              else
                stats.type.add(selector);
            }
          }
        }
      }
    });

    return stats;
  }
};

SDK.SDKModel.register(CssOverview.CSSOverviewModel, SDK.Target.Capability.DOM, false);
