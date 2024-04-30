import { Browser, Page } from 'puppeteer';
import * as lighthouse from 'lighthouse';

type ExcludeType<T, U> = {
    [K in keyof T]-?: T[K] extends U ? K : never;
}[keyof T];
type PickType<T, U> = Pick<T, ExcludeType<T, U>>;
type JSONValue = null | string | number | boolean | JSONObject | JSONArray;
interface JSONObject {
    [key: string]: JSONValue;
}
type JSONArray = JSONValue[];
type JSONSerializable<Object extends object> = PickType<Object, JSONValue>;

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

type Target = string;
type Pattern = string;
type Selector = string | string[];
type FrameSelector = number[];
declare enum SelectorType {
    CSS = "css",
    ARIA = "aria",
    Text = "text",
    XPath = "xpath",
    Pierce = "pierce"
}
declare enum StepType {
    Change = "change",
    Click = "click",
    Close = "close",
    CustomStep = "customStep",
    DoubleClick = "doubleClick",
    EmulateNetworkConditions = "emulateNetworkConditions",
    Hover = "hover",
    KeyDown = "keyDown",
    KeyUp = "keyUp",
    Navigate = "navigate",
    Scroll = "scroll",
    SetViewport = "setViewport",
    WaitForElement = "waitForElement",
    WaitForExpression = "waitForExpression"
}
declare enum AssertedEventType {
    Navigation = "navigation"
}
interface NavigationEvent {
    type: AssertedEventType.Navigation;
    url?: Pattern;
    title?: Pattern;
}
type AssertedEvent = NavigationEvent;
interface BaseStep {
    type: StepType;
    timeout?: number;
    assertedEvents?: AssertedEvent[];
}
interface StepWithTarget extends BaseStep {
    /**
     * Defaults to main
     */
    target?: Target;
}
interface StepWithFrame extends StepWithTarget {
    /**
     * Defaults to main frame
     */
    frame?: FrameSelector;
}
interface StepWithSelectors extends StepWithFrame {
    /**
     * A list of alternative selectors that lead to selection of a single element
     * to perform the step on. Currently, we support CSS selectors, ARIA selectors
     * (start with 'aria/'), XPath selectors (start with `xpath/`) and text
     * selectors (start with `text/`). Each selector could be a string or an array
     * of strings. If it's a string, it means that the selector points directly to
     * the target element. If it's an array, the last element is the selector for
     * the target element and the preceding selectors point to the ancestor
     * elements. If the parent element is a shadow root host, the subsequent
     * selector is evaluated only against the shadow DOM of the host (i.e.,
     * `parent.shadowRoot.querySelector`). If the parent element is not a shadow
     * root host, the subsequent selector is evaluated in the regular DOM (i.e.,
     * `parent.querySelector`).
     *
     * During the execution, it's recommended that the implementation tries out
     * all of the alternative selectors to improve reliability of the replay as
     * some selectors might get outdated over time.
     */
    selectors: Selector[];
}
type PointerDeviceType = 'mouse' | 'pen' | 'touch';
type PointerButtonType = 'primary' | 'auxiliary' | 'secondary' | 'back' | 'forward';
interface ClickAttributes {
    /**
     * Pointer type for the event. Defaults to 'mouse'.
     */
    deviceType?: PointerDeviceType;
    /**
     * Defaults to 'primary' if the device type is a mouse.
     */
    button?: PointerButtonType;
    /**
     * in px, relative to the top-left corner of the element content box. Defaults
     * to the center of the element
     */
    offsetX: number;
    /**
     * in px, relative to the top-left corner of the element content box. Defaults
     * to the center of the element
     */
    offsetY: number;
    /**
     * Delay (in ms) between the mouse up and mouse down of the click.
     *
     * @defaultValue `50`
     */
    duration?: number;
}
interface DoubleClickStep extends ClickAttributes, StepWithSelectors {
    type: StepType.DoubleClick;
}
interface ClickStep extends ClickAttributes, StepWithSelectors {
    type: StepType.Click;
}
interface HoverStep extends StepWithSelectors {
    type: StepType.Hover;
}
interface ChangeStep extends StepWithSelectors {
    type: StepType.Change;
    value: string;
}
interface EmulateNetworkConditionsStep extends StepWithTarget {
    type: StepType.EmulateNetworkConditions;
    download: number;
    upload: number;
    latency: number;
}
interface KeyDownStep extends StepWithTarget {
    type: StepType.KeyDown;
    key: Key;
}
interface KeyUpStep extends StepWithTarget {
    type: StepType.KeyUp;
    key: Key;
}
interface CloseStep extends StepWithTarget {
    type: StepType.Close;
}
interface SetViewportStep extends StepWithTarget {
    type: StepType.SetViewport;
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    isLandscape: boolean;
}
interface ScrollPageStep extends StepWithFrame {
    type: StepType.Scroll;
    /**
     * Absolute scroll x position in px. Defaults to 0
     */
    x?: number;
    /**
     * Absolute scroll y position in px. Defaults to 0
     */
    y?: number;
}
type ScrollElementStep = ScrollPageStep & StepWithSelectors;
type ScrollStep = ScrollPageStep | ScrollElementStep;
interface NavigateStep extends StepWithTarget {
    type: StepType.Navigate;
    url: string;
}
interface CustomStepParams {
    type: StepType.CustomStep;
    name: string;
    parameters: unknown;
}
type CustomStep = (CustomStepParams & StepWithTarget) | (CustomStepParams & StepWithFrame);
type UserStep = ChangeStep | ClickStep | HoverStep | CloseStep | CustomStep | DoubleClickStep | EmulateNetworkConditionsStep | KeyDownStep | KeyUpStep | NavigateStep | ScrollStep | SetViewportStep;
/**
 * `waitForElement` allows waiting for the presence (or absence) of the number
 * of elements identified by the selector.
 *
 * For example, the following step would wait for less than three elements
 * to be on the page that match the selector `.my-class`.
 *
 * ```
 * {
 *   "type": "waitForElement",
 *   "selectors": [".my-class"],
 *   "operator": "<=",
 *   "count": 2,
 * }
 * ```
 */
interface WaitForElementStep extends StepWithSelectors {
    type: StepType.WaitForElement;
    /**
     * @defaultValue `'=='`
     */
    operator?: '>=' | '==' | '<=';
    /**
     * @defaultValue `1`
     */
    count?: number;
    /**
     * Whether to wait for elements matching this step to be hidden. This can be
     * thought of as an inversion of this step.
     *
     * @defaultValue `true`
     */
    visible?: boolean;
    /**
     * Whether to also check the element(s) for the given properties.
     */
    properties?: Partial<JSONSerializable<HTMLElement>> & {
        [key: string]: JSONValue;
    };
    /**
     * Whether to also check the element(s) for the given attributes.
     */
    attributes?: {
        [name: string]: string;
    };
}
/**
 * `waitForExpression` allows for a JavaScript expression to resolve to truthy
 * value.
 *
 * For example, the following step pauses for two seconds and then resolves to
 * true allowing the replay to continue.
 *
 * ```
 * {
 *   "type": "waitForExpression",
 *   "expression": "new Promise(resolve => setTimeout(() => resolve(true),
 * 2000))",
 * }
 * ```
 */
interface WaitForExpressionStep extends StepWithFrame {
    type: StepType.WaitForExpression;
    expression: string;
}
type AssertionStep = WaitForElementStep | WaitForExpressionStep;
type Step = UserStep | AssertionStep;
interface UserFlow {
    /**
     * Human-readble title describing the recorder user flow.
     */
    title: string;
    /**
     * Timeout in milliseconds.
     */
    timeout?: number;
    /**
     * The name of the attribute to use to generate selectors instead of regular
     * CSS selectors. For example, specifying `data-testid` would generate the
     * selector `[data-testid=value]` for the element `<div data-testid=value>`.
     */
    selectorAttribute?: string;
    steps: Step[];
}
type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'Power' | 'Eject' | 'Abort' | 'Help' | 'Backspace' | 'Tab' | 'Numpad5' | 'NumpadEnter' | 'Enter' | '\r' | '\n' | 'ShiftLeft' | 'ShiftRight' | 'ControlLeft' | 'ControlRight' | 'AltLeft' | 'AltRight' | 'Pause' | 'CapsLock' | 'Escape' | 'Convert' | 'NonConvert' | 'Space' | 'Numpad9' | 'PageUp' | 'Numpad3' | 'PageDown' | 'End' | 'Numpad1' | 'Home' | 'Numpad7' | 'ArrowLeft' | 'Numpad4' | 'Numpad8' | 'ArrowUp' | 'ArrowRight' | 'Numpad6' | 'Numpad2' | 'ArrowDown' | 'Select' | 'Open' | 'PrintScreen' | 'Insert' | 'Numpad0' | 'Delete' | 'NumpadDecimal' | 'Digit0' | 'Digit1' | 'Digit2' | 'Digit3' | 'Digit4' | 'Digit5' | 'Digit6' | 'Digit7' | 'Digit8' | 'Digit9' | 'KeyA' | 'KeyB' | 'KeyC' | 'KeyD' | 'KeyE' | 'KeyF' | 'KeyG' | 'KeyH' | 'KeyI' | 'KeyJ' | 'KeyK' | 'KeyL' | 'KeyM' | 'KeyN' | 'KeyO' | 'KeyP' | 'KeyQ' | 'KeyR' | 'KeyS' | 'KeyT' | 'KeyU' | 'KeyV' | 'KeyW' | 'KeyX' | 'KeyY' | 'KeyZ' | 'MetaLeft' | 'MetaRight' | 'ContextMenu' | 'NumpadMultiply' | 'NumpadAdd' | 'NumpadSubtract' | 'NumpadDivide' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18' | 'F19' | 'F20' | 'F21' | 'F22' | 'F23' | 'F24' | 'NumLock' | 'ScrollLock' | 'AudioVolumeMute' | 'AudioVolumeDown' | 'AudioVolumeUp' | 'MediaTrackNext' | 'MediaTrackPrevious' | 'MediaStop' | 'MediaPlayPause' | 'Semicolon' | 'Equal' | 'NumpadEqual' | 'Comma' | 'Minus' | 'Period' | 'Slash' | 'Backquote' | 'BracketLeft' | 'Backslash' | 'BracketRight' | 'Quote' | 'AltGraph' | 'Props' | 'Cancel' | 'Clear' | 'Shift' | 'Control' | 'Alt' | 'Accept' | 'ModeChange' | ' ' | 'Print' | 'Execute' | '\u0000' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z' | 'Meta' | '*' | '+' | '-' | '/' | ';' | '=' | ',' | '.' | '`' | '[' | '\\' | ']' | "'" | 'Attn' | 'CrSel' | 'ExSel' | 'EraseEof' | 'Play' | 'ZoomOut' | ')' | '!' | '@' | '#' | '$' | '%' | '^' | '&' | '(' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z' | ':' | '<' | '_' | '>' | '?' | '~' | '{' | '|' | '}' | '"' | 'SoftLeft' | 'SoftRight' | 'Camera' | 'Call' | 'EndCall' | 'VolumeDown' | 'VolumeUp';

type Schema_AssertedEvent = AssertedEvent;
type Schema_AssertedEventType = AssertedEventType;
declare const Schema_AssertedEventType: typeof AssertedEventType;
type Schema_AssertionStep = AssertionStep;
type Schema_BaseStep = BaseStep;
type Schema_ChangeStep = ChangeStep;
type Schema_ClickAttributes = ClickAttributes;
type Schema_ClickStep = ClickStep;
type Schema_CloseStep = CloseStep;
type Schema_CustomStep = CustomStep;
type Schema_CustomStepParams = CustomStepParams;
type Schema_DoubleClickStep = DoubleClickStep;
type Schema_EmulateNetworkConditionsStep = EmulateNetworkConditionsStep;
type Schema_FrameSelector = FrameSelector;
type Schema_HoverStep = HoverStep;
type Schema_Key = Key;
type Schema_KeyDownStep = KeyDownStep;
type Schema_KeyUpStep = KeyUpStep;
type Schema_NavigateStep = NavigateStep;
type Schema_NavigationEvent = NavigationEvent;
type Schema_Pattern = Pattern;
type Schema_PointerButtonType = PointerButtonType;
type Schema_PointerDeviceType = PointerDeviceType;
type Schema_ScrollElementStep = ScrollElementStep;
type Schema_ScrollPageStep = ScrollPageStep;
type Schema_ScrollStep = ScrollStep;
type Schema_Selector = Selector;
type Schema_SelectorType = SelectorType;
declare const Schema_SelectorType: typeof SelectorType;
type Schema_SetViewportStep = SetViewportStep;
type Schema_Step = Step;
type Schema_StepType = StepType;
declare const Schema_StepType: typeof StepType;
type Schema_StepWithFrame = StepWithFrame;
type Schema_StepWithSelectors = StepWithSelectors;
type Schema_StepWithTarget = StepWithTarget;
type Schema_Target = Target;
type Schema_UserFlow = UserFlow;
type Schema_UserStep = UserStep;
type Schema_WaitForElementStep = WaitForElementStep;
type Schema_WaitForExpressionStep = WaitForExpressionStep;
declare namespace Schema {
  export { type Schema_AssertedEvent as AssertedEvent, Schema_AssertedEventType as AssertedEventType, type Schema_AssertionStep as AssertionStep, type Schema_BaseStep as BaseStep, type Schema_ChangeStep as ChangeStep, type Schema_ClickAttributes as ClickAttributes, type Schema_ClickStep as ClickStep, type Schema_CloseStep as CloseStep, type Schema_CustomStep as CustomStep, type Schema_CustomStepParams as CustomStepParams, type Schema_DoubleClickStep as DoubleClickStep, type Schema_EmulateNetworkConditionsStep as EmulateNetworkConditionsStep, type Schema_FrameSelector as FrameSelector, type Schema_HoverStep as HoverStep, type Schema_Key as Key, type Schema_KeyDownStep as KeyDownStep, type Schema_KeyUpStep as KeyUpStep, type Schema_NavigateStep as NavigateStep, type Schema_NavigationEvent as NavigationEvent, type Schema_Pattern as Pattern, type Schema_PointerButtonType as PointerButtonType, type Schema_PointerDeviceType as PointerDeviceType, type Schema_ScrollElementStep as ScrollElementStep, type Schema_ScrollPageStep as ScrollPageStep, type Schema_ScrollStep as ScrollStep, type Schema_Selector as Selector, Schema_SelectorType as SelectorType, type Schema_SetViewportStep as SetViewportStep, type Schema_Step as Step, Schema_StepType as StepType, type Schema_StepWithFrame as StepWithFrame, type Schema_StepWithSelectors as StepWithSelectors, type Schema_StepWithTarget as StepWithTarget, type Schema_Target as Target, type Schema_UserFlow as UserFlow, type Schema_UserStep as UserStep, type Schema_WaitForElementStep as WaitForElementStep, type Schema_WaitForExpressionStep as WaitForExpressionStep };
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare function assertAllStepTypesAreHandled(s: never): never;
declare const typeableInputTypes: ReadonlySet<string>;
declare const pointerDeviceTypes: ReadonlySet<string>;
declare const mouseButtonMap: ReadonlyMap<string, 'left' | 'middle' | 'right' | 'back' | 'forward'>;
declare function parseStep(step: unknown, idx?: number): Step;
declare const minTimeout = 1;
declare const maxTimeout = 30000;
declare function validTimeout(timeout: number): boolean;
declare function parse(data: unknown): UserFlow;
/**
 * Detects what type of a selector the string contains. For example,
 * `aria/Label` is a SelectorType.ARIA.
 *
 * Note that CSS selectors are special and usually don't require a prefix,
 * therefore, SelectorType.CSS is the default type if other types didn't match.
 */
declare function getSelectorType(selector: string): SelectorType;
/**
 * Converts a selector or an array of selector parts into a Puppeteer selector.
 *
 * @see https://pptr.dev/guides/query-selectors#p-elements
 */
declare function selectorToPElementSelector(selector: string[] | string): string;

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
interface LineWriter {
    appendLine(line: string): LineWriter;
    startBlock(): LineWriter;
    endBlock(): LineWriter;
    getIndent(): string;
    getSize(): number;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class StringifyExtension {
    beforeAllSteps?(out: LineWriter, flow: UserFlow): Promise<void>;
    afterAllSteps?(out: LineWriter, flow: UserFlow): Promise<void>;
    beforeEachStep?(out: LineWriter, step: Step, flow?: UserFlow): Promise<void>;
    stringifyStep(out: LineWriter, step: Step, flow?: UserFlow): Promise<void>;
    afterEachStep?(out: LineWriter, step: Step, flow?: UserFlow): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

/**
 * Stringifies a user flow to JSON with source maps.
 *
 * You probably want to strip the source map because not all
 * parsers support comments in JSON.
 */
declare class JSONStringifyExtension extends StringifyExtension {
    beforeAllSteps(out: LineWriter, flow: UserFlow): Promise<void>;
    afterAllSteps(out: LineWriter): Promise<void>;
    stringifyStep(out: LineWriter, step: Step, flow?: UserFlow): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

interface StringifyOptions {
    extension?: StringifyExtension;
    writer?: LineWriter;
    indentation?: string;
}
/**
 * The format is [version, [lineNo, length], [lineNo, length] ... [lineNo, length]].
 */
type SourceMap = Array<number>;
/**
 * Stringifes an entire recording. The following hooks are invoked with the `flow` parameter containing the entire flow:
 * - `beforeAllSteps` (once)
 * - `beforeEachStep` (per step)
 * - `stringifyStep` (per step)
 * - `afterEachStep` (per step)
 * - `afterAllSteps` (once)
 */
declare function stringify(flow: UserFlow, opts?: StringifyOptions): Promise<string>;
/**
 * Stringifes a single step. Only the following hooks are invoked with the `flow` parameter as undefined:
 * - `beforeEachStep`
 * - `stringifyStep`
 * - `afterEachStep`
 */
declare function stringifyStep(step: Step, opts?: StringifyOptions): Promise<string>;
/**
 * Extracts a source map from a text.
 */
declare function parseSourceMap(text: string): SourceMap | undefined;
declare function stripSourceMap(text: string): string;

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class RunnerExtension {
    beforeAllSteps?(flow?: UserFlow): Promise<void>;
    afterAllSteps?(flow?: UserFlow): Promise<void>;
    beforeEachStep?(step: Step, flow?: UserFlow): Promise<void>;
    runStep(step: Step, flow?: UserFlow): Promise<void>;
    afterEachStep?(step: Step, flow?: UserFlow): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class Runner {
    #private;
    abort(): void;
    set flow(flow: UserFlow);
    runBeforeAllSteps(flow?: UserFlow): Promise<void>;
    runAfterAllSteps(flow?: UserFlow): Promise<void>;
    /**
     * Runs the provided `step` with `beforeEachStep` and `afterEachStep` hooks.
     * Parameters from the `flow` apply if the `flow` is set.
     */
    runStep(step: Step): Promise<void>;
    /**
     * Run all the steps in the flow
     * @returns whether all the steps are run or the execution is aborted
     */
    run(): Promise<boolean>;
}
declare function createRunner(): Promise<Runner>;
declare function createRunner(flow: UserFlow): Promise<Runner>;
declare function createRunner(extension: RunnerExtension): Promise<Runner>;
declare function createRunner(flow: UserFlow, extension: RunnerExtension): Promise<Runner>;

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class PuppeteerRunnerExtension extends RunnerExtension {
    #private;
    protected browser: Browser;
    protected page: Page;
    protected timeout: number;
    constructor(browser: Browser, page: Page, opts?: {
        timeout?: number;
    });
    runStep(step: Step, flow?: UserFlow): Promise<void>;
}
declare class PuppeteerRunnerOwningBrowserExtension extends PuppeteerRunnerExtension {
    afterAllSteps(): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class PuppeteerStringifyExtension extends StringifyExtension {
    #private;
    beforeAllSteps(out: LineWriter, flow: UserFlow): Promise<void>;
    afterAllSteps(out: LineWriter, flow: UserFlow): Promise<void>;
    stringifyStep(out: LineWriter, step: Step, flow: UserFlow): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

/**
 * Stringifies a user flow to a script that uses \@puppeteer/replay's own API.
 */
declare class PuppeteerReplayStringifyExtension extends StringifyExtension {
    beforeAllSteps(out: LineWriter): Promise<void>;
    afterAllSteps(out: LineWriter): Promise<void>;
    stringifyStep(out: LineWriter, step: Step): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

declare class LighthouseStringifyExtension extends PuppeteerStringifyExtension {
    #private;
    beforeAllSteps(out: LineWriter, flow: UserFlow): Promise<void>;
    stringifyStep(out: LineWriter, step: Step, flow: UserFlow): Promise<void>;
    afterAllSteps(out: LineWriter, flow: UserFlow): Promise<void>;
}

declare class LighthouseRunnerExtension extends PuppeteerRunnerExtension {
    #private;
    createFlowResult(): Promise<lighthouse.FlowResult>;
    beforeAllSteps(flow: UserFlow): Promise<void>;
    beforeEachStep(step: Step, flow?: UserFlow): Promise<void>;
    afterEachStep(step: Step, flow?: UserFlow): Promise<void>;
    afterAllSteps(flow: UserFlow): Promise<void>;
}

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
/**
 * Copyright (c) 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
declare function formatJSONAsJS(json: unknown, indent: string): string;
declare const formatAsJSLiteral: (content: string) => string;

export { type AssertedEvent, AssertedEventType, type AssertionStep, type BaseStep, type ChangeStep, type ClickAttributes, type ClickStep, type CloseStep, type CustomStep, type CustomStepParams, type DoubleClickStep, type EmulateNetworkConditionsStep, type FrameSelector, type HoverStep, JSONStringifyExtension, type Key, type KeyDownStep, type KeyUpStep, LighthouseRunnerExtension, LighthouseStringifyExtension, type LineWriter, type NavigateStep, type NavigationEvent, type Pattern, type PointerButtonType, type PointerDeviceType, PuppeteerReplayStringifyExtension, PuppeteerRunnerExtension, PuppeteerRunnerOwningBrowserExtension, PuppeteerStringifyExtension, Runner, RunnerExtension, Schema, type ScrollElementStep, type ScrollPageStep, type ScrollStep, type Selector, SelectorType, type SetViewportStep, type SourceMap, type Step, StepType, type StepWithFrame, type StepWithSelectors, type StepWithTarget, StringifyExtension, type StringifyOptions, type Target, type UserFlow, type UserStep, type WaitForElementStep, type WaitForExpressionStep, assertAllStepTypesAreHandled, createRunner, formatAsJSLiteral, formatJSONAsJS, getSelectorType, maxTimeout, minTimeout, mouseButtonMap, parse, parseSourceMap, parseStep, pointerDeviceTypes, selectorToPElementSelector, stringify, stringifyStep, stripSourceMap, typeableInputTypes, validTimeout };
