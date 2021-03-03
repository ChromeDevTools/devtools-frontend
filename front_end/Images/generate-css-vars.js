// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const [, , targetGenDir, targetName, ...imageSources] = process.argv;

/**
 * @param {string} fileName
 */
function generateCSSVariableDefinition(fileName) {
  // The `style` referenced here is the `:root` style rule in the constructed stylesheet down below
  return `style.setProperty('--image-file-${fileName.replace(path.extname(fileName), '')}', 'url(' + new URL('./${
      fileName}', import.meta.url).toString() + ')');`;
}

const CURRENT_YEAR = new Date().getFullYear();
const fileContent = `
// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const sheet = new CSSStyleSheet();
sheet.replaceSync(':root {}');
const style = sheet.cssRules[0].style;

${imageSources.map(generateCSSVariableDefinition).join('\n')}

document.adoptedStyleSheets = [sheet];
`;

fs.writeFileSync(path.join(targetGenDir, 'Images.js'), fileContent, {encoding: 'utf-8'});

const tsconfigContent = `
{
    "compilerOptions": {
        "composite": true
    },
    "files": [
        "Images.js"
    ]
}
`;

fs.writeFileSync(path.join(targetGenDir, `${targetName}-tsconfig.json`), tsconfigContent, {encoding: 'utf-8'});
