// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const {parse, print, types} = require('recast');
const {promisify} = require('util');

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);

const FRONT_END_FOLDER = path.join(__filename, '..', '..', '..', 'front_end');

const LINE_LICENSE_HEADER = [
  'Copyright 2020 The Chromium Authors. All rights reserved.',
  'Use of this source code is governed by a BSD-style license that can be',
  'found in the LICENSE file.',
];

const BLOCK_LICENSE_HEADER = [
  'Copyright \\(C\\) \\d{4} Google Inc. All rights reserved.',
  '',
  'Redistribution and use in source and binary forms, with or without',
  'modification, are permitted provided that the following conditions are',
  'met:',
  '',
  '    \\* Redistributions of source code must retain the above copyright',
  'notice, this list of conditions and the following disclaimer.',
  '    \\* Redistributions in binary form must reproduce the above',
  'copyright notice, this list of conditions and the following disclaimer',
  'in the documentation and/or other materials provided with the',
  'distribution.',
  '    \\* Neither the name of Google Inc. nor the names of its',
  'contributors may be used to endorse or promote products derived from',
  'this software without specific prior written permission.',
  '',
  'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS',
  '"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT',
  'LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR',
  'A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT',
  'OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,',
  'SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES \\(INCLUDING, BUT NOT',
  'LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,',
  'DATA, OR PROFITS; OR BUSINESS INTERRUPTION\\) HOWEVER CAUSED AND ON ANY',
  'THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT',
  '\\(INCLUDING NEGLIGENCE OR OTHERWISE\\) ARISING IN ANY WAY OUT OF THE USE',
  'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
];

const LINE_REGEXES = LINE_LICENSE_HEADER.map(line => new RegExp('[ ]?' + line.replace('2020', '(\\(c\\) )?\\d{4}')));
const BLOCK_REGEX = new RegExp('[\\s\\\\n\\*]*' + BLOCK_LICENSE_HEADER.join('[\\s\\\\n\\*]*'), 'm');

const EXCLUDED_FILES = [
  // FIXME: LightHouse bundles must be moved to third_party
  'audits/lighthouse/report.js',
  'audits/lighthouse/report-generator.js',
  'audits_worker/lighthouse/lighthouse-dt-bundle.js',
  // FIXME: CodeMirror bundles must be moved to third_party
  'cm/active-line.js',
  'cm/brace-fold.js',
  'cm/closebrackets.js',
  'cm/codemirror.js',
  'cm/comment.js',
  'cm/foldcode.js',
  'cm/foldgutter.js',
  'cm/mark-selection.js',
  'cm/matchbrackets.js',
  'cm/multiplex.js',
  'cm/overlay.js',
  'cm_headless/headlesscodemirror.js',
  'cm_modes/clike.js',
  'cm_modes/clojure.js',
  'cm_modes/coffeescript.js',
  'cm_modes/jsx.js',
  'cm_modes/livescript.js',
  'cm_modes/markdown.js',
  'cm_modes/php.js',
  'cm_modes/python.js',
  'cm_modes/shell.js',
  'cm_web_modes/css.js',
  'cm_web_modes/htmlembedded.js',
  'cm_web_modes/htmlmixed.js',
  'cm_web_modes/javascript.js',
  'cm_web_modes/xml.js',
  // FIXME: Dagre bundles must be moved to third_party
  'dagre_layout/dagre.js',
  // FIXME: Diff bundles must be moved to third_party
  'diff/diff_match_patch.js',
  // FIXME: Acorn bundles must be moved to third_party
  'formatter_worker/acorn/acorn.js',
  'formatter_worker/acorn/acorn_loose.js',
  // Breaks esprima
  'components/Linkifier.js',
  'coverage/CoverageView.js',
  'network/NetworkLogView.js',
];

const OTHER_LICENSE_HEADERS = [
  // Apple
  'bindings/ResourceUtils.js',
  'common/Color.js',
  'common/Object.js',
  'common/ResourceType.js',
  'data_grid/DataGrid.js',
  'dom_extension/DOMExtension.js',
  'elements/MetricsSidebarPane.js',
  'profiler/CPUProfileView.js',
  'profiler/ProfilesPanel.js',
  'resources/ApplicationCacheItemsView.js',
  'resources/ApplicationCacheModel.js',
  'resources/DatabaseModel.js',
  'resources/DatabaseQueryView.js',
  'resources/DatabaseTableView.js',
  'sdk/Resource.js',
  'sdk/Script.js',
  'source_frame/FontView.js',
  'source_frame/ImageView.js',
  'sources/CallStackSidebarPane.js',
  'ui/Panel.js',
  'ui/Treeoutline.js',
  // Brian Grinstead
  'color_picker/Spectrum.js',
  // Joseph Pecoraro
  'console/ConsolePanel.js',
  // Research In Motion Limited
  'network/ResourceWebSocketFrameView.js',
  // 280 North Inc.
  'profiler/BottomUpProfileDataGrid.js',
  'profiler/ProfileDataGrid.js',
  'profiler/TopDownProfileDataGrid.js',
  // IBM Corp
  'sources/WatchExpressionsSidebarPane.js',
  // Multiple authors
  'common/UIString.js',
  'components/JSPresentationUtils.js',
  'console/ConsoleView.js',
  'console/ConsoleViewMessage.js',
  'cookie_table/CookiesTable.js',
  'elements/ComputedStyleWidget.js',
  'elements/ElementsPanel.js',
  'elements/ElementsTreeElement.js',
  'elements/ElementsTreeOutline.js',
  'elements/EventListenersWidget.js',
  'elements/PropertiesWidget.js',
  'elements/StylesSidebarPane.js',
  'main/MainImpl.js',
  'network/HARWriter.js',
  'network/NetworkDataGridNode.js',
  'network/NetworkPanel.js',
  'network/NetworkTimeCalculator.js',
  'network/RequestHeadersView.js',
  'object_ui/ObjectPropertiesSection.js',
  'perf_ui/TimelineGrid.js',
  'platform/utilities.js',
  'resources/ApplicationPanelSidebar.js',
  'resources/CookieItemsView.js',
  'resources/DOMStorageItemsView.js',
  'resources/DOMStorageModel.js',
  'sdk/DOMModel.js',
  'source_frame/ResourceSourceFrame.js',
  'sources/ScopeChainSidebarPane.js',
  'sources/SourcesPanel.js',
  'timeline/TimelinePanel.js',
  'timeline/TimelineUIUtils.js',
  'ui/KeyboardShortcut.js',
  'ui/SearchableView.js',
  'ui/TextPrompt.js',
  'ui/UIUtils.js',
  'ui/Widget.js',
];

async function readAstFromFile(fileName) {
  try {
    return parse(await readFile(fileName));
  } catch (e) {
    throw new Error(`Failed to check license header for ${fileName}: ${e.stack}`);
  }
}

async function addMissingLicenseHeader(firstStatement, ast, fileName) {
  firstStatement.comments = LINE_LICENSE_HEADER.map(line => types.builders.commentLine(line));
  await writeFile(fileName, print(ast).code);
}

/**
 * Check each linecomment that should (combined) result in the LINE_LICENSE_HEADER.
 */
function checkLineCommentLicense(comments, fileName) {
  for (let i = 0; i < LINE_REGEXES.length; i++) {
    if (!LINE_REGEXES[i].test(comments[i].value)) {
      throw new Error(`Invalid license header detected in ${fileName}`);
    }
  }
}

/**
 * We match the whole block comment, including potential leading asterisks of the jsdoc.
 */
function checkBlockCommentLicense(licenseText, fileName) {
  if (!BLOCK_REGEX.test(licenseText)) {
    throw new Error(`Invalid license header detected in ${fileName}`);
  }
}

async function checkFolder(folder) {
  for (const file of await readDir(folder, {withFileTypes: true})) {
    const fileName = path.join(folder, file.name);
    const relativePath = path.relative(FRONT_END_FOLDER, fileName);

    if (file.name === 'third_party' || file.name.endsWith('TestRunner.js') || EXCLUDED_FILES.includes(relativePath) ||
        OTHER_LICENSE_HEADERS.includes(relativePath)) {
      continue;
    }

    if (file.isDirectory()) {
      await checkFolder(fileName);
    } else if (file.isFile() && file.name.endsWith('.js')) {
      const ast = await readAstFromFile(fileName);
      const firstStatement = ast.program.body[0];

      if (!firstStatement.comments || firstStatement.comments.length === 0) {
        await addMissingLicenseHeader(firstStatement, ast, fileName);
      } else if (firstStatement.comments[0].type === 'Line') {
        checkLineCommentLicense(firstStatement.comments, fileName);
      } else {
        checkBlockCommentLicense(firstStatement.comments[0].value, fileName)
      }
    }
  }
}

async function main() {
  try {
    await checkFolder(FRONT_END_FOLDER);
  } catch (e) {
    console.error(e.stack);
    process.exit(1);
  }
}

main();
