// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Handlers from '../handlers/handlers.js';

// Ignore modules smaller than an absolute threshold.
const ABSOLUTE_SIZE_THRESHOLD_BYTES = 1024 * 0.5;
// Ignore modules smaller than a % size of largest copy of the module.
const RELATIVE_SIZE_THRESHOLD = 0.1;

interface SourceData {
  source: string;
  resourceSize: number;
}

export function normalizeSource(source: string): string {
  // Trim trailing question mark - b/c webpack.
  source = source.replace(/\?$/, '');

  // Normalize paths for dependencies by only keeping everything after the last `node_modules`.
  const lastNodeModulesIndex = source.lastIndexOf('node_modules');
  if (lastNodeModulesIndex !== -1) {
    source = source.substring(lastNodeModulesIndex);
  }

  return source;
}

function shouldIgnoreSource(source: string): boolean {
  // Ignore bundle overhead.
  if (source.includes('webpack/bootstrap')) {
    return true;
  }
  if (source.includes('(webpack)/buildin')) {
    return true;
  }

  // Ignore webpack module shims, i.e. aliases of the form `module.exports = window.jQuery`
  if (source.includes('external ')) {
    return true;
  }

  return false;
}

/**
 * The key is a source map `sources` entry (these are URLs/file paths), but normalized
 * via `normalizeSource`.
 *
 * The value is an object with an entry for every script that has a source map which
 * denotes that this source was used, along with the estimated resource size it takes
 * up in the script.
 */
export type ScriptDuplication = Map<string, {
  /**
   * This is the sum of all (but one) `attributedSize` in `scripts`.
   *
   * One copy of this module is treated as the canonical version - the rest will
   * have non-zero `wastedBytes`. The canonical copy is the first entry of
   * `scripts`.
   *
   * In the case of all copies being the same version, all sizes are
   * equal and the selection doesn't matter (ignoring compression ratios). When
   * the copies are different versions, it does matter. Ideally the newest
   * version would be the canonical copy, but version information is not present.
   * Instead, size is used as a heuristic for latest version. This makes the
   * value here conserative in its estimation.
   */
  estimatedDuplicateBytes: number,
  duplicates: Array<{
    script: Handlers.ModelHandlers.Scripts.Script,
    /**
     * The number of bytes in the script bundle that map back to this module,
     * in terms of estimated impact on transfer size.
     */
    attributedSize: number,
  }>,
}>;

/**
 * Sorts each array within @see ScriptDuplication by attributedSize, drops information
 * on sources that are too small, and calculates esimatedDuplicateBytes.
 */
export function normalizeDuplication(duplication: ScriptDuplication): void {
  for (const [key, data] of duplication) {
    // Sort by resource size.
    data.duplicates.sort((a, b) => b.attributedSize - a.attributedSize);

    // Ignore modules smaller than a % size of largest.
    if (data.duplicates.length > 1) {
      const largestResourceSize = data.duplicates[0].attributedSize;
      data.duplicates = data.duplicates.filter(duplicate => {
        const percentSize = duplicate.attributedSize / largestResourceSize;
        return percentSize >= RELATIVE_SIZE_THRESHOLD;
      });
    }

    // Ignore modules smaller than an absolute threshold.
    data.duplicates = data.duplicates.filter(duplicate => duplicate.attributedSize >= ABSOLUTE_SIZE_THRESHOLD_BYTES);

    // Delete any that now don't have multiple entries.
    if (data.duplicates.length <= 1) {
      duplication.delete(key);
      continue;
    }

    data.estimatedDuplicateBytes = data.duplicates.slice(1).reduce((acc, cur) => acc + cur.attributedSize, 0);
  }
}

function indexOfOrLength(haystack: string, needle: string, startPosition = 0): number {
  const index = haystack.indexOf(needle, startPosition);
  return index === -1 ? haystack.length : index;
}

export function getNodeModuleName(source: string): string {
  const sourceSplit = source.split('node_modules/');
  source = sourceSplit[sourceSplit.length - 1];

  const indexFirstSlash = indexOfOrLength(source, '/');
  if (source[0] === '@') {
    return source.slice(0, indexOfOrLength(source, '/', indexFirstSlash + 1));
  }

  return source.slice(0, indexFirstSlash);
}

function groupByNodeModules(duplication: ScriptDuplication): ScriptDuplication {
  const groupedDuplication: ScriptDuplication = new Map();
  for (const [source, data] of duplication) {
    if (!source.includes('node_modules')) {
      groupedDuplication.set(source, data);
      continue;
    }

    const nodeModuleKey = 'node_modules/' + getNodeModuleName(source);
    const aggregatedData = groupedDuplication.get(nodeModuleKey) ?? {
      duplicates: [],
      // This is calculated in normalizeDuplication.
      estimatedDuplicateBytes: 0,
    };
    groupedDuplication.set(nodeModuleKey, aggregatedData);

    for (const {script, attributedSize} of data.duplicates) {
      let duplicate = aggregatedData.duplicates.find(d => d.script === script);
      if (!duplicate) {
        duplicate = {script, attributedSize: 0};
        aggregatedData.duplicates.push(duplicate);
      }
      duplicate.attributedSize += attributedSize;
    }
  }

  return groupedDuplication;
}

/**
 * Sort by estimated savings.
 */
function sorted(duplication: ScriptDuplication): ScriptDuplication {
  return new Map([...duplication].sort((a, b) => b[1].estimatedDuplicateBytes - a[1].estimatedDuplicateBytes));
}

/**
 * Returns 2 @see ScriptDuplication for the given collection of script contents + source maps:
 *
 * 1. `duplication` keys correspond to authored files
 * 2. `duplication` keys correspond to authored files, except all files within the same
 *    node_module package are aggregated under the same entry.
 */
export function computeScriptDuplication(
    scriptsData: Handlers.ModelHandlers.Scripts.ScriptsData, compressionRatios: Map<string, number>):
    {duplication: ScriptDuplication, duplicationGroupedByNodeModules: ScriptDuplication} {
  const sourceDatasMap = new Map<Handlers.ModelHandlers.Scripts.Script, SourceData[]>();

  // Determine size of each `sources` entry.
  for (const script of scriptsData.scripts) {
    if (!script.content || !script.sourceMap) {
      continue;
    }

    const sizes = Handlers.ModelHandlers.Scripts.getScriptGeneratedSizes(script);
    if (!sizes) {
      continue;
    }

    if ('errorMessage' in sizes) {
      console.error(sizes.errorMessage);
      continue;
    }

    const sourceDataArray: SourceData[] = [];
    sourceDatasMap.set(script, sourceDataArray);

    const sources = script.sourceMap.sourceURLs();
    for (let i = 0; i < sources.length; i++) {
      if (shouldIgnoreSource(sources[i])) {
        continue;
      }

      const sourceSize = sizes.files[sources[i]];
      sourceDataArray.push({
        source: normalizeSource(sources[i]),
        resourceSize: sourceSize,
      });
    }
  }

  const duplication: ScriptDuplication = new Map();
  for (const [script, sourceDataArray] of sourceDatasMap) {
    for (const sourceData of sourceDataArray) {
      let data = duplication.get(sourceData.source);
      if (!data) {
        data = {estimatedDuplicateBytes: 0, duplicates: []};
        duplication.set(sourceData.source, data);
      }
      const compressionRatio = script.request ? compressionRatios.get(script.request?.args.data.requestId) ?? 1 : 1;
      const transferSize = Math.round(sourceData.resourceSize * compressionRatio);
      data.duplicates.push({
        script,
        attributedSize: transferSize,
      });
    }
  }

  const duplicationGroupedByNodeModules = groupByNodeModules(duplication);

  normalizeDuplication(duplication);
  normalizeDuplication(duplicationGroupedByNodeModules);

  return {
    duplication: sorted(duplication),
    duplicationGroupedByNodeModules: sorted(duplicationGroupedByNodeModules),
  };
}
