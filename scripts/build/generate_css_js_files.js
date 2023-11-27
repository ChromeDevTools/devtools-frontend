// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const {writeIfChanged} = require('./ninja/write-if-changed.js');
const postcss = require('postcss');
const cssnano = require('cssnano');

async function runCSSMinification(input, fileName) {
  // postcss needs to be given a fileName, even though it doesn't read from it nor write to it.
  // So we pass in the correct name, even though it has no impact on the resulting code.
  const result = await postcss([cssnano({preset: require('cssnano-preset-lite')})]).process(input, {from: fileName});
  return result.css;
}

async function codeForFile({srcDir, fileName, input, isDebug, hotReloadEnabled, isLegacy = false, buildTimestamp}) {
  input = input.replace(/\`/g, '\\\'');
  input = input.replace(/\\/g, '\\\\');

  const stylesheetContents = isDebug ? input : await runCSSMinification(input, fileName);

  // clang-format off
  const hotReloadListener = (isDebug && hotReloadEnabled) ? `
// CSS hot reloading code for 'watch' script
window.HOT_STYLE_SHEETS = window.HOT_STYLE_SHEETS || {};
window.HOT_STYLE_SHEETS["${path.resolve(srcDir, fileName)}"] = styles;
if (!window.HOT_STYLE_SHEETS_WEB_SOCKET) {
  const ws = new WebSocket("ws://localhost:8080");
  ws.addEventListener('close', () => {
    console.warn("Connection to watch script is closed, CSS changes won't be applied");
  });
  ws.addEventListener('message', (message) => {
    const parsedData = JSON.parse(message.data);
    const styleSheet = window.HOT_STYLE_SHEETS[parsedData.file];
    if (styleSheet) {
      styleSheet.replace(parsedData.content);
    }
  });
  window.HOT_STYLE_SHEETS_WEB_SOCKET = ws;
}
` : '';
  // clang-format on

  let exportStatement;
  if (isLegacy) {
    exportStatement = `export default {
  cssContent: \`${stylesheetContents}\`
};`;
  } else {
    exportStatement = `const styles = new CSSStyleSheet();
styles.replaceSync(
\`${stylesheetContents}
/*# sourceURL=${fileName} */
\`);
${hotReloadListener}
export default styles;`;
  }

  const newContents = `// Copyright ${
      new Date(Number(buildTimestamp) * 1000).getUTCFullYear()} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// IMPORTANT: this file is auto generated. Please do not edit this file.
/* istanbul ignore file */
${exportStatement}
`;
  return newContents;
}

// Exported only so it can be unit tested.
exports.codeForFile = codeForFile;

async function runMain() {
  const [, , buildTimestamp, isDebugString, legacyString, targetName, srcDir, targetGenDir, files, hotReloadEnabledString] =
      process.argv;

  const filenames = files.split(',');
  const configFiles = [];
  const isDebug = isDebugString === 'true';
  const isLegacy = legacyString === 'true';
  const hotReloadEnabled = hotReloadEnabledString === 'true';

  for (const fileName of filenames) {
    const contents = fs.readFileSync(path.join(srcDir, fileName), {encoding: 'utf8', flag: 'r'});
    const newContents =
        await codeForFile({srcDir, fileName, isDebug, hotReloadEnabled, input: contents, isLegacy, buildTimestamp});
    const generatedFileName = `${fileName}${isLegacy ? '.legacy' : ''}.js`;
    const generatedFileLocation = path.join(targetGenDir, generatedFileName);

    writeIfChanged(generatedFileLocation, newContents);

    configFiles.push(`\"${generatedFileName}\"`);
  }

  writeIfChanged(path.join(targetGenDir, `${targetName}-tsconfig.json`), `{
    "compilerOptions": {
        "composite": true,
        "outDir": "."
    },
    "files": [
        ${configFiles.join(',\n        ')}
    ]
}
`);
}

if (require.main === module) {
  runMain();
}