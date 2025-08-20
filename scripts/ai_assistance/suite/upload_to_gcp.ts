// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// the upload_to_google_storage_first_class.py script only lets you upload
// folders in the immediate directory, so we run it from the `outputs`
// directory. Remember that the outputs directory is nested and looks like
// this:
// scripts/ai_assistance/suite/outputs/outputs
// We need to run the script from the first outputs directory, uploading the second.
const CWD_TO_UPLOAD_FROM = path.join(dirname, 'outputs');

const DEVTOOLS_ROOT = path.join(dirname, '..', '..', '..');

const hash = await getDirectoryHash(path.join(CWD_TO_UPLOAD_FROM, 'outputs'));

const output = execSync(
    `upload_to_google_storage_first_class.py --bucket chrome-devtools-ai-evals --object-name ${hash} outputs`,
    {cwd: CWD_TO_UPLOAD_FROM, encoding: 'utf8'});

// The output contains some logs and then a JSON object that we want to use to
// update our DEPS with the newest data.
const jsonRegex = /{.*}/s;
const jsonMatch = output.match(jsonRegex);
if (!jsonMatch) {
  console.error('ERROR: could not parse DEPs JSON out of upload response.');
  process.exit(1);
}

console.log('Data uploaded to GCP bucket.');

const data = JSON.parse(jsonMatch[0]) as {
  path: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    dep_type: 'gcs',
    bucket: 'chrome-devtools-ai-evals',
    objects: [{
      // eslint-disable-next-line @typescript-eslint/naming-convention
      object_name: string,
      sha256sum: string,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      size_bytes: number,
      generation: number,
    }],
  },
};

// We now need to update the DEPs entry. We can use `gclient setdeps` which
// expects a particular format (taken from the --help output):
// If it is a GCS dependency, dep must be of the form path@object_name,sha256sum,size_bytes,generation
const DEPS_PATH = 'scripts/ai_assistance/suite/outputs';
const setDepInput = [...Object.values(data.path.objects[0])].join(',');

execSync(`gclient setdep -r ${DEPS_PATH}@${setDepInput}`, {cwd: DEVTOOLS_ROOT, encoding: 'utf8', stdio: 'ignore'});

console.log('DEPS file updated. You should commit this change.');

/**
 * Walks a directory and creates a hash of it based on the contents of all the
 * files. Used to generate the name of the TAR file that gets put onto GCP. We
 * do it like this to ensure we don't upload the same contents again.
 */
async function getDirectoryHash(directoryPath: string): Promise<string> {
  const files: string[] = [];

  async function walk(currentPath: string) {
    const items = await fs.readdir(currentPath, {withFileTypes: true});

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
      } else if (item.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  await walk(directoryPath);
  // Sort paths for a consistent hash
  files.sort();

  const hasher = crypto.createHash('sha256');
  for (const filePath of files) {
    // Get a hash of the file's content
    const fileContent = await fs.readFile(filePath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    // Combine the relative path and file hash
    const relativePath = path.relative(directoryPath, filePath);
    hasher.update(`${relativePath}:${fileHash}`);
  }

  return hasher.digest('hex');
}
