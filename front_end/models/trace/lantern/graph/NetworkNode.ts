// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {BaseNode} from './BaseNode.js';
import type * as Lantern from '../types/types.js';

const NON_NETWORK_SCHEMES = [
  'blob',        // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  'data',        // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  'intent',      // @see https://developer.chrome.com/docs/multidevice/android/intents/
  'file',        // @see https://en.wikipedia.org/wiki/File_URI_scheme
  'filesystem',  // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
  'chrome-extension',
];

/**
 * Note: the `protocol` field from CDP can be 'h2', 'http', (not 'https'!) or it'll be url's scheme.
 *   https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/protocol/network_handler.cc;l=598-611;drc=56d4a9a9deb30be73adcee8737c73bcb2a5ab64f
 * However, a `new URL(href).protocol` has a colon suffix.
 *   https://url.spec.whatwg.org/#dom-url-protocol
 * A URL's `scheme` is specced as the `protocol` sans-colon, but isn't exposed on a URL object.
 * This method can take all 3 of these string types as a parameter.
 *
 * @param protocol Either a networkRequest's `protocol` per CDP or a `new URL(href).protocol`
 */
function isNonNetworkProtocol(protocol: string): boolean {
  // Strip off any colon
  const urlScheme = protocol.includes(':') ? protocol.slice(0, protocol.indexOf(':')) : protocol;
  return NON_NETWORK_SCHEMES.includes(urlScheme);
}

class NetworkNode<T = Lantern.AnyNetworkObject> extends BaseNode<T> {
  _request: Lantern.NetworkRequest<T>;

  constructor(networkRequest: Lantern.NetworkRequest<T>) {
    super(networkRequest.requestId);
    this._request = networkRequest;
  }

  override get type(): 'network' {
    return BaseNode.types.NETWORK;
  }

  override get startTime(): number {
    return this._request.rendererStartTime * 1000;
  }

  override get endTime(): number {
    return this._request.networkEndTime * 1000;
  }

  get rawRequest(): Readonly<T> {
    return this._request.rawRequest as Required<T>;
  }

  get request(): Lantern.NetworkRequest<T> {
    return this._request;
  }

  get initiatorType(): string {
    return this._request.initiator && this._request.initiator.type;
  }

  get fromDiskCache(): boolean {
    return Boolean(this._request.fromDiskCache);
  }

  get isNonNetworkProtocol(): boolean {
    // The 'protocol' field in devtools a string more like a `scheme`
    return isNonNetworkProtocol(this.request.protocol) ||
        // But `protocol` can fail to be populated if the request fails, so fallback to scheme.
        isNonNetworkProtocol(this.request.parsedURL.scheme);
  }

  /**
   * Returns whether this network request can be downloaded without a TCP connection.
   * During simulation we treat data coming in over a network connection separately from on-device data.
   */
  get isConnectionless(): boolean {
    return this.fromDiskCache || this.isNonNetworkProtocol;
  }

  hasRenderBlockingPriority(): boolean {
    const priority = this._request.priority;
    const isScript = this._request.resourceType === 'Script';
    const isDocument = this._request.resourceType === 'Document';
    const isBlockingScript = priority === 'High' && isScript;
    const isBlockingHtmlImport = priority === 'High' && isDocument;
    return priority === 'VeryHigh' || isBlockingScript || isBlockingHtmlImport;
  }

  override cloneWithoutRelationships(): NetworkNode<T> {
    const node = new NetworkNode(this._request);
    node.setIsMainDocument(this._isMainDocument);
    return node;
  }
}

export {NetworkNode};
