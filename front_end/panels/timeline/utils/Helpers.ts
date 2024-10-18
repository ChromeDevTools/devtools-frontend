// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';

function createTrimmedUrlSearch(url: URL): string {
  const maxSearchValueLength = 8;
  let search = '';

  for (const [key, value] of url.searchParams) {
    if (search) {
      search += '&';
    }
    if (value) {
      search += `${key}=${Platform.StringUtilities.trimEndWithMaxLength(value, maxSearchValueLength)}`;
    } else {
      search += key;
    }
  }
  if (search) {
    search = '?' + search;
  }

  return search;
}

/**
 * Shortens URLs as much as possible while keeping important context.
 *
 * - Elides the host if the previous url is the same host+protocol
 * - Always elide search param values
 * - Always includes protocol/domain if there is a mix of protocols
 * - First URL is elided fully to show just the pathname, unless there is a mix of protocols (see above)
 */
export function createUrlLabels(urls: URL[]): string[] {
  const labels: string[] = [];
  const isAllHttps = urls.every(url => url.protocol === 'https:');

  for (const [index, url] of urls.entries()) {
    const previousUrl = urls[index - 1];
    const sameHostAndProtocol = previousUrl && url.host === previousUrl.host && url.protocol === previousUrl.protocol;
    let elideHost = sameHostAndProtocol;
    let elideProtocol = isAllHttps;

    // For the first URL, show just the pathname and search - this will be relative to the domain as seen in the
    // trace dropdown selector. Exception is if there are non-https protocols, in which case we're only going to elide
    // parts of the query string.
    if (index === 0 && isAllHttps) {
      elideHost = true;
      elideProtocol = true;
    }

    const search = createTrimmedUrlSearch(url);
    if (!elideProtocol) {
      labels.push(`${url.protocol}//${url.host}${url.pathname}${search}`);
    } else if (!elideHost) {
      labels.push(`${url.host}${url.pathname}${search}`);
    } else {
      labels.push(`${url.pathname}${search}`);
    }
  }

  // Lastly, remove any trailing `/`.
  return labels.map(label => label.length > 1 && label.endsWith('/') ? label.substring(0, label.length - 1) : label);
}

/**
 * Shortens the provided URL for use within a narrow display usecase.
 *
 * The resulting string will at least contain the last path component of the URL.
 * More components are included until a limit of maxChars (default 20) is reached.
 * No querystring is included.
 *
 * If the last path component is larger than maxChars characters, the middle is elided.
 */
export function shortenUrl(url: URL, maxChars = 20): string {
  const parts = url.pathname.split('/');
  let shortenedUrl = parts.at(-1) ?? '';

  if (shortenedUrl.length > maxChars) {
    return Platform.StringUtilities.trimMiddle(shortenedUrl, maxChars);
  }

  let i = parts.length - 1;
  while (--i >= 0) {
    if (shortenedUrl.length + parts[i].length <= maxChars) {
      shortenedUrl = `${parts[i]}/${shortenedUrl}`;
    }
  }

  return shortenedUrl;
}
