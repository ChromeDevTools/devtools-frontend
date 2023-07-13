// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

declare class AnchorBox {
  x: number;
  y: number;
  width: number;
  height: number;
  constructor(x: number, y: number, width: number, height: number);
  contains(x: number, y: number): boolean;
  relativeToElement(element: Element): AnchorBox;
}

declare namespace Adb {
  interface Page {
    id: string;
    name: string;
    url: string;
    attached: boolean;
  }
  interface Browser {
    id: string;
    adbBrowserChromeVersion: string;
    compatibleVersion: boolean;
    adbBrowsername: string;
    source: string;
    adbBrowserVersion: string;
    pages: Page[];
  }
  interface Device {
    id: string;
    adbModel: string;
    adbSerial: string;
    browsers: Browser[];
    adbPortStatus: number[];
    adbConnected: boolean;
  }
  interface PortForwardingConfig {
    [field: string]: string;
  }
  interface PortForwardingRule {
    port: string;
    address: string;
  }
  interface DevicePortForwardingStatus {
    ports: {[port: string]: number};
    browserId: string;
  }
  interface PortForwardingStatus {
    [field: string]: DevicePortForwardingStatus;
  }
  interface Config {
    discoverUsbDevices: boolean;
    portForwardingEnabled: boolean;
    portForwardingConfig: PortForwardingConfig;
    networkDiscoveryEnabled: boolean;
    networkDiscoveryConfig: NetworkDiscoveryConfig;
  }
  type NetworkDiscoveryConfig = string[];
}

interface HTMLElement {
  createChild(tagName: string, className?: string, content?: string): HTMLElement;
}

interface Element {
  boxInWindow(targetWindow?: Window): AnchorBox;
  createChild(tagName: string, className?: string, content?: string): Element;
  hasFocus(): boolean;
  positionAt(x: (number|undefined), y: (number|undefined), relativeTo?: Element): void;
  removeChildren(): void;
  scrollIntoViewIfNeeded(center?: boolean): void;
}

interface DocumentFragment {
  createChild(tagName: string, className?: string, content?: string): Element;
}

interface Event {
  consume(preventDefault?: boolean): void;
  handled: boolean|undefined;
  isMetaOrCtrlForTest: boolean;
}

interface Node {
  enclosingNodeOrSelfWithClass(className: string, stayWithin?: Element): Element;
  getComponentRoot(): Document|DocumentFragment|null;
  getComponentSelection(): Selection|null;
  hasSelection(): boolean;
  isAncestor(node: Node|null): boolean;
  isDescendant(node: Node|null): boolean;
  isSelfOrAncestor(node: Node|null): boolean;
  isSelfOrDescendant(node: Node|null): boolean;
  parentElementOrShadowHost(): Element|null;
  parentNodeOrShadowHost(): Node|null;
  setTextContentTruncatedIfNeeded(text: any, placeholder?: string): boolean;
  traverseNextNode(stayWithin?: Node): Node|null;
  traversePreviousNode(stayWithin?: Node): Node|null;
  deepTextContent(): string
  window(): Window;
  childTextNodes(): Node[];
  __widget?: any;
  __widgetCounter?: number|null;
}

declare function onInvokeElement(element: Element, callback: (event: Event) => void): void;

// The following types exist in Chrome but were removed for various reasons
// from the TypeScript DOM library.
//
// TODO(crbug.com/1247609): Replace use sites with appropriate web platform types.

interface DOMError {
  readonly name: string;
  readonly message: string;
}

interface ShadowRoot {
  elementFromPoint(x: number, y: number): Element|null;
  getSelection(): Selection|null;
}

interface HTMLDialogElement {
  open: boolean;
  returnValue: string;

  close(returnValue?: string): void;
  show(): void;
  showModal(): void;
}
