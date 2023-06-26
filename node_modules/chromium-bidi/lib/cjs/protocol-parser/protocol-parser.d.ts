/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
/**
 * @fileoverview Provides parsing and validator for WebDriver BiDi protocol.
 * Parser types should match the `../protocol` types.
 */
import { type ZodType, z as zod } from 'zod';
import { BrowsingContext as BrowsingContextTypes, Script as ScriptTypes, CDP as CdpTypes, type Session as SessionTypes, type CommonDataTypes as CommonDataTypesTypes, Input as InputTypes } from '../protocol/protocol.js';
export declare function parseObject<T extends ZodType>(obj: object, schema: T): zod.infer<T>;
export declare namespace CommonDataTypes {
    const SharedReferenceSchema: zod.ZodObject<{
        sharedId: zod.ZodString;
        handle: zod.ZodOptional<zod.ZodString>;
    }, "strip", zod.ZodTypeAny, {
        sharedId: string;
        handle?: string | undefined;
    }, {
        sharedId: string;
        handle?: string | undefined;
    }>;
    const RemoteReferenceSchema: zod.ZodObject<{
        handle: zod.ZodString;
    }, "strip", zod.ZodTypeAny, {
        handle: string;
    }, {
        handle: string;
    }>;
    const LocalValueSchema: zod.ZodType<CommonDataTypesTypes.LocalValue>;
    const BrowsingContextSchema: zod.ZodString;
    const MaxDepthSchema: zod.ZodNumber;
}
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
export declare namespace Script {
    const GetRealmsParametersSchema: zod.ZodObject<{
        context: zod.ZodOptional<zod.ZodString>;
        type: zod.ZodOptional<zod.ZodEnum<["window", "dedicated-worker", "shared-worker", "service-worker", "worker", "paint-worklet", "audio-worklet", "worklet"]>>;
    }, "strip", zod.ZodTypeAny, {
        context?: string | undefined;
        type?: "worker" | "window" | "dedicated-worker" | "shared-worker" | "service-worker" | "paint-worklet" | "audio-worklet" | "worklet" | undefined;
    }, {
        context?: string | undefined;
        type?: "worker" | "window" | "dedicated-worker" | "shared-worker" | "service-worker" | "paint-worklet" | "audio-worklet" | "worklet" | undefined;
    }>;
    function parseGetRealmsParams(params: object): ScriptTypes.GetRealmsParameters;
    function parseEvaluateParams(params: object): ScriptTypes.EvaluateParameters;
    function parseDisownParams(params: object): ScriptTypes.DisownParameters;
    const ChannelValueSchema: zod.ZodObject<{
        type: zod.ZodLiteral<"channel">;
        value: zod.ZodObject<{
            channel: zod.ZodString;
            serializationOptions: zod.ZodOptional<zod.ZodObject<{
                maxDomDepth: zod.ZodOptional<zod.ZodUnion<[zod.ZodNull, zod.ZodNumber]>>;
                maxObjectDepth: zod.ZodOptional<zod.ZodUnion<[zod.ZodNull, zod.ZodNumber]>>;
                includeShadowTree: zod.ZodOptional<zod.ZodEnum<["none", "open", "all"]>>;
            }, "strip", zod.ZodTypeAny, {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            }, {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            }>>;
            ownership: zod.ZodOptional<zod.ZodEnum<["root", "none"]>>;
        }, "strip", zod.ZodTypeAny, {
            channel: string;
            serializationOptions?: {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            } | undefined;
            ownership?: "none" | "root" | undefined;
        }, {
            channel: string;
            serializationOptions?: {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            } | undefined;
            ownership?: "none" | "root" | undefined;
        }>;
    }, "strip", zod.ZodTypeAny, {
        type: "channel";
        value: {
            channel: string;
            serializationOptions?: {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            } | undefined;
            ownership?: "none" | "root" | undefined;
        };
    }, {
        type: "channel";
        value: {
            channel: string;
            serializationOptions?: {
                maxDomDepth?: number | null | undefined;
                maxObjectDepth?: number | null | undefined;
                includeShadowTree?: "none" | "all" | "open" | undefined;
            } | undefined;
            ownership?: "none" | "root" | undefined;
        };
    }>;
    const PreloadScriptSchema: zod.ZodString;
    const AddPreloadScriptParametersSchema: zod.ZodObject<{
        functionDeclaration: zod.ZodString;
        arguments: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
            type: zod.ZodLiteral<"channel">;
            value: zod.ZodObject<{
                channel: zod.ZodString;
                serializationOptions: zod.ZodOptional<zod.ZodObject<{
                    maxDomDepth: zod.ZodOptional<zod.ZodUnion<[zod.ZodNull, zod.ZodNumber]>>;
                    maxObjectDepth: zod.ZodOptional<zod.ZodUnion<[zod.ZodNull, zod.ZodNumber]>>;
                    includeShadowTree: zod.ZodOptional<zod.ZodEnum<["none", "open", "all"]>>;
                }, "strip", zod.ZodTypeAny, {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                }, {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                }>>;
                ownership: zod.ZodOptional<zod.ZodEnum<["root", "none"]>>;
            }, "strip", zod.ZodTypeAny, {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            }, {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            }>;
        }, "strip", zod.ZodTypeAny, {
            type: "channel";
            value: {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            };
        }, {
            type: "channel";
            value: {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            };
        }>, "many">>;
        sandbox: zod.ZodOptional<zod.ZodString>;
        context: zod.ZodOptional<zod.ZodString>;
    }, "strip", zod.ZodTypeAny, {
        functionDeclaration: string;
        arguments?: {
            type: "channel";
            value: {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            };
        }[] | undefined;
        sandbox?: string | undefined;
        context?: string | undefined;
    }, {
        functionDeclaration: string;
        arguments?: {
            type: "channel";
            value: {
                channel: string;
                serializationOptions?: {
                    maxDomDepth?: number | null | undefined;
                    maxObjectDepth?: number | null | undefined;
                    includeShadowTree?: "none" | "all" | "open" | undefined;
                } | undefined;
                ownership?: "none" | "root" | undefined;
            };
        }[] | undefined;
        sandbox?: string | undefined;
        context?: string | undefined;
    }>;
    function parseAddPreloadScriptParams(params: object): ScriptTypes.AddPreloadScriptParameters;
    const RemovePreloadScriptParametersSchema: zod.ZodObject<{
        script: zod.ZodString;
    }, "strip", zod.ZodTypeAny, {
        script: string;
    }, {
        script: string;
    }>;
    function parseRemovePreloadScriptParams(params: object): ScriptTypes.RemovePreloadScriptParameters;
    function parseCallFunctionParams(params: object): ScriptTypes.CallFunctionParameters;
}
/** @see https://w3c.github.io/webdriver-bidi/#module-browsingContext */
export declare namespace BrowsingContext {
    function parseGetTreeParams(params: object): BrowsingContextTypes.GetTreeParameters;
    function parseNavigateParams(params: object): BrowsingContextTypes.NavigateParameters;
    function parseReloadParams(params: object): BrowsingContextTypes.ReloadParameters;
    function parseCreateParams(params: object): BrowsingContextTypes.CreateParameters;
    function parseCloseParams(params: object): BrowsingContextTypes.CloseParameters;
    function parseCaptureScreenshotParams(params: object): BrowsingContextTypes.CaptureScreenshotParameters;
    function parsePrintParams(params: object): BrowsingContextTypes.PrintParameters;
}
export declare namespace CDP {
    function parseSendCommandParams(params: object): CdpTypes.SendCommandParams;
    function parseGetSessionParams(params: object): CdpTypes.GetSessionParams;
}
/** @see https://w3c.github.io/webdriver-bidi/#module-session */
export declare namespace Session {
    function parseSubscribeParams(params: object): SessionTypes.SubscriptionRequest;
}
/** @see https://w3c.github.io/webdriver-bidi/#module-input */
export declare namespace Input {
    function parsePerformActionsParams(params: object): InputTypes.PerformActionsParameters;
    function parseReleaseActionsParams(params: object): InputTypes.ReleaseActionsParameters;
}
