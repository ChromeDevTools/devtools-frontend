// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
                 .option('html-output-file', {
                   type: 'string',
                   demandOption: true,
                 })
                 .option('js-output-file', {
                   type: 'string',
                   demandOption: true,
                 })
                 .option('sources-file', {
                   type: 'string',
                   demandOption: true,
                 })
                 .parseSync();

const HTML_OUTPUT_FILE = argv.htmlOutputFile;
const JS_OUTPUT_FILE = argv.jsOutputFile;
const SOURCES_FILE = argv.sourcesFile;

if (!HTML_OUTPUT_FILE || !JS_OUTPUT_FILE || !SOURCES_FILE) {
  console.error(
      'Usage: node generate_docs.js --devtools-frontend-path <path> --html-output-file <path> --js-output-file <path> --sources-file <path>');
  process.exit(1);
}

async function main() {
  const componentDocs = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));

  const componentLinks = componentDocs
                             .map(p => path.basename(p, '.docs.js'))
                             .sort()
                             .map(componentName => `<li><a href="#${componentName}">${componentName}</a></li>`)
                             .join('\n');

  const docImports = componentDocs
                         .map(p => {
                           const componentName = path.basename(p, '.docs.js');
                           return `'${componentName}': () => import('${p}'),`;
                         })
                         .join('\n');

  const docLoader = `
    const components = {
      ${docImports}
    };

    const mainContent = document.querySelector('.main-content');

    async function loadComponent(name) {
      if (!components[name] || !mainContent) {
        return;
      }

      let container = document.getElementById('container');
      // Replace the container to start off with a clean one.
      if (container) {
        container.remove();
      }

      container = document.createElement('div');
      container.id = 'container';
      mainContent.appendChild(container);

      const {render} = await components[name]();
      render(container);
    }

    window.addEventListener('hashchange', () => {
      const componentName = window.location.hash.substr(1);
      loadComponent(componentName);
    });

    if (window.location.hash) {
      loadComponent(window.location.hash.substr(1));
    }
  `;

  const styleSheets = [
    'front_end/design_system_tokens.css',
    'front_end/application_tokens.css',
    'front_end/ui/legacy/inspectorCommon.css',
    'front_end/ui/components/buttons/textButton.css',
    'scripts/component_docs/component_docs.css',
  ];

  const linksToStyleSheets = styleSheets
                                 .map(
                                     link => `<link rel="stylesheet" href="./${link}" type="text/css" />`,
                                     )
                                 .join('\n');

  // The path to the loader script is now relative from the root of gen/.
  const loaderScriptPath = path.relative(path.dirname(HTML_OUTPUT_FILE), JS_OUTPUT_FILE);

  const indexHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <title>DevTools components</title>
        ${linksToStyleSheets}
      </head>
      <body>
        <nav class="sidebar">
          <h1>DevTools components</h1>
          <ul class="components-list">
            ${componentLinks}
          </ul>
        </nav>
        <div class="divider"></div>
        <main class="main-content">
          <div id="container"></div>
        </main>
        <script type="module" src="${loaderScriptPath}"></script>
      </body>
    </html>
  `;

  fs.writeFileSync(HTML_OUTPUT_FILE, indexHtml);
  fs.writeFileSync(JS_OUTPUT_FILE, docLoader);
}

main();
