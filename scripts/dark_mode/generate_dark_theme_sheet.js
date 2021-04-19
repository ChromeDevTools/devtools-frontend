// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This code is based on the color patching in theme_support_impl.js
 *
 * The dark mode migration (go/devtools-dark-mode-migration) will remove the
 * runtime color patching but for third party stylesheets we still need to
 * generate DevTools appropriate dark mode stylesheets.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const {argv} = require('yargs');
const devtoolsPaths = require('../devtools_paths.js');
const postcss = require('postcss');

/**
 * Finds the rules from the source CSS sheet that need to be passed into the
 * color patching. If we have:
 *
 * ```
 * p { color: red; }
 * a { color: blue; }
 * .-theme-with-dark-background p { color: pink; }
 * ```
 *
 * Then we only need to pass `a { color: blue; }` into the patching, because the
 * `p` has been explicitly styled for dark mode. We can also ignore any rules
 * that are defined as CSS variables, as they won't be patched.
 * @param {string} contents
 */
function rulesToPassToColorPatching(contents) {
  /**
   * @type {Set<postcss.Rule>}
   */
  const darkModeOverrideRules = new Set();
  /**
   * @type {Map<string, postcss.Rule>}
   */
  const nonDarkModeRulesBySelector = new Map();

  /* We first walk through the CSS to split rules into two categories
   * 1) rules that are dark mode overrides
   * 2) rules that are not
   */
  const parsedCSS = postcss.parse(contents);
  parsedCSS.walkRules(rule => {
    if (rule.parent && rule.parent.type === 'atrule' && rule.parent.params.includes('forced-colors: active')) {
      // atrule here = @media, @charset, etc.
      // Do nothing for the forced-color styles.
      return;
    }
    if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') {
      // We never want to include keyframes because they are not color patched.
      // Developers must explicitly define keyframes for light and dark mode.
      return;
    }

    const ruleIsDarkModeOverride = rule.selector.includes('.-theme-with-dark-background');
    if (ruleIsDarkModeOverride) {
      darkModeOverrideRules.add(rule);
    } else {
      // Go through the rule and remove any declarations that use variables, as
      // they don't get patched.
      let totalDeclsInRule = 0;
      rule.walkDecls(decl => {
        totalDeclsInRule++;
        if (/^var\(.*\)$/.test(decl.value)) {
          totalDeclsInRule--;
          decl.remove();
        }
      });
      if (totalDeclsInRule === 0) {
        // The rule only had declarations whose values are variables, so we can ditch the rule entirely.
        return;
      }

      // If we're here, that means the rule contains declarations that do need
      // to be patched.

      // We trim the selector down so we can look it up later and not be
      // dependent on whitespace
      nonDarkModeRulesBySelector.set(rule.selector.trim().replace(/\n/g, ''), rule);
    }
  });

  // Now we have the dark mode rules, we need to go through the sheet again to
  // find a matching (non-dark) rule for it.
  for (const darkModeOverride of darkModeOverrideRules) {
    // Take the dark mode selector and remove the dark-mode specific parts, such
    // that we can look for the non-dark-mode selector from the input
    // stylesheet.
    const withHostContextRemoved =
        darkModeOverride.selector.replace(/:host-context\(\.-theme-with-dark-background\) /g, '');
    const withThemeClassRemoved =
        withHostContextRemoved.replace(/\.-theme-with-dark-background /g, '').replace(/\n/g, '').trim();

    /*
     * if we have :host-context(.-theme-with-dark-background) p, .-theme-with-dark-background p {}, then the above replaces have made that:
     * p,p {}
     * So we split on commas, trim, make sure we have just unique selectors, and
     * then use those to look up the source rule.
     */
    const ruleDeduplicated = Array.from(new Set(withThemeClassRemoved.split(',').map(part => part.trim()))).join(',');
    const matchingRule = nonDarkModeRulesBySelector.get(ruleDeduplicated);
    if (matchingRule) {
      /* Now we go through the rule and look at each declaration within it. Any that are also declared in the dark mode override can be removed.
       * Then at the end we are left with either an empty rule, which can be dropped, or a rule containing colors that still need patching.
       */
      const darkModeDeclarationPropertyNames = new Set();
      darkModeOverride.walkDecls(decl => {
        darkModeDeclarationPropertyNames.add(decl.prop);
      });

      let totalDeclarationsInRule = 0;
      matchingRule.walkDecls(decl => {
        totalDeclarationsInRule++;
        if (darkModeDeclarationPropertyNames.has(decl.prop)) {
          decl.remove();
          totalDeclarationsInRule--;
        }
      });

      if (totalDeclarationsInRule === 0) {
        // We removed all declarations from the rule, so this rule can go. There's nothing to patch.
        nonDarkModeRulesBySelector.delete(ruleDeduplicated);
      }
    }
  }

  const rulesNeedingPatching = Array.from(nonDarkModeRulesBySelector.values());
  return rulesNeedingPatching.join('\n');
}


/**
 * @param {string} chromeBinary
 * @param {string} sheetFilePath
 */
async function generateDarkModeStyleSheet(chromeBinary, sheetFilePath) {
  console.log(
      'IMPORTANT: for the dark mode generator to work, the hosted server must be running on https://localhost:8090.');
  const sourceSheetContents = fs.readFileSync(path.join(process.cwd(), sheetFilePath), 'utf-8');
  const rulesForColorPatching = rulesToPassToColorPatching(sourceSheetContents);

  const browser = await puppeteer.launch({executablePath: chromeBinary, args: ['--ignore-certificate-errors']});
  const page = await browser.newPage();
  try {
    await page.goto('https://localhost:8090/');
  } catch (e) {
    console.log('Could not connect. Is the hosted server running on port 8090?');
    process.exit(1);
  }

  const darkModeStyles = await page.evaluate(async contents => {
    const ThemeSupport = await import('./front_end/ui/legacy/theme_support/theme_support.js');
    const setting = {
      get() {
        return 'dark';
      }
    };

    const themeSupportInstance = ThemeSupport.ThemeSupport.instance({
      forceNew: true,
      setting,
    });

    const result = themeSupportInstance.themeStyleSheet('foo', contents);
    const withHostSelector = result.split('\n').map(line => {
      const [selectors, rules] = line.split('{');
      const scopedSelectors = selectors.split(',').flatMap(selector => {
        /** At this point we get back a list of rules and we need to find each
     * selector, prefixing it with :host-context(.-theme-with-dark-background) and also prefixing it with .-theme-with-dark-background, so we have a selector for elements in and outside a shadow root.
     * */
        return [
          `:host-context(.-theme-with-dark-background) ${selector.trim()}`,
          `.-theme-with-dark-background ${selector.trim()}`,
        ];
      });
      return scopedSelectors.join(',\n') + ' {\n' + rules.split(';').map(r => `  ${r}`).join(';\n');
    });

    return withHostSelector.join('\n\n');
  }, rulesForColorPatching);

  await browser.close();

  const inputBaseName = path.basename(sheetFilePath, '.css');
  const outputFileName = inputBaseName + '.darkmode.css';
  const outputFilePath = path.join(process.cwd(), path.dirname(sheetFilePath), outputFileName);

  const output = `/* This file was automatically generated via:
npm run generate-dark-mode-styles ${path.relative(process.cwd(), inputFile)}
* Last Updated: ${String(new Date())}
*/
/* stylelint-disable */
${darkModeStyles}
/* stylelint-enable */\n`;

  fs.writeFileSync(outputFilePath, output, {encoding: 'utf-8'});
  console.log('Wrote dark mode styles to', path.relative(process.cwd(), outputFilePath));
}

async function run(chromeBinaryPath, inputFile) {
  await generateDarkModeStyleSheet(chromeBinaryPath, inputFile);
}

const [inputFile] = argv._;

if (!inputFile) {
  console.log(`Usage:
  generate_dark_theme_sheet.js inputFile

  example:
    generate_dark_theme_sheet.js front_end/text_editor/cmdevtools.css
  `);

  process.exit(1);
}

run(devtoolsPaths.downloadedChromeBinaryPath(), inputFile);

// We export the function so we can unit test it, it's not used otherwise externally.
module.exports = {rulesToPassToColorPatching};
