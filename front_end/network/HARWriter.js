/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008, 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

Network.HARWriter = class {
  /**
   * @param {!Common.OutputStream} stream
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Common.Progress} progress
   * @return {!Promise}
   */
  static async write(stream, requests, progress) {
    var compositeProgress = new Common.CompositeProgress(progress);

    var content = await Network.HARWriter._harStringForRequests(requests, compositeProgress);
    if (progress.isCanceled())
      return Promise.resolve();
    return Network.HARWriter._writeToStream(stream, compositeProgress, content);
  }

  /**
   * @param {!Array<!SDK.NetworkRequest>} requests
   * @param {!Common.CompositeProgress} compositeProgress
   * @return {!Promise<string>}
   */
  static async _harStringForRequests(requests, compositeProgress) {
    var progress = compositeProgress.createSubProgress();
    progress.setTitle(Common.UIString('Collecting content\u2026'));
    progress.setTotalWork(requests.length);

    var harLog = (new NetworkLog.HARLog(requests)).build();

    var promises = [];
    for (var i = 0; i < requests.length; i++) {
      var promise = requests[i].contentData();
      promises.push(promise.then(contentLoaded.bind(null, harLog.entries[i])));
    }

    await Promise.all(promises);
    progress.done();

    if (progress.isCanceled())
      return '';
    return JSON.stringify({log: harLog}, null, Network.HARWriter._jsonIndent);

    /**
     * @param {!Object} entry
     * @param {!SDK.NetworkRequest.ContentData} contentData
     */
    function contentLoaded(entry, contentData) {
      progress.worked();
      if (contentData.content !== null)
        entry.response.content.text = contentData.content;
      if (contentData.encoded)
        entry.response.content.encoding = 'base64';
    }
  }

  /**
   * @param {!Common.OutputStream} stream
   * @param {!Common.CompositeProgress} compositeProgress
   * @param {string} fileContent
   * @return {!Promise}
   */
  static async _writeToStream(stream, compositeProgress, fileContent) {
    var progress = compositeProgress.createSubProgress();
    progress.setTitle(Common.UIString('Writing file\u2026'));
    progress.setTotalWork(fileContent.length);
    for (var i = 0; i < fileContent.length && !progress.isCanceled(); i += Network.HARWriter._chunkSize) {
      var chunk = fileContent.substr(i, Network.HARWriter._chunkSize);
      await stream.write(chunk);
      progress.worked(chunk.length);
    }
    progress.done();
  }
};

/** @const */
Network.HARWriter._jsonIndent = 2;

/** @const */
Network.HARWriter._chunkSize = 100000;
