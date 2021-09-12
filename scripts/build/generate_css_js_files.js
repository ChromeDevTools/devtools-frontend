// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const fetch = require('sync-fetch');
const CleanCSS = require('clean-css');
const [, , isDebugString, targetName, srcDir, targetGenDir, files] = process.argv;

const filenames = files.split(',');
const configFiles = [];
const cleanCSS = new CleanCSS();
const isDebug = isDebugString === 'true';

const constructibleStyleSheetsPolyfill = fetch('https://unpkg.com/construct-style-sheets-polyfill@3.0.0/dist/adoptedStyleSheets.js').text();

for (const fileName of filenames) {
  let output = fs.readFileSync(path.join(srcDir, fileName), {encoding: 'utf8', flag: 'r'});
  output = output.replace(/\`/g, '\\\'');
  output = output.replace(/\\/g, '\\\\');

  fs.writeFileSync(
      path.join(targetGenDir, fileName + '.js'),
      `${constructibleStyleSheetsPolyfill}
 
// Copyright ${new Date().getFullYear()} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const styles = new CSSStyleSheet();
styles.replaceSync(
\`${isDebug ? output : cleanCSS.minify(output).styles}
/*# sourceURL=${fileName} */
\`);
export default styles;
`);

  configFiles.push(`\"${fileName}.js\"`);
}

fs.writeFileSync(path.join(targetGenDir, `${targetName}-tsconfig.json`), `{
    "compilerOptions": {
        "composite": true,
        "outDir": "."
    },
    "files": [
        ${configFiles.join(',\n        ')}
    ]
}
`);
