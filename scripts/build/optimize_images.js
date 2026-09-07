// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {parseArgs} from 'node:util';
import {optimize} from 'svgo';

import {writeIfChanged} from './ninja/write-if-changed.js';

/**
 * Optimizes SVG markup using SVGO with default preset and inlineStyles disabled.
 * @param {string} svgContent
 * @param {string} [filePath]
 * @returns {string}
 */
export function optimizeSvg(svgContent, filePath) {
  const result = optimize(svgContent, {
    path: filePath,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            inlineStyles: false,
          },
        },
      },
    ],
  });
  return result.data;
}

/**
 * Parses the response file contents into svgs and images lists.
 * @param {string} fileContent
 * @returns {{svgs: string[], images: string[]}}
 */
export function parseResponseFile(fileContent) {
  const tokens = fileContent.split(/\s+/).filter(Boolean);
  let currentSection = null;
  const svgs = [];
  const images = [];

  for (const token of tokens) {
    if (token === '--svgs') {
      currentSection = 'svgs';
    } else if (token === '--images') {
      currentSection = 'images';
    } else if (currentSection === 'svgs') {
      svgs.push(token);
    } else if (currentSection === 'images') {
      images.push(token);
    }
  }

  return {svgs, images};
}

/**
 * Generates the JavaScript source content for Images.js.
 * @param {string[]} imageFiles
 * @param {string[]} svgFiles
 * @returns {string}
 */
export function generateImagesJsContent(imageFiles, svgFiles) {
  function generateCSSVarDefinition(fileName) {
    const varName = fileName.replace(path.extname(fileName), '');
    return `style.setProperty('--image-file-${varName}', 'url(\"' + new URL('./${
        fileName}', import.meta.url).toString() + '\")');`;
  }

  const allFiles = [...imageFiles, ...svgFiles];

  return `const sheet = new CSSStyleSheet();
sheet.replaceSync(':root {}');
const style = sheet.cssRules[0].style;

${allFiles.map(generateCSSVarDefinition).join('\n')}

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
`;
}

async function main() {
  const {values} = parseArgs({
    options: {
      'target-gen-dir': {
        type: 'string',
      },
      'file-list': {
        type: 'string',
      },
    },
  });

  const targetGenDir = values['target-gen-dir'];
  const fileListPath = values['file-list'];

  if (!targetGenDir || !fileListPath) {
    throw new Error('Missing required arguments: --target-gen-dir and --file-list must be provided');
  }

  const fileListContent = await fs.readFile(fileListPath, 'utf8');
  const {svgs, images} = parseResponseFile(fileListContent);

  await Promise.all(svgs.map(async svgPath => {
    const basename = path.basename(svgPath);
    const content = await fs.readFile(svgPath, 'utf8');
    const optimized = optimizeSvg(content, svgPath);
    await writeIfChanged(path.join(targetGenDir, basename), optimized);
  }));

  const imageBasenames = images.map(img => path.basename(img));
  const svgBasenames = svgs.map(s => path.basename(s));

  const imagesJsContent = generateImagesJsContent(imageBasenames, svgBasenames);
  await writeIfChanged(path.join(targetGenDir, 'Images.js'), imagesJsContent);
}

if (import.meta.main) {
  await main();
}
