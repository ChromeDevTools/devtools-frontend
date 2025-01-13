// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Splits a comment string into a question and answer.
 * The comment string is split by lines. Lines starting with '#' are
 * considered part of the answer, while other lines are part of the
 * question.
 *
 * @param {string} comment The comment string to split.
 * @return {{answer: string, question: string}} An object containing the
 *     answer and question strings.
 */
function parseComment(comment) {
  let isAnswer = false;
  const question = [];
  const answer = [];
  for (let line of comment.split('\n')) {
    line = line.trim();
    if (line === '') {
      continue;
    }

    if (line.startsWith('#')) {
      isAnswer = true;
    }

    if (isAnswer) {
      if (line.startsWith('#')) {
        line = line.substring(1).trim();
      }
      answer.push(line);
    } else {
      question.push(line);
    }
  }

  return {
    answer: answer.join('\n'),
    question: question.join(' '),
  };
}

module.exports = {
  parseComment,
};
