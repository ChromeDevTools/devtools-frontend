// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {spawn} from 'node:child_process';
import {readFile, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

import {
  devtoolsRootPath,
  litAnalyzerExecutablePath,
  nodePath,
  tsconfigJsonPath,
} from '../devtools_paths.js';

class LitAnalyzerCache {
  #cachePath = join(devtoolsRootPath(), '.litanalyzercache');
  #cache = {config: '', files: {}};
  #enabled = false;

  constructor(enabled, config, cacheData = null) {
    this.#enabled = enabled;
    if (cacheData) {
      this.#cache = cacheData;
    } else {
      this.#cache = {config, files: {}};
    }
  }

  static async create(enabled, config) {
    if (!enabled) {
      return new LitAnalyzerCache(enabled, config);
    }
    const cachePath = join(devtoolsRootPath(), '.litanalyzercache');
    try {
      const data = JSON.parse(await readFile(cachePath, 'utf-8'));
      if (
        data &&
        data.config === config &&
        data.files &&
        typeof data.files === 'object' &&
        !Array.isArray(data.files)
      ) {
        return new LitAnalyzerCache(enabled, config, data);
      }
    } catch {
      // Fall through to empty cache
    }
    return new LitAnalyzerCache(enabled, config);
  }

  async filterFiles(files) {
    if (!this.#enabled) {
      return files;
    }
    const results = await Promise.all(
      files.map(async file => {
        try {
          const fileStat = await stat(file);
          if (this.#cache.files[file] !== fileStat.mtimeMs) {
            return file;
          }
          return null;
        } catch {
          return file;
        }
      }),
    );
    return results.filter(file => file !== null);
  }

  async update(files) {
    if (!this.#enabled) {
      return;
    }
    const filesToUpdate = new Set(files);
    await Promise.all(
      files.map(async file => {
        try {
          const fileStat = await stat(file);
          this.#cache.files[file] = fileStat.mtimeMs;
        } catch {
          delete this.#cache.files[file];
        }
      }),
    );
    // Prune entries for files that no longer exist on disk.
    await Promise.all(
      Object.keys(this.#cache.files).map(async file => {
        if (filesToUpdate.has(file)) {
          return;
        }
        try {
          await stat(file);
        } catch {
          delete this.#cache.files[file];
        }
      }),
    );
    try {
      await writeFile(
        this.#cachePath,
        JSON.stringify(this.#cache, null, 2),
        'utf-8',
      );
    } catch {
      // Ignore cache write errors
    }
  }
}

/**
 * Runs the `lit-analyzer` on the `files`.
 *
 * The configuration for the `lit-analyzer` is parsed from the options for
 * the "ts-lit-plugin" from the toplevel `tsconfig.json` file.
 *
 * @param files the input files to analyze.
 */
export async function runLitAnalyzer(files, {lintOnly, debug}) {
  if (files.length === 0) {
    return {status: true, output: ''};
  }
  const cacheLinters = !debug && !lintOnly;

  const messages = [];
  if (debug) {
    messages.push('[lint]: Running LitAnalyzer...');
  }

  const readLitAnalyzerConfigFromCompilerOptions = async () => {
    const configData = await readFile(tsconfigJsonPath(), 'utf-8');
    const {compilerOptions} = JSON.parse(configData);
    const {plugins} = compilerOptions;
    const tsLitPluginOptions = plugins.find(
      plugin => plugin.name === 'ts-lit-plugin',
    );
    if (tsLitPluginOptions === null) {
      throw new Error(
        `Failed to find ts-lit-plugin options in ${tsconfigJsonPath()}`,
      );
    }
    return {rules: tsLitPluginOptions.rules, configData};
  };

  const {rules, configData} = await readLitAnalyzerConfigFromCompilerOptions();
  const litAnalyzerCache = await LitAnalyzerCache.create(
    cacheLinters,
    configData,
  );
  const filesToAnalyze = await litAnalyzerCache.filterFiles(files);
  if (filesToAnalyze.length === 0) {
    return {status: true, output: ''};
  }

  const getLitAnalyzerResult = async subsetFiles => {
    const args = [
      litAnalyzerExecutablePath(),
      ...Object.entries(rules).flatMap(([k, v]) => [`--rules.${k}`, v]),
      ...subsetFiles,
    ];

    const result = {
      output: '',
      error: '',
      status: false,
    };

    return await new Promise(resolve => {
      const litAnalyzerProcess = spawn(nodePath(), args, {
        cwd: devtoolsRootPath(),
      });

      litAnalyzerProcess.stdout.on('data', data => {
        result.output += `\n${data.toString()}`;
      });
      litAnalyzerProcess.stderr.on('data', data => {
        result.error += `\n${data.toString()}`;
      });

      litAnalyzerProcess.on('error', message => {
        result.error += `\n${message}`;
        resolve(result);
      });

      litAnalyzerProcess.on('exit', code => {
        result.status = code === 0;
        resolve(result);
      });
    });
  };

  const getSplitFiles = filesToSplit => {
    if (process.platform !== 'win32') {
      return [filesToSplit];
    }

    /**
     * @type {string[][]}
     */
    const splitFiles = [[]];
    let index = 0;
    for (const file of filesToSplit) {
      // Windows max input is 8191 so we should be conservative
      if (splitFiles[index].join(' ').length + file.length < 6144) {
        splitFiles[index].push(file);
      } else {
        index++;
        splitFiles[index] = [file];
      }
    }
    return splitFiles;
  };

  const results = await Promise.all(
    getSplitFiles(filesToAnalyze).map(filesBatch => {
      return getLitAnalyzerResult(filesBatch);
    }),
  );
  for (const result of results) {
    // Don't print if no problems are found
    // Mimics the other tools
    if (result.output && !result.output.includes('Found 0 problems')) {
      messages.push(result.output);
    }
    if (result.error) {
      messages.push(result.error);
    }
  }

  const success = results.every(r => r.status);
  if (success) {
    await litAnalyzerCache.update(filesToAnalyze);
  }

  return {status: success, output: messages.join('\n')};
}
