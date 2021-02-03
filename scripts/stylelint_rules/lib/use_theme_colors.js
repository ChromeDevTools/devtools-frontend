// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const stylelint = require('stylelint');
const postcss = require('postcss');
const path = require('path');
const fs = require('fs');

const RULE_NAME = 'plugin/use_theme_colors';

const CSS_PROPS_TO_CHECK_FOR_COLOR_USAGE = new Set([
  'color', 'box-shadow', 'text-shadow', 'outline-color', 'background-image', 'background-color', 'border-left-color',
  'border-right-color', 'border-top-color', 'border-bottom-color', '-webkit-border-image', 'fill', 'stroke'
]);

const COLOR_INDICATOR_REGEXES = new Set([
  // We don't have to check for named colors ("blue") as we lint to ban those separately.
  /^#[a-zA-Z0-9]{3,6}/,
  /^hsla?/,
  /^rgba?/,
]);

const themeColorsPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'themeColors.css');
const inspectorStylesPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'inspectorStyle.css');

function getRootVariableDeclarationsFromCSSFile(filePath) {
  const fileContents = fs.readFileSync(filePath, {encoding: 'utf-8'});
  const definedVariableNames = new Set();
  const parsed = postcss.parse(fileContents);
  // Only parse the colors in the :root declaration.
  parsed.walkRules(':root', rule => {
    for (const node of (rule.nodes || [])) {
      if (node.prop && node.prop.startsWith('--')) {
        definedVariableNames.add(node.prop);
      }
    }
  });
  return definedVariableNames;
}

const DEFINED_THEME_COLOR_VARIABLES = getRootVariableDeclarationsFromCSSFile(themeColorsPath);
const DEFINED_INSPECTOR_STYLE_VARIABLES = getRootVariableDeclarationsFromCSSFile(inspectorStylesPath);

/**
 *
 * @param {postcss.Rule} rule
 * @returns {Array<postcss.Node>}
 */
function gatherColorDeclarations(rule) {
  if (!rule.nodes) {
    return [];
  }
  /**
   * @type {Array<postcss.Node>}
   */
  const declarationsWithColors = [];

  for (const node of rule.nodes) {
    if (!CSS_PROPS_TO_CHECK_FOR_COLOR_USAGE.has(node.prop)) {
      continue;
    }

    declarationsWithColors.push(node);
  }
  return declarationsWithColors;
}


module.exports = stylelint.createPlugin(RULE_NAME, function(primary, secondary, context) {
  return function(postcssRoot, postcssResult) {
    function reportError(declaration) {
      stylelint.utils.report({
        message: 'All CSS color declarations should use a variable defined in ui/themeColors.css',
        ruleName: RULE_NAME,
        node: declaration,
        result: postcssResult,
      });
    }
    const sourceFile = postcssResult.opts.from;
    if (sourceFile && !sourceFile.includes('front_end') && sourceFile.includes('inspector_overlay')) {
      // The inspector overlay sits outside of front_end and does not get loaded
      // with the same CSS variables. So we don't want to apply this rule to it.
      return;
    }

    postcssRoot.walkRules(rule => {
      // If you are providing a selector specifically for dark mode, you can use
      // any colors you want, as it means you are purposefully deviating. This
      // is not encouraged but we do need to allow it.
      if (rule.selector.startsWith(':host-context(.-theme-with-dark-background)') ||
          rule.selector.startsWith('.-theme-with-dark-background')) {
        return;
      }

      const declarationsToCheck = gatherColorDeclarations(rule);

      for (const declaration of declarationsToCheck) {
        for (const indicator of COLOR_INDICATOR_REGEXES) {
          if (indicator.test(declaration.value)) {
            reportError(declaration);
          }
        }

        if (declaration.value.startsWith('var')) {
          const [match, variableName] = /var\((--[\w-]+)/.exec(declaration.value);
          if (!match) {
            throw new Error(`Could not parse CSS variable usage: ${declaration.value}`);
          }
          const variableIsValid =
              DEFINED_INSPECTOR_STYLE_VARIABLES.has(variableName) || DEFINED_THEME_COLOR_VARIABLES.has(variableName);
          if (!variableIsValid) {
            reportError(declaration);
          }
        }
      }
    });
  };
});

module.exports.ruleName = RULE_NAME;
