// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

export class GnLabel {
  dirPath: string;  // e.g. "front_end/path/to"
  name: string;     // e.g. "bundle"

  constructor(dirPath: string, name: string) {
    this.dirPath = dirPath;
    this.name = name;
  }

  static resolveDeclaredDep(
      dep: string,
      currentDir: string,
      rootDir: string,
      ): string {
    let targetPart = '';
    let pathPart = dep;

    if (dep.startsWith(':')) {
      pathPart = '.';
      targetPart = dep;
    } else {
      const colonIndex = dep.indexOf(':');
      if (colonIndex !== -1) {
        pathPart = dep.substring(0, colonIndex);
        targetPart = dep.substring(colonIndex);
      }
    }

    const isAbsolute = pathPart.startsWith('//');
    const baseDir = isAbsolute ? rootDir : currentDir;
    const cleanPath = isAbsolute ? pathPart.slice('//'.length) : pathPart;

    const absDir = path.resolve(baseDir, cleanPath);
    const relFromRoot = path.relative(rootDir, absDir);
    const posixRelFromRoot = relFromRoot.split(path.sep).join(path.posix.sep);

    const target = targetPart || `:${path.basename(absDir)}`;
    return `//${posixRelFromRoot}${target}`;
  }

  /**
   * Parses a full GN label like //front_end/path/to:target
   * or //front_end/path/to
   */
  static parse(label: string): GnLabel|null {
    if (!label.startsWith('//')) {
      return null;
    }
    const colonIndex = label.indexOf(':');
    if (colonIndex === -1) {
      // e.g. //front_end/path/to
      // The target name defaults to the last part of the path
      const dirPath = label.substring(2);
      const name = path.basename(dirPath);
      return new GnLabel(dirPath, name);
    }
    const dirPath = label.substring(2, colonIndex);
    const name = label.substring(colonIndex + 1);
    return new GnLabel(dirPath, name);
  }

  toString(): string {
    return `//${this.dirPath}:${this.name}`;
  }

  get bundleLabel(): string {
    return `//${this.dirPath}:bundle`;
  }

  get dirName(): string {
    return path.basename(this.dirPath);
  }

  /**
   * This heuristic works as our main target templates
   * always create a label that matches the directory name.
   *
   * We only check this if we need to update a target that
   * is part of the same BUILD.gn file as the imported file.
   *
   * @example
   * front_end/panels/ai_assistance/BUILD.gn
   * devtools_ui_module("ai_assistance")
   */
  get isConsumerTarget(): boolean {
    return this.name !== this.dirName;
  }

  toRelativeDep(currentDir: string, rootDir: string): string {
    const absTargetDir = path.join(rootDir, this.dirPath);
    const relTopDir = path.relative(currentDir, absTargetDir);
    const relPath = relTopDir.split(path.sep).join(path.posix.sep);

    if (relPath === '') {
      return `:${this.name}`;
    }

    if (this.dirName === this.name) {
      return relPath;
    }

    return `${relPath}:${this.name}`;
  }
}
