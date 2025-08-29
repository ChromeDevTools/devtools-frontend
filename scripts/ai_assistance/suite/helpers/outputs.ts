// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

import type {Conversation, EvalFileOutput} from '../types';

const BASE_DIR = path.join(path.dirname(import.meta.filename), '..', 'outputs', 'outputs');

export function getMarkdownConversation(example: Conversation): string {
  let markdown = '';
  for (const query of example.queries) {
    markdown += '## REQUEST FROM CLIENT:\n';
    if (query.request.prompt) {
      markdown += `### QUERY:\n${query.request.prompt}\n`;
    }
    if (query.request.functionCallResponse) {
      markdown += `### FUNCTION CALL RESPONSE:\n${query.request.functionCallResponse}\n`;
    }

    markdown += '## RESPONSE FROM SERVER:\n';
    if (query.response.text) {
      markdown += `### EXPLANATION:\n${query.response.text}\n`;
    }
    if (query.response.functionCallRequests?.length) {
      markdown += `### FUNCTION CALL REQUESTS:\n${query.response.functionCallRequests.join(', ')}\n`;
    }
    markdown += '\n';
  }
  return markdown;
}

export interface Output {
  absoluteFilePath: string;
  fileName: string;
  label: string;
  dateFolder: string;
  type: string;
  contents: EvalFileOutput;
}

export async function getOutputs(type: string, label: string): Promise<Output[]> {
  const folder = path.join(BASE_DIR, type);
  const matchedFiles = await findNestedFiles(folder, fileName => {
    return fileName.startsWith(label);
  });
  return matchedFiles.map(filePath => {
    const absoluteFilePath = path.join(BASE_DIR, type, filePath);
    const [parentDir, fileName] = filePath.split('/');
    return {
      absoluteFilePath,
      fileName,
      dateFolder: parentDir,
      type,
      label,
      contents: JSON.parse(fs.readFileSync(absoluteFilePath, 'utf8')) as EvalFileOutput,
    };
  });
}

/**
 * Finds all files within one level of nested folders in a given directory,
 * returning a list of files prefixed with their parent folder's name.
 *
 * Example: if `baseDirPath` contains `folder1/fileA.txt` and `folder2/fileB.js`,
 * and `folder1` contains `fileA.txt`, `folder2` contains `fileB.js`,
 * the result would be `['folder1/fileA.txt', 'folder2/fileB.js']`.
 * Files directly in `baseDirPath` are ignored.
 *
 * @param baseDirPath The path to the base directory to search within.
 * @returns A promise that resolves to an array of file paths in 'foldername/filename' format.
 */
export async function findNestedFiles(
    baseDirPath: string, predicate: (fileName: string) => boolean): Promise<string[]> {
  const result: string[] = [];
  try {
    // Read entries in the base directory
    const entries = await fsPromises.readdir(baseDirPath, {withFileTypes: true});

    for (const entry of entries) {
      // If the entry is a directory, it's a "nested folder"
      if (entry.isDirectory()) {
        const nestedFolderPath = path.join(baseDirPath, entry.name);
        try {
          // Read entries in the nested folder
          const nestedFolderEntries = await fsPromises.readdir(nestedFolderPath, {withFileTypes: true});

          for (const nestedEntry of nestedFolderEntries) {
            // If the nested entry is a file, add it to the result
            if (nestedEntry.isFile()) {
              // Prefix with the nested folder's name
              if (predicate(nestedEntry.name)) {
                result.push(path.join(entry.name, nestedEntry.name));
              }
            }
          }
        } catch (nestedError) {
          // Log error for a specific nested folder but continue with others
          console.warn(`Could not read nested directory ${nestedFolderPath}: ${nestedError.message}`);
        }
      }
    }
  } catch (error) {
    // Log error for the base directory and return empty array
    console.error(`Error processing base directory ${baseDirPath}: ${error.message}`);
    return [];  // Return empty array if base directory read fails
  }
  return result;
}
