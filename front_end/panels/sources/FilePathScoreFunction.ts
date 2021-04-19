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

/* eslint-disable rulesdir/no_underscored_properties */

export class FilePathScoreFunction {
  _query: string;
  _queryUpperCase: string;
  _score: Int32Array;
  _sequence: Int32Array;
  _dataUpperCase: string;
  _fileNameIndex: number;
  constructor(query: string) {
    this._query = query;
    this._queryUpperCase = query.toUpperCase();
    this._score = new Int32Array(20 * 100);
    this._sequence = new Int32Array(20 * 100);
    this._dataUpperCase = '';
    this._fileNameIndex = 0;
  }

  score(data: string, matchIndexes: number[]|null): number {
    if (!data || !this._query) {
      return 0;
    }
    const n = this._query.length;
    const m = data.length;
    if (!this._score || this._score.length < n * m) {
      this._score = new Int32Array(n * m * 2);
      this._sequence = new Int32Array(n * m * 2);
    }
    const score = this._score;
    const sequence = (this._sequence as Int32Array);
    this._dataUpperCase = data.toUpperCase();
    this._fileNameIndex = data.lastIndexOf('/');
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < m; ++j) {
        const skipCharScore = j === 0 ? 0 : score[i * m + j - 1];
        const prevCharScore = i === 0 || j === 0 ? 0 : score[(i - 1) * m + j - 1];
        const consecutiveMatch = i === 0 || j === 0 ? 0 : sequence[(i - 1) * m + j - 1];
        const pickCharScore = this._match(this._query, data, i, j, consecutiveMatch);
        if (pickCharScore && prevCharScore + pickCharScore >= skipCharScore) {
          sequence[i * m + j] = consecutiveMatch + 1;
          score[i * m + j] = (prevCharScore + pickCharScore);
        } else {
          sequence[i * m + j] = 0;
          score[i * m + j] = skipCharScore;
        }
      }
    }
    if (matchIndexes) {
      this._restoreMatchIndexes(sequence, n, m, matchIndexes);
    }
    const maxDataLength = 256;
    return score[n * m - 1] * maxDataLength + (maxDataLength - data.length);
  }

  _testWordStart(data: string, j: number): boolean {
    if (j === 0) {
      return true;
    }

    const prevChar = data.charAt(j - 1);
    return prevChar === '_' || prevChar === '-' || prevChar === '/' || prevChar === '.' || prevChar === ' ' ||
        (data[j - 1] !== this._dataUpperCase[j - 1] && data[j] === this._dataUpperCase[j]);
  }

  _restoreMatchIndexes(sequence: Int32Array, n: number, m: number, out: number[]): void {
    let i = n - 1, j = m - 1;
    while (i >= 0 && j >= 0) {
      switch (sequence[i * m + j]) {
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

  _singleCharScore(query: string, data: string, i: number, j: number): number {
    const isWordStart = this._testWordStart(data, j);
    const isFileName = j > this._fileNameIndex;
    const isPathTokenStart = j === 0 || data[j - 1] === '/';
    const isCapsMatch = query[i] === data[j] && query[i] === this._queryUpperCase[i];
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
    if (j === this._fileNameIndex + 1 && i === 0) {
      score += 5;
    }
    if (isFileName && isWordStart) {
      score += 3;
    }
    return score;
  }

  _sequenceCharScore(query: string, data: string, i: number, j: number, sequenceLength: number): number {
    const isFileName = j > this._fileNameIndex;
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

  _match(query: string, data: string, i: number, j: number, consecutiveMatch: number): number {
    if (this._queryUpperCase[i] !== this._dataUpperCase[j]) {
      return 0;
    }

    if (!consecutiveMatch) {
      return this._singleCharScore(query, data, i, j);
    }
    return this._sequenceCharScore(query, data, i, j - consecutiveMatch, consecutiveMatch);
  }
}
