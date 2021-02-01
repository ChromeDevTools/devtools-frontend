// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const ts = require('typescript');

const readDirAsync = fs.promises.readdir;
const readFileAsync = fs.promises.readFile;

const ORIGIN_PATTERNS_TO_CHECK = [
  new RegExp('^https://web.dev'),
  new RegExp('^https://developers.google.com'),
  new RegExp('^https://developer[s]?.chrome.com'),
];

const DIRECTORIES_TO_CHECK = [
  'front_end',
];

const EXCLUDE_DIRECTORIES = [
  'front_end/third_party',
];

const REQUEST_TIMEOUT = 5000;

const REDIRECTS_CONSIDERED_ERROR = new Set([
  /* Multiple Choices */ 300,
  /* Moved permanently */ 301,
  /* Permament redirect */ 308,
]);

const ROOT_REPOSITORY_PATH = path.resolve(__dirname, '..');
const DIRECTORIES_TO_CHECK_PATHS = DIRECTORIES_TO_CHECK.map(directory => path.resolve(ROOT_REPOSITORY_PATH, directory));

async function findAllSourceFiles(directory) {
  if (EXCLUDE_DIRECTORIES.includes(path.relative(ROOT_REPOSITORY_PATH, directory))) {
    return [];
  }

  const dirEntries = await readDirAsync(directory, {withFileTypes: true});
  const files = await Promise.all(dirEntries.map(dirEntry => {
    const resolvedPath = path.resolve(directory, dirEntry.name);
    if (dirEntry.isDirectory()) {
      return findAllSourceFiles(resolvedPath);
    }
    if (dirEntry.isFile() && /\.(js|ts)$/.test(dirEntry.name)) {
      return resolvedPath;
    }
    return [];  // Let Array#flat filter out files we are not interested in.
  }));
  return files.flat();
}

function collectUrlsToCheck(node) {
  const nodesToVisit = [node];
  const urlsToCheck = [];
  while (nodesToVisit.length) {
    const currentNode = nodesToVisit.shift();
    if (currentNode.kind === ts.SyntaxKind.StringLiteral ||
        currentNode.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      const checkUrl = ORIGIN_PATTERNS_TO_CHECK.some(originPattern => originPattern.test(currentNode.text));
      if (checkUrl) {
        urlsToCheck.push(currentNode.text);
      }
    }
    nodesToVisit.push(...currentNode.getChildren());
  }
  return urlsToCheck;
}

async function collectUrlsToCheckFromFile(filePath) {
  const content = await readFileAsync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.ESNext, true);
  return collectUrlsToCheck(sourceFile);
}

async function checkUrls(urls) {
  // clang-format off
  const requestPromises = urls.map(url => new Promise(resolve => {
    const request = https.request(url, {method: 'HEAD'}, response => {
      resolve({url, statusCode: response.statusCode});
    });

    request.on('error', err => {
      resolve({url, error: err});
    });
    request.setTimeout(REQUEST_TIMEOUT, _ => {
      resolve({url, error: `Timed out after ${REQUEST_TIMEOUT}`});
    });
    request.end();
  }));
  // clang-format on

  return Promise.all(requestPromises);
}

function includeRequestResultInOutput(requestResult) {
  return requestResult.error || requestResult.statusCode !== 200;
}

function isErrorStatusCode(statusCode) {
  return statusCode >= 400 || REDIRECTS_CONSIDERED_ERROR.has(statusCode);
}

function requestResultIsErronous(requestResult) {
  return requestResult.error || isErrorStatusCode(requestResult.statusCode);
}

function printSelectedRequestResults(requestResults) {
  const requestsToPrint = requestResults.filter(includeRequestResultInOutput);
  if (requestsToPrint.length === 0) {
    console.log('\nAll Urls are accessible and point to existing resources.\n');
    return;
  }

  for (const requestResult of requestsToPrint) {
    if (requestResult.error) {
      console.error(`[Failure] ${requestResult.error} - ${requestResult.url}`);
    } else if (isErrorStatusCode(requestResult.statusCode)) {
      console.error(`[Failure] Status Code: ${requestResult.statusCode} - ${requestResult.url}`);
    } else {
      console.log(`Status Code: ${requestResult.statusCode} - ${requestResult.url}`);
    }
  }
}

async function main() {
  process.stdout.write('Collecting JS/TS source files ... ');
  const sourceFiles = (await Promise.all(DIRECTORIES_TO_CHECK_PATHS.map(findAllSourceFiles))).flat();
  process.stdout.write(`${sourceFiles.length} files found.\n`);

  process.stdout.write('Collecting Urls from files ... ');
  const urlsToCheck = (await Promise.all(sourceFiles.map(collectUrlsToCheckFromFile))).flat();
  const deduplicatedUrlsToCheck = new Set(urlsToCheck);
  process.stdout.write(`${deduplicatedUrlsToCheck.size} unique Urls found.\n`);

  process.stdout.write('Sending a HEAD request to each one ...\n');
  const requestResults = await checkUrls([...deduplicatedUrlsToCheck]);
  printSelectedRequestResults(requestResults);

  const exitCode = requestResults.some(requestResultIsErronous) ? 1 : 0;
  process.exit(exitCode);
}

main();
