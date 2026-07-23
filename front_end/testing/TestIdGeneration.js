// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const replacements = {
    '\n': '_lf_',
    '\r': '_cr_',
    '\t': '_tab_',
    '\x00': '_null_',
    '\x07': '_bell_',
    '"': '_dblquote_',
};
const nonPrintRegex = /\p{C}|"/gu;
function replaceNonPrintable(str) {
    return str.replace(nonPrintRegex, match => {
        return replacements[match] !== undefined ? replacements[match] : '';
    });
}
export function escapeTestIdBlock(block) {
    return replaceNonPrintable(block.toLowerCase().replace(/\s+/g, '_').replace(/:/g, '_'));
}
/**
 * Build test ID is like the test ID used on the CLI but the path part of it is
 * an absolute path to the build dir.
 */
export function computeBuildTestId(file, titlePath) {
    const blocks = titlePath.map(escapeTestIdBlock);
    const caseName = blocks.join(':');
    const exactTestId = `${file}:${caseName}`;
    return exactTestId;
}
export function generateExactTestId(genDir, file, titlePath) {
    const blocks = titlePath.map(escapeTestIdBlock);
    const caseName = blocks.join(':');
    const normalizedGenDir = genDir.replace(/\\/g, '/');
    const normalizedFile = file.replace(/\\/g, '/');
    let relativeSourceFileName = normalizedFile;
    if (normalizedFile.startsWith(normalizedGenDir)) {
        relativeSourceFileName = normalizedFile.substring(normalizedGenDir.length);
        if (relativeSourceFileName.startsWith('/')) {
            relativeSourceFileName = relativeSourceFileName.substring(1);
        }
    }
    relativeSourceFileName = relativeSourceFileName.replace(/\.js$/, '.ts');
    const parsedPath = relativeSourceFileName.split('/');
    const fineName = parsedPath.pop() || '';
    const coarseName = parsedPath.length > 0 ? `${parsedPath.join('/')}/` : '';
    const exactTestId = `${relativeSourceFileName}:${caseName}`;
    if (exactTestId.length >= 512) {
        throw new Error('Test ID is too long');
    }
    return { exactTestId, coarseName, fineName, caseName };
}
//# sourceMappingURL=TestIdGeneration.js.map