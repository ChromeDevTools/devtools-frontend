// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {Page} from 'puppeteer-core';

/**
 * Performance examples have a trace file so that this script does not have to
 * trigger a trace recording.
 */
export class TraceDownloader {
  static location = path.join(import.meta.dirname, 'performance-trace-downloads');

  static async ensureDownloadExists(filename: string, attempts = 0): Promise<boolean> {
    if (attempts === 5) {
      return false;
    }

    if (fs.existsSync(path.join(TraceDownloader.location, filename))) {
      return true;
    }

    return await new Promise(r => {
      setTimeout(() => {
        return r(TraceDownloader.ensureDownloadExists(filename, attempts + 1));
      }, 200);
    });
  }

  /**
   * Determines if a trace file needs to be downloaded.
   *
   * A file needs to be downloaded if:
   * 1. The file does not exist at the expected location.
   * 2. The file exists, but its last modification time was more than an hour ago.
   *
   * @param filename The name of the file to check.
   * @returns True if the file should be downloaded, false otherwise.
   */
  static shouldDownloadFile(filename: string): boolean {
    const filePath = path.join(TraceDownloader.location, filename);

    if (!fs.existsSync(filePath)) {
      return true;
    }

    const stats = fs.statSync(filePath);
    const oneHourInMilliseconds = 60 * 60 * 1000;
    const fileAge = Date.now() - stats.mtimeMs;

    if (fileAge > oneHourInMilliseconds) {
      return true;
    }

    return false;
  }

  async download(exampleUrl: string, page: Page): Promise<string> {
    const url = new URL(exampleUrl);
    const idForUrl = path.basename(path.dirname(url.pathname));
    const fileName = `${idForUrl}.json.gz`;
    if (!TraceDownloader.shouldDownloadFile(fileName)) {
      console.log(
          `Warning: not downloading ${fileName} because it was last downloaded <1hour ago. Delete this file from ${
              TraceDownloader.location} to force a re-download.`);
      return fileName;
    }

    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: TraceDownloader.location,
    });
    const traceUrl = exampleUrl.replace('index.html', fileName);
    // Using page.goto(traceUrl) does download the file, but it also causes a
    // net::ERR_ABORTED error to be thrown. Doing it this way does not. See
    // https://github.com/puppeteer/puppeteer/issues/6728#issuecomment-986082241.
    await page.evaluate(traceUrl => {
      location.href = traceUrl;
    }, traceUrl);
    const foundFile = await TraceDownloader.ensureDownloadExists(fileName);
    if (!foundFile) {
      console.error(
          `Could not find '${fileName}' in download location (${TraceDownloader.location}). Aborting.`,
      );
    }
    return fileName;
  }
}
