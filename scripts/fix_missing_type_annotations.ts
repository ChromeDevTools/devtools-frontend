// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import {fileURLToPath} from 'node:url';
import * as ts from 'typescript';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

export const FIX_ID = 'fixMissingTypeAnnotationOnExports';

/**
 * Applies a list of TextChange entries to a file content string.
 * Changes are applied in reverse order of start position so that earlier offsets are preserved.
 */
export function applyTextChanges(content: string, changes: readonly ts.TextChange[]): string {
  const sorted = [...changes].sort((a, b) => {
    if (b.span.start !== a.span.start) {
      return b.span.start - a.span.start;
    }
    return b.span.length - a.span.length;
  });

  let result = content;
  for (const change of sorted) {
    const start = change.span.start;
    const end = start + change.span.length;
    result = result.slice(0, start) + change.newText + result.slice(end);
  }
  return result;
}

export interface ResolveTsconfigOptions {
  buildDir?: string;
  repoRoot?: string;
}

/**
 * Resolves a GN label or direct tsconfig path to the generated tsconfig.json file in the build directory.
 *
 * Supported formats:
 * - GN label: "//front_end/panels/animation:animation", "front_end/panels/animation:animation", "front_end/panels/animation", ":animation"
 * - Direct tsconfig path: "out/Default/gen/front_end/panels/animation/animation-tsconfig.json"
 */
export function resolveTsconfigPath(targetOrPath: string, options?: ResolveTsconfigOptions): string {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const buildDir = options?.buildDir ?? 'out/Default';
  const resolvedBuildDir = path.resolve(repoRoot, buildDir);
  const genDir = path.join(resolvedBuildDir, 'gen');

  // 1. Direct tsconfig file path check
  if (targetOrPath.endsWith('.json')) {
    const directPath = path.resolve(repoRoot, targetOrPath);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return directPath;
    }

    const insideBuildPath = path.resolve(resolvedBuildDir, targetOrPath);
    if (fs.existsSync(insideBuildPath) && fs.statSync(insideBuildPath).isFile()) {
      return insideBuildPath;
    }

    const insideGenPath = path.resolve(genDir, targetOrPath);
    if (fs.existsSync(insideGenPath) && fs.statSync(insideGenPath).isFile()) {
      return insideGenPath;
    }
  }

  // 2. Parse GN label
  let normalized = targetOrPath.trim();
  if (normalized.startsWith('//')) {
    normalized = normalized.slice(2);
  }

  let dirPart = '';
  let targetPart = '';

  if (normalized.includes(':')) {
    const colonIdx = normalized.indexOf(':');
    dirPart = normalized.slice(0, colonIdx);
    targetPart = normalized.slice(colonIdx + 1);

    if (!dirPart) {
      // Relative label like ":animation", relative to repoRoot / cwd
      dirPart = path.relative(repoRoot, process.cwd());
    }
  } else {
    dirPart = normalized;
    targetPart = path.basename(normalized);
  }

  // Clean dirPart
  dirPart = dirPart.replace(/^\.\//, '').replace(/\/+$/, '');

  const candidateGenDir = path.join(genDir, dirPart);
  const candidatePath = path.join(candidateGenDir, `${targetPart}-tsconfig.json`);

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return candidatePath;
  }

  // Fallback check for bundle target tsconfig (e.g. bundle-tsconfig.json) if target matches directory name
  const bundleCandidate = path.join(candidateGenDir, 'bundle-tsconfig.json');
  if (fs.existsSync(bundleCandidate) && fs.statSync(bundleCandidate).isFile()) {
    return bundleCandidate;
  }

  throw new Error(
      `Could not find generated tsconfig for GN label "${targetOrPath}".\n` +
          `Expected location: ${path.relative(repoRoot, candidatePath)}\n\n` +
          `Ensure that GN build files have been generated with split compilation enabled (e.g. by running "gn gen ${
              buildDir}").`,
  );
}

/**
 * Extracts TypeScript source files (.ts, excluding .d.ts) from a generated tsconfig.json.
 */
export function getSourceFilesFromTsconfig(tsconfigPath: string): {
  parsedCommandLine: ts.ParsedCommandLine,
  sourceFiles: string[],
} {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig at ${tsconfigPath}: ${configFile.error.messageText}`);
  }

  const parsedCommandLine = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsconfigPath),
      {
        isolatedDeclarations: true,
        declaration: true,
        noEmit: true,
        skipLibCheck: true,
      },
      tsconfigPath,
  );

  const sourceFiles = parsedCommandLine.fileNames.map(f => path.resolve(f))
                          .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && fs.existsSync(f));

  return {parsedCommandLine, sourceFiles};
}

export interface InFileChange {
  fileName: string;
  originalText: string;
  newText: string;
  textChanges: readonly ts.TextChange[];
}

export interface TargetFixOptions {
  target: string;
  buildDir?: string;
  repoRoot?: string;
  dryRun?: boolean;
  verbose?: boolean;
  maxPasses?: number;
}

export interface TargetFixSummary {
  target: string;
  tsconfigPath: string;
  filesChecked: number;
  filesModified: number;
  totalAnnotationsAdded: number;
  passesCompleted: number;
  modifiedFiles: string[];
  changesByFile: Map<string, InFileChange[]>;
}

export class LanguageServiceHost implements ts.LanguageServiceHost {
  private files = new Map<string, {version: number, text: string}>();
  private compilationSettings: ts.CompilerOptions;
  private currentDirectory: string;
  private projectReferences?: readonly ts.ProjectReference[];

  constructor(
      fileNames: string[],
      compilationSettings: ts.CompilerOptions,
      currentDirectory: string,
      projectReferences?: readonly ts.ProjectReference[],
  ) {
    this.compilationSettings = compilationSettings;
    this.currentDirectory = currentDirectory;
    this.projectReferences = projectReferences;

    for (const fileName of fileNames) {
      const normalized = path.resolve(fileName);
      if (ts.sys.fileExists(normalized)) {
        this.files.set(normalized, {
          version: 1,
          text: ts.sys.readFile(normalized) ?? '',
        });
      }
    }
  }

  getCompilationSettings(): ts.CompilerOptions {
    return this.compilationSettings;
  }

  getProjectReferences(): readonly ts.ProjectReference[]|undefined {
    return this.projectReferences;
  }

  getScriptFileNames(): string[] {
    return Array.from(this.files.keys());
  }

  getScriptVersion(fileName: string): string {
    const file = this.files.get(path.resolve(fileName));
    return file ? String(file.version) : '0';
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot|undefined {
    const normalized = path.resolve(fileName);
    const file = this.files.get(normalized);
    if (file) {
      return ts.ScriptSnapshot.fromString(file.text);
    }
    if (ts.sys.fileExists(normalized)) {
      const text = ts.sys.readFile(normalized) ?? '';
      this.files.set(normalized, {version: 1, text});
      return ts.ScriptSnapshot.fromString(text);
    }
    return undefined;
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return ts.getDefaultLibFilePath(options);
  }

  fileExists(fileName: string): boolean {
    return this.files.has(path.resolve(fileName)) || ts.sys.fileExists(fileName);
  }

  readFile(fileName: string): string|undefined {
    const file = this.files.get(path.resolve(fileName));
    if (file) {
      return file.text;
    }
    return ts.sys.readFile(fileName);
  }

  readDirectory(
      rootDir: string,
      extensions?: readonly string[],
      excludes?: readonly string[],
      includes?: readonly string[],
      depth?: number,
      ): string[] {
    return ts.sys.readDirectory(rootDir, extensions, excludes, includes, depth);
  }

  directoryExists(dirName: string): boolean {
    return ts.sys.directoryExists(dirName);
  }

  getDirectories(dirName: string): string[] {
    return ts.sys.getDirectories(dirName);
  }

  updateFile(fileName: string, newText: string): void {
    const normalized = path.resolve(fileName);
    const current = this.files.get(normalized);
    const version = (current ? current.version : 0) + 1;
    this.files.set(normalized, {version, text: newText});
  }

  getFileText(fileName: string): string|undefined {
    const normalized = path.resolve(fileName);
    return this.files.get(normalized)?.text ??
        (ts.sys.fileExists(normalized) ? ts.sys.readFile(normalized) : undefined);
  }
}

/**
 * Fixes missing type annotations on exports for a specific GN target or tsconfig.
 */
export function fixMissingTypeAnnotationsForTarget(options: TargetFixOptions): TargetFixSummary {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const maxPasses = options.maxPasses ?? 5;
  const dryRun = options.dryRun ?? false;
  const verbose = options.verbose ?? false;

  const tsconfigPath = resolveTsconfigPath(options.target, {
    buildDir: options.buildDir,
    repoRoot,
  });

  if (verbose) {
    console.log(`Resolved tsconfig: ${path.relative(repoRoot, tsconfigPath)}`);
  }

  const {parsedCommandLine, sourceFiles} = getSourceFilesFromTsconfig(tsconfigPath);

  if (verbose) {
    console.log(`Found ${sourceFiles.length} TypeScript source files in target.`);
    for (const file of sourceFiles) {
      console.log(`  - ${path.relative(repoRoot, file)}`);
    }
  }

  if (sourceFiles.length === 0) {
    return {
      target: options.target,
      tsconfigPath,
      filesChecked: 0,
      filesModified: 0,
      totalAnnotationsAdded: 0,
      passesCompleted: 0,
      modifiedFiles: [],
      changesByFile: new Map(),
    };
  }

  const host = new LanguageServiceHost(
      parsedCommandLine.fileNames,
      parsedCommandLine.options,
      path.dirname(tsconfigPath),
      parsedCommandLine.projectReferences,
  );

  const documentRegistry = ts.createDocumentRegistry();
  const languageService = ts.createLanguageService(host, documentRegistry);
  const formatSettings = ts.getDefaultFormatCodeSettings();
  const preferences: ts.UserPreferences = {};

  const modifiedFileSet = new Set<string>();
  const changesByFile = new Map<string, InFileChange[]>();
  let totalAnnotations = 0;
  let passes = 0;

  for (let pass = 1; pass <= maxPasses; pass++) {
    passes = pass;
    let changesInPass = 0;

    if (verbose) {
      console.log(`Starting pass ${pass}...`);
    }

    for (const fileName of sourceFiles) {
      const combinedFix = languageService.getCombinedCodeFix(
          {type: 'file', fileName},
          FIX_ID,
          formatSettings,
          preferences,
      );

      if (combinedFix.changes.length === 0) {
        continue;
      }

      for (const fileChange of combinedFix.changes) {
        const targetFileName = path.resolve(fileChange.fileName);
        const originalContent = host.getFileText(targetFileName) ?? '';
        const newContent = applyTextChanges(originalContent, fileChange.textChanges);

        if (newContent !== originalContent) {
          changesInPass += fileChange.textChanges.length;
          totalAnnotations += fileChange.textChanges.length;
          modifiedFileSet.add(targetFileName);

          const existingChanges = changesByFile.get(targetFileName) ?? [];
          existingChanges.push({
            fileName: targetFileName,
            originalText: originalContent,
            newText: newContent,
            textChanges: fileChange.textChanges,
          });
          changesByFile.set(targetFileName, existingChanges);

          host.updateFile(targetFileName, newContent);

          if (!dryRun) {
            fs.writeFileSync(targetFileName, newContent, 'utf-8');
          }

          if (verbose) {
            console.log(
                `  [Pass ${pass}] ${path.relative(repoRoot, targetFileName)}: added ${
                    fileChange.textChanges.length} annotation(s)`,
            );
          }
        }
      }
    }

    if (changesInPass === 0) {
      if (verbose) {
        console.log(`No more missing type annotations found. Converged after pass ${pass}.`);
      }
      break;
    }
  }

  return {
    target: options.target,
    tsconfigPath,
    filesChecked: sourceFiles.length,
    filesModified: modifiedFileSet.size,
    totalAnnotationsAdded: totalAnnotations,
    passesCompleted: passes,
    modifiedFiles: Array.from(modifiedFileSet),
    changesByFile,
  };
}

export function main(): void {
  const argv =
      yargs(hideBin(process.argv))
          .usage('Usage: $0 [options] <target|tsconfig...>')
          .command(
              '$0 [targets..]', 'Auto-fix missing type annotations on exports for GN targets or tsconfig files',
              yargs => {
                yargs.positional('targets', {
                  describe: 'GN targets (e.g. front_end/panels/animation) or paths to generated *-tsconfig.json files',
                  type: 'string',
                  array: true,
                  default: [],
                });
              })
          .option('build-dir', {
            alias: 'b',
            type: 'string',
            default: 'out/Default',
            describe: 'GN build directory containing generated gen/ tree',
          })
          .option('tsconfig', {
            alias: 'p',
            type: 'string',
            describe: 'Direct path to a generated tsconfig.json file',
          })
          .option('dry-run', {
            alias: 'n',
            type: 'boolean',
            default: false,
            describe: 'Perform a dry run without modifying files on disk',
          })
          .option('verbose', {
            alias: 'v',
            type: 'boolean',
            default: false,
            describe: 'Enable verbose logging',
          })
          .option('max-passes', {
            type: 'number',
            default: 5,
            describe: 'Maximum iterative passes to run until convergence',
          })
          .example('$0 front_end/panels/animation', 'Fix missing annotations in animation panel')
          .example('$0 front_end/core/common:common', 'Fix missing annotations for a specific GN target')
          .example('$0 -b out/Bundle front_end/panels/animation', 'Use a specific build directory')
          .example('$0 out/Default/gen/front_end/panels/animation/animation-tsconfig.json', 'Direct tsconfig path')
          .example('$0 -n -v front_end/panels/animation', 'Dry run with verbose logging')
          .help()
          .alias('help', 'h')
          .parseSync();

  const targets = [...((argv.targets as string[] | undefined) ?? [])];
  if (argv.tsconfig) {
    targets.push(argv.tsconfig);
  }

  if (targets.length === 0) {
    console.error('Error: Please specify at least one GN target or generated tsconfig path.');
    console.error('Run with --help for usage examples.');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`Processing ${targets.length} target(s) using build directory "${argv['build-dir']}"...`);

  let totalChecked = 0;
  let totalModified = 0;
  let totalAnnotations = 0;
  const allModifiedFiles: string[] = [];

  try {
    for (const target of targets) {
      console.log(`\nAnalyzing target: ${target}`);
      const summary = fixMissingTypeAnnotationsForTarget({
        target,
        buildDir: argv['build-dir'],
        dryRun: argv['dry-run'],
        verbose: argv.verbose,
        maxPasses: argv['max-passes'],
      });

      totalChecked += summary.filesChecked;
      totalModified += summary.filesModified;
      totalAnnotations += summary.totalAnnotationsAdded;
      allModifiedFiles.push(...summary.modifiedFiles);

      console.log(`  Tsconfig:     ${path.relative(process.cwd(), summary.tsconfigPath)}`);
      console.log(`  Files:        ${summary.filesChecked} checked, ${summary.filesModified} modified`);
      console.log(`  Annotations:  ${summary.totalAnnotationsAdded} added in ${summary.passesCompleted} pass(es)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' +
                '='.repeat(60));
    console.log(`Finished in ${elapsed}s`);
    console.log(`Total files checked:   ${totalChecked}`);
    console.log(`Total files modified:  ${totalModified}`);
    console.log(`Total annotations:     ${totalAnnotations}`);
    if (argv['dry-run']) {
      console.log('Mode:                  DRY RUN (no files modified on disk)');
    }
    console.log('='.repeat(60));

    if (allModifiedFiles.length > 0) {
      console.log('\nModified files:');
      for (const file of new Set(allModifiedFiles)) {
        console.log(` - ${path.relative(process.cwd(), file)}`);
      }
    }
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
