// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {globMatch} from './GlobMatch.js';

/**
 * A path substitution specifies a string prefix pattern to be
 * replaced with a new string. This is the pendant of the
 * `set substitute-path old new` feature that is found in GDB
 * and `settings set target.source-map old new` feature that
 * is found in LLDB.
 */
export type PathSubstitution = {
  readonly from: string; readonly to: string;
};

/**
 * List of {@type PathSubstitution}s.
 */
export type PathSubstitutions = ReadonlyArray<PathSubstitution>;

/**
 * Resolve a source path (as stored in DWARF debugging information) to an absolute URL.
 *
 * Note that we treat "." specially as a pattern, since LLDB normalizes paths before
 * returning them from the DWARF parser. Our logic replicates the logic found in the
 * LLDB frontend in `PathMappingList::RemapPath()` inside `Target/PathMappingList.cpp`
 * (http://cs/github/llvm/llvm-project/lldb/source/Target/PathMappingList.cpp?l=157-185).
 *
 * @param pathSubstitutions possible substitutions to apply to the {@param sourcePath}, applies the first match.
 * @param sourcePath the source path as found in the debugging information.
 * @param baseURL the URL of the WebAssembly module, which is used to resolve relative source paths.
 * @return an absolute `file:`-URI or a URL relative to the {@param baseURL}.
 */
export function resolveSourcePathToURL(pathSubstitutions: PathSubstitutions, sourcePath: string, baseURL: URL): URL {
  // Normalize '\' to '/' in sourcePath first.
  let resolvedSourcePath = sourcePath.replace(/\\/g, '/');

  // Apply source path substitutions first.
  for (const {from, to} of pathSubstitutions) {
    if (resolvedSourcePath.startsWith(from)) {
      resolvedSourcePath = to + resolvedSourcePath.slice(from.length);
      break;
    }

    // Relative paths won't have a leading "./" in them unless "." is the only
    // thing in the relative path so we need to work around "." carefully.
    if (from === '.') {
      // We need to figure whether sourcePath can be considered a relative path,
      // ruling out absolute POSIX and Windows paths, as well as file:, http: and
      // https: URLs.
      if (!resolvedSourcePath.startsWith('/') && !/^([A-Z]|file|https?):/i.test(resolvedSourcePath)) {
        resolvedSourcePath = `${to}/${resolvedSourcePath}`;
        break;
      }
    }
  }

  if (resolvedSourcePath.startsWith('/')) {
    if (resolvedSourcePath.startsWith('//')) {
      return new URL(`file:${resolvedSourcePath}`);
    }
    return new URL(`file://${resolvedSourcePath}`);
  }
  if (/^[A-Z]:/i.test(resolvedSourcePath)) {
    return new URL(`file:/${resolvedSourcePath}`);
  }
  return new URL(resolvedSourcePath, baseURL.href);
}

/**
 * Configuration for locating source files for a given WebAssembly module.
 * If the name is `undefined`, the configuration is the default configuration,
 * which is chosen if there's no named configuration matching the basename of
 * the WebAssembly module file.
 * The name can be a wildcard pattern, and {@see globMatch} will be used to
 * match the name against the URL of the WebAssembly module file.
 */
export type ModuleConfiguration = {
  readonly name?: string; readonly pathSubstitutions: PathSubstitutions;
};

/**
 * List of {@type ModuleConfiguration}s. These lists are intended to have
 * a default configuration, whose name field is `undefined`, which is chosen
 * when no matching named configuration is found.
 */
export type ModuleConfigurations = ReadonlyArray<ModuleConfiguration>;

/**
 * Locate the configuration for a given `something.wasm` module file name.
 *
 * @param moduleConfigurations list of module configurations to scan.
 * @param moduleName the URL of the module to lookup.
 * @return the matching module configuration or the default fallback.
 */
export function findModuleConfiguration(
    moduleConfigurations: ModuleConfigurations, moduleURL: URL): ModuleConfiguration {
  let defaultModuleConfiguration: ModuleConfiguration = {pathSubstitutions: []};
  for (const moduleConfiguration of moduleConfigurations) {
    // The idea here is that module configurations will have at most
    // one default configuration, so picking the last here is fine.
    if (moduleConfiguration.name === undefined) {
      defaultModuleConfiguration = moduleConfiguration;
      continue;
    }

    // Perform wildcard pattern matching on the full URL.
    if (globMatch(moduleConfiguration.name, moduleURL.href)) {
      return moduleConfiguration;
    }
  }
  return defaultModuleConfiguration;
}

export const DEFAULT_MODULE_CONFIGURATIONS: ModuleConfigurations = [{pathSubstitutions: []}];
