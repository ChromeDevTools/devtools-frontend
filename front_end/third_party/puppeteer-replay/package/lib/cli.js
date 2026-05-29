#!/usr/bin/env node
import { styleText, parseArgs } from 'node:util';
import { parse, PuppeteerRunnerOwningBrowserExtension, createRunner } from './main.js';
import { lstatSync, readFileSync, readdirSync } from 'fs';
import { extname, join, isAbsolute, relative } from 'path';
import { pathToFileURL } from 'url';
import { cwd } from 'process';

/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class StatusReport extends Array {
    toString() {
        const headers = ['Title', 'Status', 'File', 'Duration'];
        const allRows = [headers, ...this];
        const colWidths = headers.map((_, colIndex) => {
            return Math.max(...allRows.map((row) => (row[colIndex] || '').length));
        });
        return allRows
            .map((row, rowIndex) => {
            const paddedRow = row
                .map((cell, colIndex) => {
                const cellStr = cell || '';
                let formattedCell = cellStr;
                if (rowIndex > 0 && colIndex === 1) {
                    formattedCell =
                        cellStr === ' Success '
                            ? styleText(['white', 'bgGreen'], cellStr)
                            : styleText(['white', 'bgRed'], cellStr);
                }
                const padding = ' '.repeat(Math.max(0, colWidths[colIndex] - cellStr.length));
                return formattedCell + padding;
            })
                .join('  ');
            if (rowIndex === 0) {
                const separator = colWidths.map((w) => '═'.repeat(w)).join('══');
                return `${paddedRow}\n${separator}`;
            }
            return paddedRow;
        })
            .join('\n');
    }
}
function getJSONFilesFromFolder(path) {
    return readdirSync(path)
        .filter((file) => extname(file) === '.json')
        .map((file) => join(path, file));
}
function getRecordingPaths(paths, log = true) {
    const recordingPaths = [];
    for (const path of paths) {
        let isDirectory;
        try {
            isDirectory = lstatSync(path).isDirectory();
        }
        catch (err) {
            log && console.error(`Couldn't find file/folder: ${path}`, err);
            continue;
        }
        if (isDirectory) {
            const filesInFolder = getJSONFilesFromFolder(path);
            if (!filesInFolder.length)
                log && console.error(`There is no recordings in: ${path}`);
            recordingPaths.push(...filesInFolder);
        }
        else
            recordingPaths.push(path);
    }
    return recordingPaths;
}
function getHeadlessEnvVar(headless) {
    if (!headless) {
        return true;
    }
    switch (headless.toLowerCase()) {
        case '1':
        case 'true':
            return true;
        case 'shell':
            return 'shell';
        case '0':
        case 'false':
            return false;
        default:
            throw new Error('PUPPETEER_HEADLESS: unrecognized value');
    }
}
function createStatusReport(results) {
    const table = new StatusReport();
    for (const result of results) {
        const row = [];
        const duration = result.finishedAt?.getTime() - result.startedAt.getTime() || 0;
        const status = result.success ? ' Success ' : ' Failure ';
        row.push(result.title);
        row.push(status);
        row.push(relative(process.cwd(), result.file));
        row.push(`${duration}ms`);
        table.push(row);
    }
    return table;
}
async function importExtensionFromPath(path) {
    const module = await import(pathToFileURL(isAbsolute(path) ? path : join(cwd(), path)).toString());
    return module.default;
}
async function runFiles(files, opts = {
    log: true,
    headless: true,
}) {
    let Extension = PuppeteerRunnerOwningBrowserExtension;
    let browser;
    if (opts.extension) {
        Extension = await importExtensionFromPath(opts.extension);
    }
    const results = [];
    for (const file of files) {
        const result = {
            title: '',
            startedAt: new Date(),
            finishedAt: new Date(),
            file,
            success: true,
        };
        opts.log && console.log(`Running ${file}...`);
        try {
            const content = readFileSync(file, 'utf-8');
            const object = JSON.parse(content);
            const recording = parse(object);
            result.title = recording.title;
            const { default: puppeteer } = await import('puppeteer');
            browser = await puppeteer.launch({
                headless: opts.headless,
            });
            const page = await browser.newPage();
            const extension = new Extension(browser, page);
            const runner = await createRunner(recording, extension);
            await runner.run();
            opts.log && console.log(`Finished running ${file}`);
        }
        catch (err) {
            opts.log && console.error(`Error running ${file}`, err);
            result.success = false;
        }
        finally {
            result.finishedAt = new Date();
            results.push(result);
            await browser?.close();
        }
    }
    if (opts.log) {
        const statusReport = createStatusReport(results);
        console.log(statusReport.toString());
    }
    if (results.every((result) => result.success))
        return;
    throw new Error('Some recordings have failed to run.');
}

/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const { values, positionals: files } = parseArgs({
    options: {
        headless: {
            type: 'string',
        },
        extension: {
            type: 'string',
        },
        ext: {
            type: 'string',
        },
        help: {
            type: 'boolean',
            short: 'h',
            default: false,
        },
    },
    allowPositionals: true,
});
if (values.help) {
    console.log(`
Usage: replay [options] <files..>

Options:
  --headless            Run using the browser's headless mode. 
                        Choices: shell, true, 1, 0, false
  --ext, --extension    Run using an extension identified by the path.
  -h, --help            Show help
`);
    process.exit(0);
}
if (files.length === 0) {
    console.error('Error: Missing required argument: files');
    process.exit(1);
}
const recordingPaths = getRecordingPaths(files);
await runFiles(recordingPaths, {
    log: true,
    headless: getHeadlessEnvVar(values.headless || process.env['PUPPETEER_HEADLESS']),
    extension: values.extension || values.ext,
});
//# sourceMappingURL=cli.js.map
