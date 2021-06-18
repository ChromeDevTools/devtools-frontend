// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const [, , targetName, srcDir, targetGenDir, files] = process.argv;

const filenames = files.split(',');
const configFiles = [];

for (const fileName of filenames) {
  const output = fs.readFileSync(path.join(srcDir, fileName), {encoding: 'utf8', flag: 'r'});

  fs.writeFileSync(
      path.join(targetGenDir, fileName + '.js'),
      `// Copyright ${new Date().getFullYear()} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const styles = new CSSStyleSheet();
styles.replaceSync(
\`${output}
/*# sourceURL=${fileName} */
\`);
export default styles;
`);

  configFiles.push(`\"${fileName}\"`);
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
