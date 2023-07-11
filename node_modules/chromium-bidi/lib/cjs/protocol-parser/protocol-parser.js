"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = exports.Session = exports.Cdp = exports.BrowsingContext = exports.Script = exports.CommonDataTypes = exports.parseObject = void 0;
/**
 * @fileoverview Provides parsing and validator for WebDriver BiDi protocol.
 * Parser types should match the `../protocol` types.
 */
const zod_1 = require("zod");
const protocol_js_1 = require("../protocol/protocol.js");
const MAX_INT = 9007199254740991;
function parseObject(obj, schema) {
    const parseResult = schema.safeParse(obj);
    if (parseResult.success) {
        return parseResult.data;
    }
    const errorMessage = parseResult.error.errors
        .map((e) => `${e.message} in ` +
        `${e.path.map((p) => JSON.stringify(p)).join('/')}.`)
        .join(' ');
    throw new protocol_js_1.Message.InvalidArgumentException(errorMessage);
}
exports.parseObject = parseObject;
const UnicodeCharacterSchema = zod_1.z.string().refine((value) => {
    // The spread is a little hack so JS gives us an array of unicode characters
    // to measure.
    return [...value].length === 1;
});
var CommonDataTypes;
(function (CommonDataTypes) {
    CommonDataTypes.SharedReferenceSchema = zod_1.z.object({
        sharedId: zod_1.z.string().min(1),
        handle: zod_1.z.string().optional(),
    });
    CommonDataTypes.RemoteReferenceSchema = zod_1.z.object({
        handle: zod_1.z.string().min(1),
    });
    // UndefinedValue = {
    //   type: "undefined",
    // }
    const UndefinedValueSchema = zod_1.z.object({ type: zod_1.z.literal('undefined') });
    // NullValue = {
    //   type: "null",
    // }
    const NullValueSchema = zod_1.z.object({ type: zod_1.z.literal('null') });
    // StringValue = {
    //   type: "string",
    //   value: text,
    // }
    const StringValueSchema = zod_1.z.object({
        type: zod_1.z.literal('string'),
        value: zod_1.z.string(),
    });
    // SpecialNumber = "NaN" / "-0" / "Infinity" / "-Infinity";
    const SpecialNumberSchema = zod_1.z.enum(['NaN', '-0', 'Infinity', '-Infinity']);
    // NumberValue = {
    //   type: "number",
    //   value: number / SpecialNumber,
    // }
    const NumberValueSchema = zod_1.z.object({
        type: zod_1.z.literal('number'),
        value: zod_1.z.union([SpecialNumberSchema, zod_1.z.number()]),
    });
    // BooleanValue = {
    //   type: "boolean",
    //   value: bool,
    // }
    const BooleanValueSchema = zod_1.z.object({
        type: zod_1.z.literal('boolean'),
        value: zod_1.z.boolean(),
    });
    // BigIntValue = {
    //   type: "bigint",
    //   value: text,
    // }
    const BigIntValueSchema = zod_1.z.object({
        type: zod_1.z.literal('bigint'),
        value: zod_1.z.string(),
    });
    const PrimitiveProtocolValueSchema = zod_1.z.union([
        UndefinedValueSchema,
        NullValueSchema,
        StringValueSchema,
        NumberValueSchema,
        BooleanValueSchema,
        BigIntValueSchema,
    ]);
    CommonDataTypes.LocalValueSchema = zod_1.z.lazy(() => zod_1.z.union([
        PrimitiveProtocolValueSchema,
        ArrayLocalValueSchema,
        DateLocalValueSchema,
        MapLocalValueSchema,
        ObjectLocalValueSchema,
        RegExpLocalValueSchema,
        SetLocalValueSchema,
    ]));
    // Order is important, as `parse` is processed in the same order.
    // `SharedReferenceSchema`->`RemoteReferenceSchema`->`LocalValueSchema`.
    const LocalOrRemoteValueSchema = zod_1.z.union([
        CommonDataTypes.SharedReferenceSchema,
        CommonDataTypes.RemoteReferenceSchema,
        CommonDataTypes.LocalValueSchema,
    ]);
    // ListLocalValue = [*LocalValue];
    const ListLocalValueSchema = zod_1.z.array(LocalOrRemoteValueSchema);
    // ArrayLocalValue = {
    //   type: "array",
    //   value: ListLocalValue,
    // }
    const ArrayLocalValueSchema = zod_1.z.object({
        type: zod_1.z.literal('array'),
        value: ListLocalValueSchema,
    });
    // DateLocalValue = {
    //   type: "date",
    //   value: text
    // }
    const DateLocalValueSchema = zod_1.z.object({
        type: zod_1.z.literal('date'),
        value: zod_1.z.string().min(1),
    });
    // MappingLocalValue = [*[(LocalValue / text), LocalValue]];
    const MappingLocalValueSchema = zod_1.z.tuple([
        zod_1.z.union([zod_1.z.string(), LocalOrRemoteValueSchema]),
        LocalOrRemoteValueSchema,
    ]);
    // MapLocalValue = {
    //   type: "map",
    //   value: MappingLocalValue,
    // }
    const MapLocalValueSchema = zod_1.z.object({
        type: zod_1.z.literal('map'),
        value: zod_1.z.array(MappingLocalValueSchema),
    });
    // ObjectLocalValue = {
    //   type: "object",
    //   value: MappingLocalValue,
    // }
    const ObjectLocalValueSchema = zod_1.z.object({
        type: zod_1.z.literal('object'),
        value: zod_1.z.array(MappingLocalValueSchema),
    });
    // RegExpLocalValue = {
    //   type: "regexp",
    //   value: RegExpValue,
    // }
    const RegExpLocalValueSchema = zod_1.z.object({
        type: zod_1.z.literal('regexp'),
        value: zod_1.z.object({
            pattern: zod_1.z.string(),
            flags: zod_1.z.string().optional(),
        }),
    });
    // SetLocalValue = {
    //   type: "set",
    //   value: ListLocalValue,
    // }
    const SetLocalValueSchema = zod_1.z.lazy(() => zod_1.z.object({
        type: zod_1.z.literal('set'),
        value: ListLocalValueSchema,
    }));
    // BrowsingContext = text;
    CommonDataTypes.BrowsingContextSchema = zod_1.z.string();
    CommonDataTypes.MaxDepthSchema = zod_1.z.number().int().nonnegative().max(MAX_INT);
})(CommonDataTypes = exports.CommonDataTypes || (exports.CommonDataTypes = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
var Script;
(function (Script) {
    const RealmTypeSchema = zod_1.z.enum([
        'window',
        'dedicated-worker',
        'shared-worker',
        'service-worker',
        'worker',
        'paint-worklet',
        'audio-worklet',
        'worklet',
    ]);
    Script.GetRealmsParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema.optional(),
        type: RealmTypeSchema.optional(),
    });
    function parseGetRealmsParams(params) {
        return parseObject(params, Script.GetRealmsParametersSchema);
    }
    Script.parseGetRealmsParams = parseGetRealmsParams;
    // ContextTarget = {
    //   context: BrowsingContext,
    //   ?sandbox: text
    // }
    const ContextTargetSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        sandbox: zod_1.z.string().optional(),
    });
    // RealmTarget = {realm: Realm};
    const RealmTargetSchema = zod_1.z.object({
        realm: zod_1.z.string().min(1),
    });
    // Target = (
    //   RealmTarget //
    //   ContextTarget
    // );
    // Order is important, as `parse` is processed in the same order.
    // `RealmTargetSchema` has higher priority.
    const TargetSchema = zod_1.z.union([RealmTargetSchema, ContextTargetSchema]);
    // ResultOwnership = "root" / "none"
    const ResultOwnershipSchema = zod_1.z.enum(['root', 'none']);
    // SerializationOptions = {
    //   ?maxDomDepth: (js-uint / null) .default 0,
    //   ?maxObjectDepth: (js-uint / null) .default null,
    //   ?includeShadowTree: ("none" / "open" / "all") .default "none",
    // }
    const SerializationOptionsSchema = zod_1.z.object({
        maxDomDepth: zod_1.z
            .union([zod_1.z.null(), zod_1.z.number().int().nonnegative()])
            .optional(),
        maxObjectDepth: zod_1.z
            .union([zod_1.z.null(), zod_1.z.number().int().nonnegative().max(MAX_INT)])
            .optional(),
        includeShadowTree: zod_1.z.enum(['none', 'open', 'all']).optional(),
    });
    // script.EvaluateParameters = {
    //   expression: text,
    //   target: script.Target,
    //   awaitPromise: bool,
    //   ?resultOwnership: script.ResultOwnership,
    //   ?serializationOptions: script.SerializationOptions,
    // }
    const EvaluateParametersSchema = zod_1.z.object({
        expression: zod_1.z.string(),
        awaitPromise: zod_1.z.boolean(),
        target: TargetSchema,
        resultOwnership: ResultOwnershipSchema.optional(),
        serializationOptions: SerializationOptionsSchema.optional(),
    });
    function parseEvaluateParams(params) {
        return parseObject(params, EvaluateParametersSchema);
    }
    Script.parseEvaluateParams = parseEvaluateParams;
    // DisownParameters = {
    //   handles: [Handle]
    //   target: script.Target;
    // }
    const DisownParametersSchema = zod_1.z.object({
        target: TargetSchema,
        handles: zod_1.z.array(zod_1.z.string()),
    });
    function parseDisownParams(params) {
        return parseObject(params, DisownParametersSchema);
    }
    Script.parseDisownParams = parseDisownParams;
    const ChannelSchema = zod_1.z.string();
    const ChannelPropertiesSchema = zod_1.z.object({
        channel: ChannelSchema,
        serializationOptions: SerializationOptionsSchema.optional(),
        ownership: ResultOwnershipSchema.optional(),
    });
    Script.ChannelValueSchema = zod_1.z.object({
        type: zod_1.z.literal('channel'),
        value: ChannelPropertiesSchema,
    });
    Script.PreloadScriptSchema = zod_1.z.string();
    Script.AddPreloadScriptParametersSchema = zod_1.z.object({
        functionDeclaration: zod_1.z.string(),
        arguments: zod_1.z.array(Script.ChannelValueSchema).optional(),
        sandbox: zod_1.z.string().optional(),
        context: CommonDataTypes.BrowsingContextSchema.optional(),
    });
    function parseAddPreloadScriptParams(params) {
        return parseObject(params, Script.AddPreloadScriptParametersSchema);
    }
    Script.parseAddPreloadScriptParams = parseAddPreloadScriptParams;
    Script.RemovePreloadScriptParametersSchema = zod_1.z.object({
        script: Script.PreloadScriptSchema,
    });
    function parseRemovePreloadScriptParams(params) {
        return parseObject(params, Script.RemovePreloadScriptParametersSchema);
    }
    Script.parseRemovePreloadScriptParams = parseRemovePreloadScriptParams;
    // ArgumentValue = (
    //   RemoteReference //
    //   LocalValue //
    //   script.Channel
    // );
    const ArgumentValueSchema = zod_1.z.union([
        CommonDataTypes.RemoteReferenceSchema,
        CommonDataTypes.SharedReferenceSchema,
        CommonDataTypes.LocalValueSchema,
        Script.ChannelValueSchema,
    ]);
    // CallFunctionParameters = {
    //   functionDeclaration: text,
    //   awaitPromise: bool,
    //   target: script.Target,
    //   ?arguments: [*script.ArgumentValue],
    //   ?resultOwnership: script.ResultOwnership,
    //   ?serializationOptions: script.SerializationOptions,
    //   ?this: script.ArgumentValue,
    // }
    const CallFunctionParametersSchema = zod_1.z.object({
        functionDeclaration: zod_1.z.string(),
        awaitPromise: zod_1.z.boolean(),
        target: TargetSchema,
        arguments: zod_1.z.array(ArgumentValueSchema).optional(),
        resultOwnership: ResultOwnershipSchema.optional(),
        serializationOptions: SerializationOptionsSchema.optional(),
        this: ArgumentValueSchema.optional(),
    });
    function parseCallFunctionParams(params) {
        return parseObject(params, CallFunctionParametersSchema);
    }
    Script.parseCallFunctionParams = parseCallFunctionParams;
})(Script = exports.Script || (exports.Script = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-browsingContext */
var BrowsingContext;
(function (BrowsingContext) {
    // GetTreeParameters = {
    //   ?maxDepth: js-uint,
    //   ?root: browsingContext.BrowsingContext,
    // }
    const GetTreeParametersSchema = zod_1.z.object({
        maxDepth: CommonDataTypes.MaxDepthSchema.optional(),
        root: CommonDataTypes.BrowsingContextSchema.optional(),
    });
    function parseGetTreeParams(params) {
        return parseObject(params, GetTreeParametersSchema);
    }
    BrowsingContext.parseGetTreeParams = parseGetTreeParams;
    // ReadinessState = "none" / "interactive" / "complete"
    const ReadinessStateSchema = zod_1.z.enum(['none', 'interactive', 'complete']);
    // BrowsingContextNavigateParameters = {
    //   context: BrowsingContext,
    //   url: text,
    //   ?wait: ReadinessState,
    // }
    // ReadinessState = "none" / "interactive" / "complete"
    const NavigateParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        url: zod_1.z.string().url(),
        wait: ReadinessStateSchema.optional(),
    });
    function parseNavigateParams(params) {
        return parseObject(params, NavigateParametersSchema);
    }
    BrowsingContext.parseNavigateParams = parseNavigateParams;
    const ReloadParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        ignoreCache: zod_1.z.boolean().optional(),
        wait: ReadinessStateSchema.optional(),
    });
    function parseReloadParams(params) {
        return parseObject(params, ReloadParametersSchema);
    }
    BrowsingContext.parseReloadParams = parseReloadParams;
    // BrowsingContextCreateType = "tab" / "window"
    // BrowsingContextCreateParameters = {
    //   type: BrowsingContextCreateType
    // }
    const CreateParametersSchema = zod_1.z.object({
        type: zod_1.z.enum(['tab', 'window']),
        referenceContext: CommonDataTypes.BrowsingContextSchema.optional(),
    });
    function parseCreateParams(params) {
        return parseObject(params, CreateParametersSchema);
    }
    BrowsingContext.parseCreateParams = parseCreateParams;
    // BrowsingContextCloseParameters = {
    //   context: BrowsingContext
    // }
    const CloseParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
    });
    function parseCloseParams(params) {
        return parseObject(params, CloseParametersSchema);
    }
    BrowsingContext.parseCloseParams = parseCloseParams;
    // browsingContext.CaptureScreenshotParameters = {
    //   context: browsingContext.BrowsingContext
    // }
    const CaptureScreenshotParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
    });
    function parseCaptureScreenshotParams(params) {
        return parseObject(params, CaptureScreenshotParametersSchema);
    }
    BrowsingContext.parseCaptureScreenshotParams = parseCaptureScreenshotParams;
    // All units are in cm.
    // PrintPageParameters = {
    //   ?height: (float .ge 0.0) .default 27.94,
    //   ?width: (float .ge 0.0) .default 21.59,
    // }
    const PrintPageParametersSchema = zod_1.z.object({
        height: zod_1.z.number().nonnegative().optional(),
        width: zod_1.z.number().nonnegative().optional(),
    });
    // All units are in cm.
    // PrintMarginParameters = {
    //   ?bottom: (float .ge 0.0) .default 1.0,
    //   ?left: (float .ge 0.0) .default 1.0,
    //   ?right: (float .ge 0.0) .default 1.0,
    //   ?top: (float .ge 0.0) .default 1.0,
    // }
    const PrintMarginParametersSchema = zod_1.z.object({
        bottom: zod_1.z.number().nonnegative().optional(),
        left: zod_1.z.number().nonnegative().optional(),
        right: zod_1.z.number().nonnegative().optional(),
        top: zod_1.z.number().nonnegative().optional(),
    });
    /** @see https://w3c.github.io/webdriver/#dfn-parse-a-page-range */
    const PrintPageRangesSchema = zod_1.z
        .array(zod_1.z.union([zod_1.z.string().min(1), zod_1.z.number().int().nonnegative()]))
        .refine((pageRanges) => {
        return pageRanges.every((pageRange) => {
            const match = String(pageRange).match(
            // matches: '2' | '2-' | '-2' | '2-4'
            /^(?:(?:\d+)|(?:\d+[-])|(?:[-]\d+)|(?:(?<start>\d+)[-](?<end>\d+)))$/);
            // If a page range is specified, validate start <= end.
            const { start, end } = match?.groups ?? {};
            if (start && end && Number(start) > Number(end)) {
                return false;
            }
            return match;
        });
    });
    // PrintParameters = {
    //   context: browsingContext.BrowsingContext,
    //   ?background: bool .default false,
    //   ?margin: browsingContext.PrintMarginParameters,
    //   ?orientation: ("portrait" / "landscape") .default "portrait",
    //   ?page: browsingContext.PrintPageParameters,
    //   ?pageRanges: [*(js-uint / text)],
    //   ?scale: 0.1..2.0 .default 1.0,
    //   ?shrinkToFit: bool .default true,
    // }
    const PrintParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        background: zod_1.z.boolean().optional(),
        margin: PrintMarginParametersSchema.optional(),
        orientation: zod_1.z.enum(['portrait', 'landscape']).optional(),
        page: PrintPageParametersSchema.optional(),
        pageRanges: PrintPageRangesSchema.optional(),
        scale: zod_1.z.number().min(0.1).max(2.0).optional(),
        shrinkToFit: zod_1.z.boolean().optional(),
    });
    function parsePrintParams(params) {
        return parseObject(params, PrintParametersSchema);
    }
    BrowsingContext.parsePrintParams = parsePrintParams;
    // browsingContext.Viewport = {
    //   width: js-uint,
    //   height: js-uint,
    // }
    const ViewportSchema = zod_1.z.object({
        width: zod_1.z.number().int().nonnegative(),
        height: zod_1.z.number().int().nonnegative(),
    });
    // browsingContext.SetViewportParameters = {
    //   context: browsingContext.BrowsingContext,
    //   viewport: emulation.Viewport / null
    // }
    const SetViewportActionSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        viewport: zod_1.z.union([zod_1.z.null(), ViewportSchema]),
    });
    function parseSetViewportParams(params) {
        return parseObject(params, SetViewportActionSchema);
    }
    BrowsingContext.parseSetViewportParams = parseSetViewportParams;
})(BrowsingContext = exports.BrowsingContext || (exports.BrowsingContext = {}));
var Cdp;
(function (Cdp) {
    const SendCommandParamsSchema = zod_1.z.object({
        // Allowing any cdpMethod, and casting to proper type later on.
        method: zod_1.z.string(),
        // `passthrough` allows object to have any fields.
        // https://github.com/colinhacks/zod#passthrough
        params: zod_1.z.object({}).passthrough().optional(),
        session: zod_1.z.string().optional(),
    });
    function parseSendCommandParams(params) {
        return parseObject(params, SendCommandParamsSchema);
    }
    Cdp.parseSendCommandParams = parseSendCommandParams;
    const GetSessionParamsSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
    });
    function parseGetSessionParams(params) {
        return parseObject(params, GetSessionParamsSchema);
    }
    Cdp.parseGetSessionParams = parseGetSessionParams;
})(Cdp = exports.Cdp || (exports.Cdp = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-session */
var Session;
(function (Session) {
    const BiDiSubscriptionRequestParametersEventsSchema = zod_1.z.enum([
        protocol_js_1.BrowsingContext.AllEvents,
        ...Object.values(protocol_js_1.BrowsingContext.EventNames),
        protocol_js_1.Log.AllEvents,
        ...Object.values(protocol_js_1.Log.EventNames),
        protocol_js_1.Network.AllEvents,
        ...Object.values(protocol_js_1.Network.EventNames),
        protocol_js_1.Script.AllEvents,
        ...Object.values(protocol_js_1.Script.EventNames),
    ]);
    // BiDi+ events
    const CdpSubscriptionRequestParametersEventsSchema = zod_1.z.custom((value) => {
        return typeof value === 'string' && value.startsWith('cdp.');
    }, 'Not a CDP event');
    const SubscriptionRequestParametersEventsSchema = zod_1.z.union([
        BiDiSubscriptionRequestParametersEventsSchema,
        CdpSubscriptionRequestParametersEventsSchema,
    ]);
    // SessionSubscriptionRequest = {
    //   events: [*text],
    //   ?contexts: [*BrowsingContext],
    // }
    const SubscriptionRequestParametersSchema = zod_1.z.object({
        events: zod_1.z.array(SubscriptionRequestParametersEventsSchema),
        contexts: zod_1.z.array(CommonDataTypes.BrowsingContextSchema).optional(),
    });
    function parseSubscribeParams(params) {
        return parseObject(params, SubscriptionRequestParametersSchema);
    }
    Session.parseSubscribeParams = parseSubscribeParams;
})(Session = exports.Session || (exports.Session = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-input */
var Input;
(function (Input) {
    // input.ElementOrigin = {
    //   type: "element",
    //   element: script.SharedReference
    // }
    const ElementOriginSchema = zod_1.z.object({
        type: zod_1.z.literal('element'),
        element: CommonDataTypes.SharedReferenceSchema,
    });
    // input.Origin = "viewport" / "pointer" / input.ElementOrigin
    const OriginSchema = zod_1.z.union([
        zod_1.z.literal('viewport'),
        zod_1.z.literal('pointer'),
        ElementOriginSchema,
    ]);
    // input.PauseAction = {
    //   type: "pause",
    //   ? duration: js-uint
    // }
    const PauseActionSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.Pause),
        duration: zod_1.z.number().nonnegative().int().optional(),
    });
    // input.KeyDownAction = {
    //   type: "keyDown",
    //   value: text
    // }
    const KeyDownActionSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.KeyDown),
        value: UnicodeCharacterSchema,
    });
    // input.KeyUpAction = {
    //   type: "keyUp",
    //   value: text
    // }
    const KeyUpActionSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.KeyUp),
        value: UnicodeCharacterSchema,
    });
    // input.TiltProperties = (
    //   ? tiltX: -90..90 .default 0,
    //   ? tiltY: -90..90 .default 0,
    // )
    const TiltPropertiesSchema = zod_1.z.object({
        tiltX: zod_1.z.number().min(-90).max(90).int().default(0).optional(),
        tiltY: zod_1.z.number().min(-90).max(90).int().default(0).optional(),
    });
    // input.AngleProperties = (
    //   ? altitudeAngle: float .default 0.0,
    //   ? azimuthAngle: float .default 0.0,
    // )
    const AnglePropertiesSchema = zod_1.z.object({
        altitudeAngle: zod_1.z
            .number()
            .nonnegative()
            .max(Math.PI / 2)
            .default(0.0)
            .optional(),
        azimuthAngle: zod_1.z
            .number()
            .nonnegative()
            .max(2 * Math.PI)
            .default(0.0)
            .optional(),
    });
    // input.PointerCommonProperties = (
    //   ? width: js-uint .default 1,
    //   ? height: js-uint .default 1,
    //   ? pressure: float .default 0.0,
    //   ? tangentialPressure: float .default 0.0,
    //   ? twist: 0..359 .default 0,
    //   (input.TiltProperties // input.AngleProperties)
    // )
    const PointerCommonPropertiesSchema = zod_1.z
        .object({
        width: zod_1.z.number().nonnegative().int().default(1),
        height: zod_1.z.number().nonnegative().int().default(1),
        pressure: zod_1.z.number().min(0.0).max(1.0).default(0.0),
        tangentialPressure: zod_1.z.number().min(-1.0).max(1.0).default(0.0),
        twist: zod_1.z.number().nonnegative().max(359).int().default(0),
    })
        .and(zod_1.z.union([TiltPropertiesSchema, AnglePropertiesSchema]));
    // input.PointerUpAction = {
    //   type: "pointerUp",
    //   button: js-uint,
    //   input.PointerCommonProperties
    // }
    const PointerUpActionSchema = zod_1.z
        .object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.PointerUp),
        button: zod_1.z.number().nonnegative().int(),
    })
        .and(PointerCommonPropertiesSchema);
    // input.PointerDownAction = {
    //   type: "pointerDown",
    //   button: js-uint,
    //   input.PointerCommonProperties
    // }
    const PointerDownActionSchema = zod_1.z
        .object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.PointerDown),
        button: zod_1.z.number().nonnegative().int(),
    })
        .and(PointerCommonPropertiesSchema);
    // input.PointerMoveAction = {
    //   type: "pointerMove",
    //   x: js-int,
    //   y: js-int,
    //   ? duration: js-uint,
    //   ? origin: input.Origin,
    //   input.PointerCommonProperties
    // }
    const PointerMoveActionSchema = zod_1.z
        .object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.PointerMove),
        x: zod_1.z.number().int(),
        y: zod_1.z.number().int(),
        duration: zod_1.z.number().nonnegative().int().optional(),
        origin: OriginSchema.optional().default('viewport'),
    })
        .and(PointerCommonPropertiesSchema);
    // input.WheelScrollAction = {
    //   type: "scroll",
    //   x: js-int,
    //   y: js-int,
    //   deltaX: js-int,
    //   deltaY: js-int,
    //   ? duration: js-uint,
    //   ? origin: input.Origin .default "viewport",
    // }
    const WheelScrollActionSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.ActionType.Scroll),
        x: zod_1.z.number().int(),
        y: zod_1.z.number().int(),
        deltaX: zod_1.z.number().int(),
        deltaY: zod_1.z.number().int(),
        duration: zod_1.z.number().nonnegative().int().optional(),
        origin: OriginSchema.optional().default('viewport'),
    });
    // input.WheelSourceAction = (
    //   input.PauseAction //
    //   input.WheelScrollAction
    // )
    const WheelSourceActionSchema = zod_1.z.discriminatedUnion('type', [
        PauseActionSchema,
        WheelScrollActionSchema,
    ]);
    // input.WheelSourceActions = {
    //   type: "wheel",
    //   id: text,
    //   actions: [*input.WheelSourceAction]
    // }
    const WheelSourceActionsSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.SourceActionsType.Wheel),
        id: zod_1.z.string(),
        actions: zod_1.z.array(WheelSourceActionSchema),
    });
    // input.PointerSourceAction = (
    //   input.PauseAction //
    //   input.PointerDownAction //
    //   input.PointerUpAction //
    //   input.PointerMoveAction
    // )
    const PointerSourceActionSchema = zod_1.z.union([
        PauseActionSchema,
        PointerDownActionSchema,
        PointerUpActionSchema,
        PointerMoveActionSchema,
    ]);
    // input.PointerType = "mouse" / "pen" / "touch"
    const PointerTypeSchema = zod_1.z.nativeEnum(protocol_js_1.Input.PointerType);
    // input.PointerParameters = {
    //   ? pointerType: input.PointerType .default "mouse"
    // }
    const PointerParametersSchema = zod_1.z.object({
        pointerType: PointerTypeSchema.optional().default(protocol_js_1.Input.PointerType.Mouse),
    });
    // input.PointerSourceActions = {
    //   type: "pointer",
    //   id: text,
    //   ? parameters: input.PointerParameters,
    //   actions: [*input.PointerSourceAction]
    // }
    const PointerSourceActionsSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.SourceActionsType.Pointer),
        id: zod_1.z.string(),
        parameters: PointerParametersSchema.optional(),
        actions: zod_1.z.array(PointerSourceActionSchema),
    });
    // input.KeySourceAction = (
    //   input.PauseAction //
    //   input.KeyDownAction //
    //   input.KeyUpAction
    // )
    const KeySourceActionSchema = zod_1.z.discriminatedUnion('type', [
        PauseActionSchema,
        KeyDownActionSchema,
        KeyUpActionSchema,
    ]);
    // input.KeySourceActions = {
    //   type: "key",
    //   id: text,
    //   actions: [*input.KeySourceAction]
    // }
    const KeySourceActionsSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.SourceActionsType.Key),
        id: zod_1.z.string(),
        actions: zod_1.z.array(KeySourceActionSchema),
    });
    // input.NoneSourceAction = input.PauseAction
    const NoneSourceActionSchema = PauseActionSchema;
    // input.NoneSourceActions = {
    //   type: "none",
    //   id: text,
    //   actions: [*input.NoneSourceAction]
    // }
    const NoneSourceActionsSchema = zod_1.z.object({
        type: zod_1.z.literal(protocol_js_1.Input.SourceActionsType.None),
        id: zod_1.z.string(),
        actions: zod_1.z.array(NoneSourceActionSchema),
    });
    // input.SourceActions = (
    //   input.NoneSourceActions //
    //   input.KeySourceActions //
    //   input.PointerSourceActions //
    //   input.WheelSourceActions
    // )
    const SourceActionsSchema = zod_1.z.discriminatedUnion('type', [
        NoneSourceActionsSchema,
        KeySourceActionsSchema,
        PointerSourceActionsSchema,
        WheelSourceActionsSchema,
    ]);
    // input.PerformActionsParameters = {
    //   context: browsingContext.BrowsingContext,
    //   actions: [*input.SourceActions]
    // }
    const PerformActionsParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
        actions: zod_1.z.array(SourceActionsSchema),
    });
    function parsePerformActionsParams(params) {
        return parseObject(params, PerformActionsParametersSchema);
    }
    Input.parsePerformActionsParams = parsePerformActionsParams;
    // input.ReleaseActionsParameters = {
    //   context: browsingContext.BrowsingContext,
    // }
    const ReleaseActionsParametersSchema = zod_1.z.object({
        context: CommonDataTypes.BrowsingContextSchema,
    });
    function parseReleaseActionsParams(params) {
        return parseObject(params, ReleaseActionsParametersSchema);
    }
    Input.parseReleaseActionsParams = parseReleaseActionsParams;
})(Input = exports.Input || (exports.Input = {}));
//# sourceMappingURL=protocol-parser.js.map