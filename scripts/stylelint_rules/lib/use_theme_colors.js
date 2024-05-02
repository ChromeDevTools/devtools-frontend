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

const borderCombinedDeclarations = new Set(['border', 'border-top', 'border-bottom', 'border-left', 'border-right']);

const COLOR_INDICATOR_REGEXES = new Set([
  // We don't have to check for named colors ("blue") as we lint to ban those separately.
  /#[a-zA-Z0-9]{3,6}/,
  /hsla?/,
  /rgba?/,
]);

const CUSTOM_VARIABLE_OVERRIDE_PREFIX = '--override-';

const applicationColorsPath =
    path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'legacy', 'applicationColorTokens.css');
const themeColorsPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'legacy', 'themeColors.css');
const tokensPath = path.join(__dirname, '..', '..', '..', 'front_end', 'ui', 'legacy', 'tokens.css');
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

const DEFINED_APPLICATION_COLOR_VARIABLES = getRootVariableDeclarationsFromCSSFile(applicationColorsPath);
const DEFINED_THEME_COLOR_VARIABLES = getRootVariableDeclarationsFromCSSFile(themeColorsPath);
const DEFINED_COLOR_TOKEN_VARIABLES = getRootVariableDeclarationsFromCSSFile(tokensPath);
const DEFINED_INSPECTOR_STYLE_VARIABLES = getRootVariableDeclarationsFromCSSFile(inspectorCommonPath);
const ALL_DEFINED_VARIABLES = new Set([
  ...DEFINED_APPLICATION_COLOR_VARIABLES, ...DEFINED_THEME_COLOR_VARIABLES, ...DEFINED_COLOR_TOKEN_VARIABLES,
  ...DEFINED_INSPECTOR_STYLE_VARIABLES
]);

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

    function checkColorValueIsValidOrError({declarationToErrorOn, cssValueToCheck, alreadyFixed}) {
      for (const indicator of COLOR_INDICATOR_REGEXES) {
        /**
         * In rare situations in the codebase we allow
         * rgb(var(--some-base-color) / 20%) so we don't want to error if we
         * match that.
         */
        if (indicator.test(cssValueToCheck) && !cssValueToCheck.startsWith('rgb(var')) {
          reportError(declarationToErrorOn, !alreadyFixed);
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
          declarationToErrorOn.prop === 'background-image' || cssValueToCheck.startsWith('var(--image-file');
      if (shouldAllowAnyVars) {
        return;
      }

      if (cssValueToCheck === 'var()') {
        /**
         * If it's an empty var(), let's leave it, as the developer is
         * probably in the middle of typing the value into their editor, and
         * we don't want to jump the gun and test until they've filled that
         * value in.
         */
        return;
      }

      if (cssValueToCheck.includes('var(')) {
        const [match, variableName] = /var\((--[\w-]+)/.exec(cssValueToCheck);
        if (!match) {
          throw new Error(`Could not parse CSS variable usage: ${cssValueToCheck}`);
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

        if (!ALL_DEFINED_VARIABLES.has(variableName)) {
          reportError(declarationToErrorOn, !alreadyFixed);
        }
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

        /**
         * If we're checking a border-{top/bottom/left/right}, we need to regex
         * out just the color part of the declaration to check.
         */
        if (borderCombinedDeclarations.has(declaration.prop)) {
          // This is a pretty basic regex but it should split border-bottom:
          // var(--foo) solid var(--bar) into the three parts we need.
          // If this rule picks up false positives, we can improve this regex.
          const partsOfValue = /(.+)\s(\w+)\s(.+)/.exec(declaration.value);

          if (partsOfValue) {
            // eslint-disable-next-line no-unused-vars
            const [, lineSize, lineStyle, lineColor] = partsOfValue;
            // Line color is the only part we want to check as it's the only bit
            // that could contain color.
            checkColorValueIsValidOrError(
                {declarationToErrorOn: declaration, cssValueToCheck: lineColor, alreadyFixed});
            return;
          }
        }

        /**
         * If we're not doing a border-X check, we check the entire value of the declaration.
         */
        checkColorValueIsValidOrError(
            {declarationToErrorOn: declaration, cssValueToCheck: declaration.value, alreadyFixed});
      });
    });
  };
});

module.exports.ruleName = RULE_NAME;
