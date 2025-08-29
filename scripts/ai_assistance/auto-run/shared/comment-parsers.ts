// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Parses a comment into its parts. A comment is expected to match:
 * Prompt: X
 * Explanation: Y
 * And can also have any other A: B pairs. The order of the lines is not important.
 *
 * These can also span multiple lines, for example:
 * Prompt: A
 * B
 * C
 * Explanation: Y
 * Here the prompt is made up of A, B and C.
 *
 * Originally comments were of the form:
 * X
 * # Y
 * Where X is the prompt and Y is the explanation. To avoid having to update a
 * lot of examples, this parser also supports this format.
 *
 * @param comment The comment string to split.
 * @returns An object containing the found keys and their values.
 */
export function parseComment(comment: string): Record<string, string> {
  // Tracks which section of the comment we are in so we know where to
  // associate lines with.
  let activeKey: string|null = null;

  const lines: Record<string, string[]> = {
    // We may get other keys, but these two are required.
    explanation: [],
    prompt: [],
  };

  for (let line of comment.split('\n')) {
    line = line.trim();
    if (line === '') {
      continue;
    }
    if (line.startsWith('#')) {
      // This is the old syntax to denote that we are in the explanation section
      activeKey = 'explanation';
      // Remove the starting "# "
      line = line.substring(1).trim();
    }

    const parts = line.split(':');
    if (parts.length > 1) {
      // A: B, so start a new section.
      activeKey = parts[0].toLowerCase();
      // Store all the other parts (join back in case they contained colons themselves)
      const part = parts.slice(1).join(':').trim();
      if (part) {
        lines[activeKey] = [part];
      }
    } else if (parts.length === 1) {
      const part = parts[0].trim();
      if (!part) {
        continue;
      }
      // Store this line; fall back to the prompt if we don't have an active
      // key. This supports the old syntax where a line with no prefix was
      // considered part of the prompt.
      lines[activeKey ?? 'prompt'].push(parts[0].trim());
    }
  }

  const result: Record<string, string> = {};
  Object.keys(lines).forEach(lineKey => {
    result[lineKey] = lines[lineKey].join('\n');
  });
  return result;
}

export function parseFollowUps(comment: Record<string, string>): string[] {
  const followUpPrompts: string[] = [];
  const FOLLOW_UP_PREFIX = 'followup';
  Object.entries(comment).forEach(([key, value]) => {
    if (key.toLowerCase().startsWith(FOLLOW_UP_PREFIX)) {
      if (value.length === 0) {
        throw new Error(`Found empty followup value at ${key}`);
      }
      const indexStr = key.substring(FOLLOW_UP_PREFIX.length);
      const index = parseInt(indexStr, 10);
      if (Number.isNaN(index)) {
        throw new Error(`Found invalid followup prompt: ${key}, ${value}`);
      }
      followUpPrompts[index - 1] = value;
    }
  });
  // In case the input was "followup1" and "followup3", this removes holes
  // from the array.
  return followUpPrompts.filter(x => Boolean(x));
}
