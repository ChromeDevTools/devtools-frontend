// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const stylelint = require('stylelint');
const postcss = require('postcss');
const path = require('path');
const fs = require('fs');

const RULE_NAME = 'plugin/use_theme_colors';

const CSS_PROPS_TO_CHECK_FOR_COLOR_USAGE = new Set([
  'color',
  'box-shadow',
  'text-shadow',
  'outline-color',
  'background-image',
  'background-color',
  'border-left-color',
  'border-right-color',
  'border-top-color',
  'border-bottom-color',
  '-webkit-border-image',
  'fill',
  'stroke',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'background',
  'border',
  'border-color',
  'outline'
]);

const COLOR_INDICATOR_REGEXES = new Set([
  // We don't have to check for named colors ("blue") as we lint to ban those separately.
  /#[a-zA-Z0-9]{3,6}/,
  /hsla?/,
  /rgba?/,
]);

const CUSTOM_VARIABLE_OVERRIDE_PREFIX = '--override-';

const themeColorsPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'legacy', 'themeColors.css');
const inspectorCommonPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'legacy', 'inspectorCommon.css');

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
const DEFINED_INSPECTOR_STYLE_VARIABLES = getRootVariableDeclarationsFromCSSFile(inspectorCommonPath);

module.exports = stylelint.createPlugin(RULE_NAME, function(primary, secondary, context) {
  return function(postcssRoot, postcssResult) {
    function reportError(declaration, shouldFix) {
      /**
       * Unfortunately for this rule there seems to be an issue with stylelint's
       * built in context.fix flag, in that it doesn't always get set to true
       * when we would expect, and therefore relying on it to toggle autofixing
       * isn't what we want to do. Additionally we run our stylelint checks by
       * default with the --fix flag applied, but for this rule we don't want to
       * always autofix. So we'll instead rely on an environment variable to
       * toggle fix mode for this give rule.
       *
       * After this rule initially lands and has run on the existing codebase,
       * we shouldn't be fixing new violations by using stylelint-disable, but
       * instead changing the colors appropriately to satisfy the conditions of
       * this rule.
       */
      const runningInFixMode = Boolean(process.env.THEME_COLORS_AUTOFIX);
      if (runningInFixMode && shouldFix) {
        // Unfortunately if you add crbug.com/X to the same comment as the
        // stylelint-disable-line, it doesn't work, hence why we add two
        // comments, one to disable and one with the tracking bug.
        declaration.after(postcss.comment({text: 'See: crbug.com/1152736 for color variable migration.'}));
        declaration.after(' /* stylelint-disable-line plugin/use_theme_colors */');
      } else {
        stylelint.utils.report({
          message: 'All CSS color declarations should use a variable defined in ui/legacy/themeColors.css',
          ruleName: RULE_NAME,
          node: declaration,
          result: postcssResult,
        });
      }
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

      rule.walkDecls(declaration => {
        if (!CSS_PROPS_TO_CHECK_FOR_COLOR_USAGE.has(declaration.prop)) {
          return;
        }

        /**
         * Fix the index of the declaration in its parent and then see if its
         * immediate sibling node is a comment with the disable-line text in. If
         * so, this violation is already fixed and we don't need to fix it again
         * - else every run would add more comments.
         */
        const declIndex = declaration.parent.nodes.indexOf(declaration);
        const nextNode = declaration.parent.nodes[declIndex + 1];
        const previousNode = declaration.parent.nodes[declIndex - 1];
        const nextNodeIsDisableComment = nextNode && nextNode.type === 'comment' &&
            nextNode.text.startsWith('stylelint-disable-line plugin/use_theme_colors');
        const previousNodeIsDisableComment = previousNode && previousNode.type === 'comment' &&
            previousNode.text.startsWith('stylelint-disable-next-line plugin/use_theme_colors');
        const alreadyFixed = nextNodeIsDisableComment || previousNodeIsDisableComment;

        for (const indicator of COLOR_INDICATOR_REGEXES) {
          if (indicator.test(declaration.value)) {
            reportError(declaration, !alreadyFixed);
          }
        }

        /**
         * We exempt background-image from var() checks otherwise it will think
         * that: background-image: var(--my-lovely-image) is bad when it's not.
         *
         * Additionally we load images via variables which always start with
         * --image-file, so those variables are allowed regardless of where they
         * are used.
         */
        const shouldAllowAnyVars =
            declaration.prop === 'background-image' || declaration.value.startsWith('var(--image-file');
        if (shouldAllowAnyVars) {
          return;
        }
        if (declaration.value.includes('var(')) {
          const [match, variableName] = /var\((--[\w-]+)/.exec(declaration.value);
          if (!match) {
            throw new Error(`Could not parse CSS variable usage: ${declaration.value}`);
          }

          /**
           * The override prefix acts as an escape hatch to allow custom-defined
           * color variables to be applied. This option should only be used when
           * there's no alternative. Example scenarios include using CSS
           * variables to customize internal styles of a web component from its
           * host environment.
           */
          if (variableName.startsWith(CUSTOM_VARIABLE_OVERRIDE_PREFIX)) {
            return;
          }

          const variableIsValid =
              DEFINED_INSPECTOR_STYLE_VARIABLES.has(variableName) || DEFINED_THEME_COLOR_VARIABLES.has(variableName);
          if (!variableIsValid) {
            reportError(declaration, !alreadyFixed);
          }
        }
      });
    });
  };
});

module.exports.ruleName = RULE_NAME;
