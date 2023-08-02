// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function globToRegExp(glob: string): RegExp {
  let re = '^';
  for (let i = 0; i < glob.length; ++i) {
    const c = glob.charCodeAt(i);
    if (c === 0x2a) {
      if (i + 2 < glob.length && glob.charCodeAt(i + 1) === 0x2a && glob.charCodeAt(i + 2) === 0x2f) {
        // Compile '**/' to match everything including slashes.
        re += '.*';
        i += 2;
      } else {
        // Compile '*' to match everything except slashes.
        re += '[^/]*';
      }
    } else {
      // Just escape everything else, so we don't need to
      // worry about special characters like ., +, $, etc.
      re += `\\u${c.toString(16).padStart(4, '0')}`;
    }
  }
  re += '$';
  return new RegExp(re, 'i');
}

/**
 * Performs a glob-style pattern matching.
 *
 * The following special characters are supported for the `pattern`:
 *
 * - '*' matches every sequence of characters, except for slash ('/').
 * - '**' plus '/' matches every sequence of characters, including slash ('/').
 *
 * If the `pattern` doesn't contain a slash ('/'), only the last path
 * component of the `subject` (its basename) will be matched against
 * the `pattern`. Otherwise if at least one slash is found in `pattern`
 * the full `subject` is matched against the `pattern`.
 *
 * @param pattern the wildcard pattern
 * @param subject the subject URL to test against
 * @return whether the `subject` matches the given `pattern`.
 */
export function globMatch(pattern: string, subject: string): boolean {
  const regexp = globToRegExp(pattern);
  if (!pattern.includes('/')) {
    subject = subject.slice(subject.lastIndexOf('/') + 1);
  }
  return regexp.test(subject);
}
