// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type * as ts from 'typescript';

import {
  applyTextChanges,
  fixMissingTypeAnnotationsForTarget,
  getSourceFilesFromTsconfig,
  resolveTsconfigPath,
} from './fix_missing_type_annotations.ts';

describe('fix_missing_type_annotations', () => {
  describe('applyTextChanges', () => {
    it('returns original content when text changes are empty', () => {
      const original = 'const x = 1;';
      const result = applyTextChanges(original, []);
      assert.strictEqual(result, original);
    });

    it('applies a single insertion change', () => {
      const original = 'export function test(a: number) { return a; }';
      const changes: ts.TextChange[] = [{
        span: {start: 31, length: 0},
        newText: ': number',
      }];
      const result = applyTextChanges(original, changes);
      assert.strictEqual(result, 'export function test(a: number): number { return a; }');
    });

    it('applies a single replacement change', () => {
      const original = 'let x: any = 1;';
      const changes: ts.TextChange[] = [{
        span: {start: 7, length: 3},
        newText: 'number',
      }];
      const result = applyTextChanges(original, changes);
      assert.strictEqual(result, 'let x: number = 1;');
    });

    it('applies multiple text changes in correct reverse order without shifting offsets', () => {
      const original = 'export const a = 1;\nexport const b = "hello";';
      const changes: ts.TextChange[] = [
        {
          span: {start: 14, length: 0},
          newText: ': number',
        },
        {
          span: {start: 34, length: 0},
          newText: ': string',
        },
      ];
      const result = applyTextChanges(original, changes);
      assert.strictEqual(result, 'export const a: number = 1;\nexport const b: string = "hello";');
    });

    it('handles deletion changes', () => {
      const original = 'export const a: number = 1;';
      const changes: ts.TextChange[] = [{
        span: {start: 14, length: 8},
        newText: '',
      }];
      const result = applyTextChanges(original, changes);
      assert.strictEqual(result, 'export const a = 1;');
    });
  });

  describe('resolveTsconfigPath', () => {
    let repoRoot: string;
    let buildDir: string;
    let genDir: string;

    beforeEach(() => {
      repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-resolve-test-'));
      buildDir = 'out/Default';
      genDir = path.join(repoRoot, buildDir, 'gen');
      fs.mkdirSync(genDir, {recursive: true});
    });

    afterEach(() => {
      fs.rmSync(repoRoot, {recursive: true, force: true});
    });

    it('resolves direct file path if it exists', () => {
      const directTsconfig = path.join(genDir, 'front_end/panels/animation/animation-tsconfig.json');
      fs.mkdirSync(path.dirname(directTsconfig), {recursive: true});
      fs.writeFileSync(directTsconfig, '{}', 'utf-8');

      const result = resolveTsconfigPath(directTsconfig, {repoRoot, buildDir});
      assert.strictEqual(result, directTsconfig);
    });

    it('resolves direct relative path within buildDir', () => {
      const tsconfigPath = path.join(genDir, 'front_end/panels/animation/animation-tsconfig.json');
      fs.mkdirSync(path.dirname(tsconfigPath), {recursive: true});
      fs.writeFileSync(tsconfigPath, '{}', 'utf-8');

      const result = resolveTsconfigPath('gen/front_end/panels/animation/animation-tsconfig.json', {
        repoRoot,
        buildDir,
      });
      assert.strictEqual(result, tsconfigPath);
    });

    it('resolves GN label with target (e.g. front_end/panels/animation:animation)', () => {
      const tsconfigPath = path.join(genDir, 'front_end/panels/animation/animation-tsconfig.json');
      fs.mkdirSync(path.dirname(tsconfigPath), {recursive: true});
      fs.writeFileSync(tsconfigPath, '{}', 'utf-8');

      const result = resolveTsconfigPath('front_end/panels/animation:animation', {repoRoot, buildDir});
      assert.strictEqual(result, tsconfigPath);
    });

    it('resolves GN label with leading slashes (e.g. //front_end/panels/animation:animation)', () => {
      const tsconfigPath = path.join(genDir, 'front_end/panels/animation/animation-tsconfig.json');
      fs.mkdirSync(path.dirname(tsconfigPath), {recursive: true});
      fs.writeFileSync(tsconfigPath, '{}', 'utf-8');

      const result = resolveTsconfigPath('//front_end/panels/animation:animation', {repoRoot, buildDir});
      assert.strictEqual(result, tsconfigPath);
    });

    it('resolves directory path defaulting target to directory name', () => {
      const tsconfigPath = path.join(genDir, 'front_end/panels/animation/animation-tsconfig.json');
      fs.mkdirSync(path.dirname(tsconfigPath), {recursive: true});
      fs.writeFileSync(tsconfigPath, '{}', 'utf-8');

      const result = resolveTsconfigPath('front_end/panels/animation', {repoRoot, buildDir});
      assert.strictEqual(result, tsconfigPath);
    });

    it('resolves bundle target if bundle-tsconfig.json is present', () => {
      const tsconfigPath = path.join(genDir, 'front_end/core/common/bundle-tsconfig.json');
      fs.mkdirSync(path.dirname(tsconfigPath), {recursive: true});
      fs.writeFileSync(tsconfigPath, '{}', 'utf-8');

      const result = resolveTsconfigPath('front_end/core/common:bundle', {repoRoot, buildDir});
      assert.strictEqual(result, tsconfigPath);
    });

    it('throws informative error when generated tsconfig does not exist', () => {
      assert.throws(
          () => resolveTsconfigPath('front_end/panels/nonexistent', {repoRoot, buildDir}),
          /Could not find generated tsconfig.*split compilation/s,
      );
    });
  });

  describe('getSourceFilesFromTsconfig', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-source-files-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('extracts source .ts files and ignores .d.ts files', () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'types.d.ts');
      fs.writeFileSync(file1, 'export const a = 1;', 'utf-8');
      fs.writeFileSync(file2, 'export declare const b: number;', 'utf-8');

      const tsconfigPath = path.join(tempDir, 'sample-tsconfig.json');
      fs.writeFileSync(
          tsconfigPath,
          JSON.stringify({
            compilerOptions: {
              target: 'ES2023',
              module: 'ESNext',
              moduleResolution: 'bundler',
            },
            files: ['file1.ts', 'types.d.ts'],
          }),
          'utf-8',
      );

      const {sourceFiles} = getSourceFilesFromTsconfig(tsconfigPath);
      assert.deepEqual(sourceFiles, [file1]);
    });
  });

  describe('fixMissingTypeAnnotationsForTarget', () => {
    let repoRoot: string;
    let buildDir: string;
    let genDir: string;
    let targetDir: string;

    beforeEach(() => {
      repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-target-fix-test-'));
      buildDir = 'out/Default';
      genDir = path.join(repoRoot, buildDir, 'gen');
      targetDir = path.join(repoRoot, 'front_end/panels/sample');
      fs.mkdirSync(genDir, {recursive: true});
      fs.mkdirSync(targetDir, {recursive: true});
    });

    afterEach(() => {
      fs.rmSync(repoRoot, {recursive: true, force: true});
    });

    it('fixes missing return type annotations on exports in dry-run and write mode', () => {
      const sourceFile = path.join(targetDir, 'SampleModel.ts');
      const initialCode = 'export function calculateTotal(price: number, tax: number) {\n  return price + tax;\n}\n';
      fs.writeFileSync(sourceFile, initialCode, 'utf-8');

      const targetGenDir = path.join(genDir, 'front_end/panels/sample');
      fs.mkdirSync(targetGenDir, {recursive: true});
      const tsconfigPath = path.join(targetGenDir, 'sample-tsconfig.json');

      fs.writeFileSync(
          tsconfigPath,
          JSON.stringify({
            compilerOptions: {
              target: 'ES2023',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              noEmit: true,
            },
            files: [path.relative(targetGenDir, sourceFile)],
          }),
          'utf-8',
      );

      // 1. Dry-run mode: should detect changes without modifying file
      const dryRunSummary = fixMissingTypeAnnotationsForTarget({
        target: 'front_end/panels/sample',
        buildDir,
        repoRoot,
        dryRun: true,
      });

      assert.strictEqual(dryRunSummary.filesChecked, 1);
      assert.strictEqual(dryRunSummary.filesModified, 1);
      assert.isAbove(dryRunSummary.totalAnnotationsAdded, 0);
      assert.strictEqual(fs.readFileSync(sourceFile, 'utf-8'), initialCode);

      // 2. Write mode: should write fixes to disk
      const writeSummary = fixMissingTypeAnnotationsForTarget({
        target: 'front_end/panels/sample',
        buildDir,
        repoRoot,
        dryRun: false,
      });

      assert.strictEqual(writeSummary.filesChecked, 1);
      assert.strictEqual(writeSummary.filesModified, 1);
      assert.isAbove(writeSummary.totalAnnotationsAdded, 0);

      const updatedCode = fs.readFileSync(sourceFile, 'utf-8');
      assert.include(updatedCode, 'export function calculateTotal(price: number, tax: number): number');

      // 3. Re-run mode: should find 0 missing annotations
      const rerunSummary = fixMissingTypeAnnotationsForTarget({
        target: 'front_end/panels/sample',
        buildDir,
        repoRoot,
        dryRun: false,
      });

      assert.strictEqual(rerunSummary.filesModified, 0);
      assert.strictEqual(rerunSummary.totalAnnotationsAdded, 0);
    });

    it('fixes functions and classes across multiple files in a target', () => {
      const fileA = path.join(targetDir, 'fileA.ts');
      const fileB = path.join(targetDir, 'fileB.ts');

      fs.writeFileSync(
          fileA,
          'export function multiply(a: number, b: number) {\n  return a * b;\n}\n',
          'utf-8',
      );
      fs.writeFileSync(
          fileB,
          'export class Transformer {\n  transform(input: string) {\n    return input.toUpperCase();\n  }\n}\n',
          'utf-8',
      );

      const targetGenDir = path.join(genDir, 'front_end/panels/sample');
      fs.mkdirSync(targetGenDir, {recursive: true});
      const tsconfigPath = path.join(targetGenDir, 'sample-tsconfig.json');

      fs.writeFileSync(
          tsconfigPath,
          JSON.stringify({
            compilerOptions: {
              target: 'ES2023',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              noEmit: true,
            },
            files: [
              path.relative(targetGenDir, fileA),
              path.relative(targetGenDir, fileB),
            ],
          }),
          'utf-8',
      );

      const summary = fixMissingTypeAnnotationsForTarget({
        target: 'front_end/panels/sample:sample',
        buildDir,
        repoRoot,
        dryRun: false,
      });

      assert.strictEqual(summary.filesChecked, 2);
      assert.strictEqual(summary.filesModified, 2);
      assert.strictEqual(summary.totalAnnotationsAdded, 2);

      const updatedA = fs.readFileSync(fileA, 'utf-8');
      assert.include(updatedA, 'export function multiply(a: number, b: number): number');

      const updatedB = fs.readFileSync(fileB, 'utf-8');
      assert.include(updatedB, 'transform(input: string): string');
    });
  });
});
