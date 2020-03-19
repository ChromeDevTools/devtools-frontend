// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import {LoadNetworkResourceResult} from './InspectorFrontendHostAPI.js';  // eslint-disable-line no-unused-vars

export const ResourceLoader = {};

let _lastStreamId = 0;

/** @type {!Object.<number, !Common.StringOutputStream.OutputStream>} */
const _boundStreams = {};

/**
 * @param {!Common.StringOutputStream.OutputStream} stream
 * @return {number}
 */
const _bindOutputStream = function(stream) {
  _boundStreams[++_lastStreamId] = stream;
  return _lastStreamId;
};

/**
 * @param {number} id
 */
const _discardOutputStream = function(id) {
  _boundStreams[id].close();
  delete _boundStreams[id];
};

/**
 * @param {number} id
 * @param {string} chunk
 */
export const streamWrite = function(id, chunk) {
  _boundStreams[id].write(chunk);
};

/** @typedef
{{
    statusCode: number,
    netError: (number|undefined),
    netErrorName: (string|undefined),
    urlValid: (boolean|undefined),
    message: (string|undefined)
}} */
// @ts-ignore typedef.
export let LoadErrorDescription;

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {function(boolean, !Object.<string, string>, string, !LoadErrorDescription):void} callback
 */
export let load = function(url, headers, callback) {
  const stream = new Common.StringOutputStream.StringOutputStream();
  loadAsStream(url, headers, stream, mycallback);

  /**
   * @param {boolean} success
   * @param {!Object.<string, string>} headers
   * @param {!LoadErrorDescription} errorDescription
   */
  function mycallback(success, headers, errorDescription) {
    callback(success, headers, stream.data(), errorDescription);
  }
};

/**
 * @param {function(string, ?Object<string, string>, function(boolean, !Object<string, string>, string, !LoadErrorDescription): void): void} newLoad
 */
export function setLoadForTest(newLoad) {
  load = newLoad;
}

/**
 * @param {number} netError
 * Keep this function in sync with `net_error_list.h` on the Chromium side.
 * @returns {string}
 */
function getNetErrorCategory(netError) {
  if (netError > -100) {
    return ls`System error`;
  }
  if (netError > -200) {
    return ls`Connection error`;
  }
  if (netError > -300) {
    return ls`Certificate error`;
  }
  if (netError > -400) {
    return ls`HTTP error`;
  }
  if (netError > -500) {
    return ls`Cache error`;
  }
  if (netError > -600) {
    return ls`Signed Exchange error`;
  }
  if (netError > -700) {
    return ls`FTP error`;
  }
  if (netError > -800) {
    return ls`Certificate manager error`;
  }
  if (netError > -900) {
    return ls`DNS resolver error`;
  }
  return ls`Unknown error`;
}

/**
 * @param {number} netError
 * @returns {boolean}
 */
function isHTTPError(netError) {
  return netError <= -300 && netError > -400;
}

/**
 * @param {!LoadNetworkResourceResult} response
 * @returns {!{success:boolean, description: !LoadErrorDescription}}
 */
function createErrorMessageFromResponse(response) {
  const {statusCode, netError, netErrorName, urlValid, messageOverride} = response;
  let message = '';
  const success = statusCode >= 200 && statusCode < 300;
  if (typeof messageOverride === 'string') {
    message = messageOverride;
  } else if (!success) {
    if (typeof netError === 'undefined') {
      if (urlValid === false) {
        message = ls`Invalid URL`;
      } else {
        message = ls`Unknown error`;
      }
    } else {
      if (netError !== 0) {
        if (isHTTPError(netError)) {
          message += ls`HTTP error: status code ${statusCode}, ${netErrorName}`;
        } else {
          const errorCategory = getNetErrorCategory(netError);
          // We don't localize here, as `errorCategory` is already localized,
          // and `netErrorName` is an error code like 'net::ERR_CERT_AUTHORITY_INVALID'.
          message = `${errorCategory}: ${netErrorName}`;
        }
      }
    }
  }
  console.assert(success === (message.length === 0));
  return {success, description: {statusCode, netError, netErrorName, urlValid, message}};
}

/**
 * @param {string} url
 * @return {!Promise<string>}
 */
const loadXHR = url => {
  return new Promise((successCallback, failureCallback) => {
    function onReadyStateChanged() {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }
      if (xhr.status !== 200) {
        xhr.onreadystatechange = null;
        failureCallback(new Error(String(xhr.status)));
        return;
      }
      xhr.onreadystatechange = null;
      successCallback(xhr.responseText);
    }

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = false;
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onReadyStateChanged;
    xhr.send(null);
  });
};

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {!Common.StringOutputStream.OutputStream} stream
 * @param {function(boolean, !Object.<string, string>, !LoadErrorDescription)=} callback
 */
export const loadAsStream = function(url, headers, stream, callback) {
  const streamId = _bindOutputStream(stream);
  const parsedURL = new Common.ParsedURL.ParsedURL(url);
  if (parsedURL.isDataURL()) {
    loadXHR(url).then(dataURLDecodeSuccessful).catch(dataURLDecodeFailed);
    return;
  }

  const rawHeaders = [];
  if (headers) {
    for (const key in headers) {
      rawHeaders.push(key + ': ' + headers[key]);
    }
  }
  InspectorFrontendHostInstance.loadNetworkResource(url, rawHeaders.join('\r\n'), streamId, finishedCallback);

  /**
   * @param {!LoadNetworkResourceResult} response
   */
  function finishedCallback(response) {
    if (callback) {
      const {success, description} = createErrorMessageFromResponse(response);
      callback(success, response.headers || {}, description);
    }
    _discardOutputStream(streamId);
  }

  /**
   * @param {string} text
   */
  function dataURLDecodeSuccessful(text) {
    streamWrite(streamId, text);
    finishedCallback(/** @type {!LoadNetworkResourceResult} */ ({statusCode: 200}));
  }

  /**
   * @param {*} xhrStatus
   */
  function dataURLDecodeFailed(xhrStatus) {
    const messageOverride = ls`Decoding Data URL failed`;
    finishedCallback(
        /** @type {!LoadNetworkResourceResult} */ ({statusCode: 404, messageOverride}));
  }
};
