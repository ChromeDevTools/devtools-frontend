// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Window {
  UI: {themeSupport: unknown}
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound<S>(object: S, comparator?: {(a: S, b: T): number}, left?: number, right?: number): number;
  upperBound<S>(object: S, comparator?: {(a: S, b: T): number}, left?: number, right?: number): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  compareTo(other: string): number;
  trimEndWithMaxLength(maxLength: number): string;
  escapeForRegExp(): string;
  filterRegex(query: string): RegExp;
  trimMiddle(maxLength: number): string;
}

interface NumberConstructor {
  withThousandsSeparator(num: number): string
}

interface Int32Array {
  lowerBound(object: number, comparator?: {(a: number, b: number): number}, left?: number, right?: number): number;
}

declare let ls: (template: ITemplateArray, ...args: any[]) => string;

declare namespace Runtime {
  const cachedResources: {[cachePath: string]: string};
}

declare class AnchorBox {
  x: number;
  y: number;
  width: number;
  height: number;
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

interface Document {
  deepActiveElement(): Element|null;
}

interface HTMLElement {
  createChild(tagName: string, className?: string, content?: string): HTMLElement;
  createSVGChild(childType: string, className?: string): HTMLElement;
}

interface Element {
  createChild(tagName: string, className?: string, content?: string): Element;
  createTextChild(text: string): Text;
  hasFocus(): boolean;
  positionAt(x: (number|undefined), y: (number|undefined), relativeTo?: Element): void;
  removeChildren(): void;
  scrollIntoViewIfNeeded(center?: boolean): void;
  totalOffsetTop(): number;
  totalOffsetLeft(): number;
}

interface DocumentFragment {
  createChild(tagName: string, className?: string, content?: string): Element;
}

interface Event {
  consume(preventDefault?: boolean): void;
  deepElementFromPoint(): Node|null;
}

interface Node {
  getComponentRoot(): Document|DocumentFragment|null;
  getComponentSelection(): Selection|null;
  hasSameShadowRoot(other: Node): boolean;
  isSelfOrAncestor(node: Node|null): boolean;
  isSelfOrDescendant(node: Node|null): boolean;
  parentElementOrShadowHost(): Element|null;
  parentNodeOrShadowHost(): Node|null;
  traverseNextNode(stayWithin?: Node): Node|null;
  enclosingNodeOrSelfWithClass(className: string, stayWithin?: Element): Element;
  window(): Window;
  hasSelection(): boolean;
}

declare function isEnterKey(event: Event): boolean;
declare function isEnterOrSpaceKey(event: Event): boolean;
declare function isEscKey(event: Event): boolean;
declare function createPlainTextSearchRegex(query: string, flags?: string): RegExp;
declare function onInvokeElement(element: Element, callback: (event: Event) => void): void;
