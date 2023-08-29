/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="node" />
import { Protocol } from 'devtools-protocol';
import { AutofillData, ElementHandle, Point } from '../api/ElementHandle.js';
import { ScreenshotOptions } from '../api/Page.js';
import { CDPSession } from './Connection.js';
import { ExecutionContext } from './ExecutionContext.js';
import { Frame } from './Frame.js';
import { WaitForSelectorOptions } from './IsolatedWorld.js';
import { CDPJSHandle } from './JSHandle.js';
import { NodeFor } from './types.js';
/**
 * The CDPElementHandle extends ElementHandle now to keep compatibility
 * with `instanceof` because of that we need to have methods for
 * CDPJSHandle to in this implementation as well.
 *
 * @internal
 */
export declare class CDPElementHandle<ElementType extends Node = Element> extends ElementHandle<ElementType> {
    #private;
    handle: CDPJSHandle<ElementType>;
    constructor(context: ExecutionContext, remoteObject: Protocol.Runtime.RemoteObject, frame: Frame);
    /**
     * @internal
     */
    executionContext(): ExecutionContext;
    /**
     * @internal
     */
    get client(): CDPSession;
    remoteObject(): Protocol.Runtime.RemoteObject;
    get frame(): Frame;
    $<Selector extends string>(selector: Selector): Promise<CDPElementHandle<NodeFor<Selector>> | null>;
    $$<Selector extends string>(selector: Selector): Promise<Array<CDPElementHandle<NodeFor<Selector>>>>;
    waitForSelector<Selector extends string>(selector: Selector, options?: WaitForSelectorOptions): Promise<CDPElementHandle<NodeFor<Selector>> | null>;
    contentFrame(this: ElementHandle<HTMLIFrameElement>): Promise<Frame>;
    scrollIntoView(this: CDPElementHandle<Element>): Promise<void>;
    /**
     * This method creates and captures a dragevent from the element.
     */
    drag(this: CDPElementHandle<Element>, target: Point): Promise<Protocol.Input.DragData>;
    dragEnter(this: CDPElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    dragOver(this: CDPElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    drop(this: CDPElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    dragAndDrop(this: CDPElementHandle<Element>, target: CDPElementHandle<Node>, options?: {
        delay: number;
    }): Promise<void>;
    uploadFile(this: CDPElementHandle<HTMLInputElement>, ...filePaths: string[]): Promise<void>;
    screenshot(this: CDPElementHandle<Element>, options?: ScreenshotOptions): Promise<string | Buffer>;
    autofill(data: AutofillData): Promise<void>;
    assertElementHasWorld(): asserts this;
}
//# sourceMappingURL=ElementHandle.d.ts.map