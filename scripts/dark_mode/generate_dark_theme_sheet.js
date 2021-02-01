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

/**
 * @param {string} chromeBinary
 * @param {string} sheetFilePath
 */
async function generateDarkModeStyleSheet(chromeBinary, sheetFilePath) {
  console.log(
      'IMPORTANT: for the dark mode generator to work, the hosted server must be running on https://localhost:8090.');
  const contents = fs.readFileSync(path.join(process.cwd(), sheetFilePath), 'utf-8');

  const browser = await puppeteer.launch({executablePath: chromeBinary, args: ['--ignore-certificate-errors']});
  const page = await browser.newPage();
  try {
    await page.goto('https://localhost:8090/');
  } catch (e) {
    console.log('Could not connect. Is the hosted server running on port 8090?');
    process.exit(1);
  }

  const darkModeStyles = await page.evaluate(async contents => {
    const ThemeSupport = await import('./front_end/theme_support/theme_support.js');
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
      return scopedSelectors.join(', ') + '{\n' + rules;
    });

    return withHostSelector.join('\n');
  }, contents);

  await browser.close();

  const inputBaseName = path.basename(sheetFilePath, '.css');
  const outputFileName = inputBaseName + '.darkmode.css';

  const outputFilePath = path.join(process.cwd(), path.dirname(sheetFilePath), outputFileName);

  const output = `/* This file was automatically generated via:
npm run generate-dark-mode-styles ${path.relative(process.cwd(), inputFile)}
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
