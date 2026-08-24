// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export class TypeScriptImportExtractor {
  #tsImportsCache = new Map<string, Promise<string[]>>();
  static #instance: TypeScriptImportExtractor;

  private constructor() {
  }

  static create(): TypeScriptImportExtractor {
    if (!TypeScriptImportExtractor.#instance) {
      TypeScriptImportExtractor.#instance = new TypeScriptImportExtractor();
    }
    return TypeScriptImportExtractor.#instance;
  }

  #dirListingsCache = new Map<string, Promise<Set<string>>>();

  async #getDirListing(dirPath: string): Promise<Set<string>> {
    const cached = this.#dirListingsCache.get(dirPath);
    if (cached) {
      return await cached;
    }
    const promise = fs.promises.readdir(dirPath).then(files => new Set(files)).catch(() => new Set<string>());
    this.#dirListingsCache.set(dirPath, promise);
    return await promise;
  }

  async #resolveImport(
      importPath: string,
      sourceFile: string,
      ): Promise<string|null> {
    // Ignore non-relative imports (node modules, etc)
    if (!importPath.startsWith('.')) {
      return null;
    }

    const sourceDir = path.dirname(sourceFile);
    const resolvedPath = path.resolve(sourceDir, importPath);
    const targetDir = path.dirname(resolvedPath);
    const dirListing = await this.#getDirListing(targetDir);
    const baseName = path.basename(resolvedPath);

    const exists = (...fileNames: string[]) => {
      for (const fileName of fileNames) {
        if (dirListing.has(fileName)) {
          return path.join(targetDir, fileName);
        }
      }
      return null;
    };

    // for import './foo.css.js' -> checks for foo.css or foo.css.js
    if (importPath.endsWith('.css.js')) {
      const potentialCssName = baseName.replace(/\.js$/, '');
      return exists(potentialCssName, baseName);
    }

    // for import './foo.js' -> checks for foo.ts or foo.d.ts
    if (importPath.endsWith('.js')) {
      const potentialTsName = baseName.replace(/\.js$/, '.ts');
      const potentialDtsName = baseName.replace(/\.js$/, '.d.ts');
      return exists(potentialTsName, potentialDtsName, baseName);
    }

    return exists(baseName);
  }

  #extractImports(absPath: string, fileContent: string): string[] {
    const sourceFile = ts.createSourceFile(
        absPath,
        fileContent,
        ts.ScriptTarget.ESNext,
        true,
    );

    const imports = new Set<string>();

    const visit = (node: ts.Node) => {
      // Handle imports: import x from 'y'; import 'y';
      // Handle exports: export * from 'y'; export {x} from 'y';
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          imports.add(node.moduleSpecifier.text);
        }
        // Handle dynamic imports: import('x')
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
          imports.add(node.arguments[0].text);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return Array.from(imports);
  }

  async #extractTsImportFromTSFile(absPath: string) {
    if (absPath.endsWith('.css') || absPath.endsWith('.html') || absPath.endsWith('.svg') ||
        absPath.endsWith('.json')) {
      return [];
    }

    let fileContent: string;
    try {
      fileContent = await fs.promises.readFile(absPath, 'utf-8');
    } catch {
      console.warn(`File not found: ${absPath}`);
      return [];
    }

    const imports = this.#extractImports(absPath, fileContent);

    const resolvedImports = await Promise.all(
        imports.map(text => this.#resolveImport(text, absPath)),
    );

    return resolvedImports.filter((x): x is string => x !== null);
  }

  async extractTsImports(files: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    const tasks = files.map(async filePath => {
      const absPath = path.resolve(filePath);

      const cachedPromise = this.#tsImportsCache.get(absPath);
      if (cachedPromise !== undefined) {
        const cachedImports = await cachedPromise;
        result.set(filePath, cachedImports);
        return;
      }

      const extractPromise = this.#extractTsImportFromTSFile(absPath);
      this.#tsImportsCache.set(absPath, extractPromise);
      const extractedList = await extractPromise;
      result.set(filePath, extractedList);
    });

    await Promise.all(tasks);
    return result;
  }
}
