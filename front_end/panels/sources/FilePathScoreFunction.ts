/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export class FilePathScoreFunction {
  private query: string;
  private readonly queryUpperCase: string;
  private score: Int32Array;
  private sequence: Int32Array;
  private dataUpperCase: string;
  private fileNameIndex: number;

  constructor(query: string) {
    this.query = query;
    this.queryUpperCase = query.toUpperCase();
    this.score = new Int32Array(20 * 100);
    this.sequence = new Int32Array(20 * 100);
    this.dataUpperCase = '';
    this.fileNameIndex = 0;
  }

  /**
   * Calculates the score of a given data string against the query string.
   *
   * The score is calculated by comparing the characters of the query string to
   * the characters of the data string. Characters that match are given a score
   * of 10, while characters that don't match are given a score of 0. The score
   * of a match is also influenced by the context of the match. For example,
   * matching the beginning of the file name is worth more than matching a
   * character in the middle of the file name.
   *
   * The score of a match is also influenced by the number of consecutive
   * matches. The more consecutive matches there are, the higher the score.
   *
   * @param data The data string to score.
   * @param matchIndexes An optional array to store the indexes of matching
   * characters. If provided, it will be filled with the indexes of the matching
   * characters in the data string.
   * @returns The score of the data string.
   */
  calculateScore(data: string, matchIndexes: number[]|null): number {
    if (!data || !this.query) {
      return 0;
    }
    const queryLength = this.query.length;
    const dataLength = data.length;
    if (!this.score || this.score.length < queryLength * dataLength) {
      this.score = new Int32Array(queryLength * dataLength * 2);
      this.sequence = new Int32Array(queryLength * dataLength * 2);
    }
    const score = this.score;
    const sequence = (this.sequence);
    this.dataUpperCase = data.toUpperCase();
    this.fileNameIndex = data.lastIndexOf('/');
    for (let i = 0; i < queryLength; ++i) {
      for (let j = 0; j < dataLength; ++j) {
        const scoreIndex = i * dataLength + j;
        const skipCharScore = j === 0 ? 0 : score[scoreIndex - 1];
        const prevCharScore = i === 0 || j === 0 ? 0 : score[(i - 1) * dataLength + j - 1];
        const consecutiveMatch = i === 0 || j === 0 ? 0 : sequence[(i - 1) * dataLength + j - 1];
        const pickCharScore = this.match(this.query, data, i, j, consecutiveMatch);
        if (pickCharScore && prevCharScore + pickCharScore >= skipCharScore) {
          sequence[scoreIndex] = consecutiveMatch + 1;
          score[scoreIndex] = (prevCharScore + pickCharScore);
        } else {
          sequence[scoreIndex] = 0;
          score[scoreIndex] = skipCharScore;
        }
      }
    }
    if (matchIndexes) {
      this.restoreMatchIndexes(sequence, queryLength, dataLength, matchIndexes);
    }
    const maxDataLength = 256;
    return score[queryLength * dataLength - 1] * maxDataLength + (maxDataLength - data.length);
  }

  private testWordStart(data: string, j: number): boolean {
    if (j === 0) {
      return true;
    }

    const prevChar = data.charAt(j - 1);
    return prevChar === '_' || prevChar === '-' || prevChar === '/' || prevChar === '.' || prevChar === ' ' ||
        (data[j - 1] !== this.dataUpperCase[j - 1] && data[j] === this.dataUpperCase[j]);
  }

  private restoreMatchIndexes(sequence: Int32Array, queryLength: number, dataLength: number, out: number[]): void {
    let i = queryLength - 1, j = dataLength - 1;
    while (i >= 0 && j >= 0) {
      switch (sequence[i * dataLength + j]) {
        case 0:
          --j;
          break;
        default:
          out.push(j);
          --i;
          --j;
          break;
      }
    }
    out.reverse();
  }

  private singleCharScore(query: string, data: string, i: number, j: number): number {
    const isWordStart = this.testWordStart(data, j);
    const isFileName = j > this.fileNameIndex;
    const isPathTokenStart = j === 0 || data[j - 1] === '/';
    const isCapsMatch = query[i] === data[j] && query[i] === this.queryUpperCase[i];
    let score = 10;
    if (isPathTokenStart) {
      score += 4;
    }
    if (isWordStart) {
      score += 2;
    }
    if (isCapsMatch) {
      score += 6;
    }
    if (isFileName) {
      score += 4;
    }
    // promote the case of making the whole match in the filename
    if (j === this.fileNameIndex + 1 && i === 0) {
      score += 5;
    }
    if (isFileName && isWordStart) {
      score += 3;
    }
    return score;
  }

  private sequenceCharScore(data: string, j: number, sequenceLength: number): number {
    const isFileName = j > this.fileNameIndex;
    const isPathTokenStart = j === 0 || data[j - 1] === '/';
    let score = 10;
    if (isFileName) {
      score += 4;
    }
    if (isPathTokenStart) {
      score += 5;
    }
    score += sequenceLength * 4;
    return score;
  }

  private match(query: string, data: string, i: number, j: number, consecutiveMatch: number): number {
    if (this.queryUpperCase[i] !== this.dataUpperCase[j]) {
      return 0;
    }

    if (!consecutiveMatch) {
      return this.singleCharScore(query, data, i, j);
    }
    return this.sequenceCharScore(data, j - consecutiveMatch, consecutiveMatch);
  }
}
