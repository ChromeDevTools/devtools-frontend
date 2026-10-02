// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import crypto from 'node:crypto';
import fs from 'node:fs';
import {pipeline, Readable} from 'node:stream';
import zlib from 'node:zlib';

const {promises: pfs} = fs;

function sha1(data) {
  return crypto.createHash('sha1').update(data, 'binary').digest('hex');
}

async function readTextFile(filename) {
  return pfs.readFile(filename, 'utf8');
}

async function fileExists(filename) {
  try {
    await pfs.access(filename);
    return true;
  } catch {
    return false;
  }
}

async function writeTextFile(filename, data) {
  return pfs.writeFile(filename, data, 'utf8');
}

/**
 * Writes `data` to `filename` atomically by writing to a sibling temp file
 * first and renaming it into place. Readers (and interrupted builds) therefore
 * either observe the previous complete file or the new complete file, never a
 * partially written one.
 */
async function writeFileAtomic(filename, data) {
  const tmpFilename = `${filename}.tmp`;
  try {
    await pfs.writeFile(tmpFilename, data);
    await pfs.rename(tmpFilename, filename);
  } catch (err) {
    await pfs.rm(tmpFilename, {force: true});
    throw err;
  }
}

async function readBinaryFile(filename) {
  return pfs.readFile(filename);
}

async function brotli(sourceData, compressedFilename) {
  const sizeBytes = sourceData.length;

  // This replicates the following compression logic:
  // https://source.chromium.org/chromium/chromium/src/+/main:tools/grit/grit/node/base.py;l=649;drc=84ef659584d3beb83b44cc168d02244dbd6b8f87
  const array = new BigUint64Array(1);
  // The length of the uncompressed data as 8 bytes little-endian.
  new DataView(array.buffer).setBigUint64(0, BigInt(sizeBytes), true);

  // BROTLI_CONST is prepended to brotli compressed data in order to
  // easily check if a resource has been brotli compressed.
  // It should be kept in sync with https://source.chromium.org/chromium/chromium/src/+/main:tools/grit/grit/constants.py;l=25;drc=84ef659584d3beb83b44cc168d02244dbd6b8f87.
  const brotliConst = new Uint8Array(2);
  brotliConst[0] = 0x1e;
  brotliConst[1] = 0x9b;

  // The length of the uncompressed data is also appended to the start,
  // truncated to 6 bytes, little-endian.
  const sizeHeader = new Uint8Array(array.buffer).slice(0, 6).buffer;

  // Stream into a temp file and rename it into place once complete, so that
  // an interrupted build can never leave a truncated `.compressed` behind.
  const tmpFilename = `${compressedFilename}.tmp`;
  try {
    const output = fs.createWriteStream(tmpFilename);
    output.write(Buffer.from(brotliConst));
    output.write(Buffer.from(sizeHeader));
    await new Promise((resolve, reject) => {
      pipeline(
          Readable.from(sourceData),
          zlib.createBrotliCompress(),
          output,
          err => {
            return err ? reject(err) : resolve();
          },
      );
    });
    await pfs.rename(tmpFilename, compressedFilename);
  } catch (err) {
    await pfs.rm(tmpFilename, {force: true});
    throw err;
  }
}

async function fileSize(filename) {
  try {
    return (await pfs.stat(filename)).size;
  } catch {
    return -1;
  }
}

async function compressFile(filename) {
  const compressedFilename = filename + '.compressed';
  const hashFilename = filename + '.hash';

  // The `.hash` file records `<sha1 of source> <size of .compressed>`. The
  // size lets us cheaply validate that the `.compressed` on disk is the
  // complete output that belongs to this hash. Older `.hash` files only
  // contain the sha1 and therefore never match, which forces a one-time
  // recompression and heals build directories with stale or truncated
  // `.compressed` files produced by earlier versions of this script.
  let prevHash = '';
  let prevCompressedSize = -1;
  if (await fileExists(hashFilename)) {
    const [hash, size] = (await readTextFile(hashFilename)).trim().split(' ');
    prevHash = hash;
    prevCompressedSize = Number.parseInt(size, 10);
  }

  const sourceData = await readBinaryFile(filename);
  const currHash = sha1(sourceData);
  if (prevHash === currHash && prevCompressedSize >= 0 && prevCompressedSize === (await fileSize(compressedFilename))) {
    // Cache hit. Bump the output mtimes anyway: the input may have been
    // rewritten with identical content (e.g. a comment-only edit that the
    // minifier strips), and Ninja would otherwise consider these outputs out
    // of date on every subsequent build.
    const now = new Date();
    await Promise.all([
      pfs.utimes(compressedFilename, now, now),
      pfs.utimes(hashFilename, now, now),
    ]);
    return;
  }

  // Order matters: the `.hash` file acts as the commit marker for the
  // `.compressed` output and must only be written once the compressed file is
  // complete. If the build is interrupted in between, the stale (or missing)
  // hash forces a recompression on the next run instead of caching a stale or
  // partial `.compressed` file that would end up in resources.pak.
  await brotli(sourceData, compressedFilename);
  const compressedSize = await fileSize(compressedFilename);
  await writeFileAtomic(hashFilename, `${currHash} ${compressedSize}`);
}

async function main(argv) {
  const fileListPosition = argv.indexOf('--file_list');
  const fileList = argv[fileListPosition + 1];
  const fileListContents = await readTextFile(fileList);
  const files = fileListContents.split(/\s+/).filter(Boolean);
  await Promise.all(files.map(filename => filename.trim()).map(compressFile));

  const depfileIndex = argv.indexOf('--depfile');
  if (depfileIndex !== -1 && files.length > 0) {
    const depfilePath = argv[depfileIndex + 1];
    const firstOutput = (files[0] + '.compressed').replaceAll('\\', '/');
    const normalizedFiles = files.map(f => f.replaceAll('\\', '/'));
    const depfileContent = `${firstOutput}: ${normalizedFiles.join(' ')}\n`;
    await writeTextFile(depfilePath, depfileContent);
  }
}

main(process.argv).catch(err => {
  console.log('compress_files.js failure', err);
  process.exit(1);
});
