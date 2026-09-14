/**
 * Returned by a scalar resolver when the source does not match its tag.
 *
 * @category Tags
 */
declare const NOT_RESOLVED: unique symbol;
/**
 * Options for {@link defineScalarTag}.
 *
 * @category Tags
 */
interface ScalarTagOptions<Result> {
    /**
     * Whether this tag participates in resolving plain scalars without an
     * explicit tag. Default: `false`.
     */
    implicit?: boolean;
    /**
     * Whether explicit tag names are matched by prefix instead of exact equality.
     * Default: `false`.
     */
    matchByTagPrefix?: boolean;
    /**
     * Set of `source.charAt(0)` keys for which `resolve` may succeed (a superset
     * of what it really matches). A key is either a single character or '' (empty
     * source). `null` means "no constraint, always try". Used by the composer to
     * dispatch implicit scalars by first character without running every resolver.
     */
    implicitFirstChars?: readonly string[] | null;
    /**
     * Construct a value from scalar text, or return {@link NOT_RESOLVED} when it
     * is invalid for this tag. `isExplicit` is true for an explicit tag and
     * `tagName` is the actual matched name.
     */
    resolve: (source: string, isExplicit: boolean, tagName: string) => Result | typeof NOT_RESOLVED;
    /**
     * Selects this tag for a JavaScript value when dumping. Use `() => false`
     * for load-only tags.
     */
    identify: (data: any) => boolean;
    /**
     * A scalar's printed form is text, so `represent` always yields a string.
     * The factory supplies a `String(data)` default when a tag omits it.
     */
    represent?: (data: any) => string;
    /** Return the tag name to emit for a prefix-matching tag. Defaults to `tagName`. */
    representTagName?: (data: any) => string;
}
/**
 * Normalized scalar tag returned by {@link defineScalarTag}.
 *
 * @category Tags
 */
interface ScalarTagDefinition<Result = unknown> extends Required<ScalarTagOptions<Result>> {
    /** Tag name used for schema lookup. */
    tagName: string;
    /** YAML node kind handled by this tag. */
    nodeKind: 'scalar';
}
/**
 * Options for {@link defineSequenceTag}.
 *
 * @category Tags
 */
interface SequenceTagOptions<Carrier, Result = Carrier> {
    /**
     * Whether explicit tag names are matched by prefix instead of exact equality.
     * Default: `false`.
     */
    matchByTagPrefix?: boolean;
    /** Create the carrier used while constructing a sequence. */
    create: (tagName: string) => Carrier;
    /** Add an item to the carrier. Return a non-empty error message to reject it. */
    addItem: (carrier: Carrier, item: unknown, index: number) => void | string;
    /** Convert the completed carrier to the result. Defaults to the identity function. */
    finalize?: (carrier: Carrier) => Result;
    /**
     * Selects this tag for a JavaScript value when dumping. Use `() => false`
     * for load-only tags.
     */
    identify: (data: any) => boolean;
    /** Return the array-like contents to dump. Defaults to the identity function. */
    represent?: (data: any) => ArrayLike<unknown>;
    /** Return the tag name to emit for a prefix-matching tag. Defaults to `tagName`. */
    representTagName?: (data: any) => string;
}
/**
 * Normalized sequence tag returned by {@link defineSequenceTag}.
 *
 * @category Tags
 */
interface SequenceTagDefinition<Carrier = unknown, Result = Carrier> extends Required<SequenceTagOptions<Carrier, Result>> {
    /** Tag name used for schema lookup. */
    tagName: string;
    /** YAML node kind handled by this tag. */
    nodeKind: 'sequence';
    /** Sequence tags do not participate in implicit scalar resolution. */
    implicit: false;
    /** Whether the carrier is also the final result (`finalize` was omitted). */
    carrierIsResult: boolean;
}
/**
 * Options for {@link defineMappingTag}.
 *
 * @category Tags
 */
interface MappingTagOptions<Carrier, Result = Carrier> {
    /**
     * Whether explicit tag names are matched by prefix instead of exact equality.
     * Default: `false`.
     */
    matchByTagPrefix?: boolean;
    /** Create the carrier used while constructing a mapping. */
    create: (tagName: string) => Carrier;
    /**
     * Writes a pair. Returns '' on success, a non-empty error message otherwise
     * (key does not fit the representation, value rejected, ...). Always a string
     * so the hot path never allocates an exception wrapper.
     */
    addPair: (carrier: Carrier, key: unknown, value: unknown) => string;
    /** Return whether the carrier contains a key, for duplicate and merge checks. */
    has: (carrier: Carrier, key: unknown) => boolean;
    /** Return the keys of a completed result for YAML merge processing. */
    keys: (result: Result) => Iterable<unknown>;
    /** Return a value from a completed result for YAML merge processing. */
    get: (result: Result, key: unknown) => unknown;
    /** Convert the completed carrier to the result. Defaults to the identity function. */
    finalize?: (carrier: Carrier) => Result;
    /**
     * Selects this tag for a JavaScript value when dumping. Use `() => false`
     * for load-only tags.
     */
    identify: (data: any) => boolean;
    /** Return the mapping entries to dump. Defaults to the identity function. */
    represent?: (data: any) => Map<unknown, unknown>;
    /** Return the tag name to emit for a prefix-matching tag. Defaults to `tagName`. */
    representTagName?: (data: any) => string;
}
/**
 * Normalized mapping tag returned by {@link defineMappingTag}.
 *
 * @category Tags
 */
interface MappingTagDefinition<Carrier = unknown, Result = Carrier> extends Required<MappingTagOptions<Carrier, Result>> {
    /** Tag name used for schema lookup. */
    tagName: string;
    /** YAML node kind handled by this tag. */
    nodeKind: 'mapping';
    /** Mapping tags do not participate in implicit scalar resolution. */
    implicit: false;
    /** Whether the carrier is also the final result (`finalize` was omitted). */
    carrierIsResult: boolean;
}
/**
 * Any normalized tag definition accepted by {@link Schema}.
 *
 * @category Tags
 */
type TagDefinition = ScalarTagDefinition<any> | SequenceTagDefinition<any, any> | MappingTagDefinition<any, any>;
/**
 * Create a normalized scalar tag definition.
 *
 * @category Tags
 */
declare function defineScalarTag<Result>(tagName: string, options: ScalarTagOptions<Result>): ScalarTagDefinition<Result>;
/**
 * Create a normalized sequence tag definition.
 *
 * @category Tags
 */
declare function defineSequenceTag<Carrier, Result = Carrier>(tagName: string, options: SequenceTagOptions<Carrier, Result>): SequenceTagDefinition<Carrier, Result>;
/**
 * Create a normalized mapping tag definition.
 *
 * @category Tags
 */
declare function defineMappingTag<Carrier, Result = Carrier>(tagName: string, options: MappingTagOptions<Carrier, Result>): MappingTagDefinition<Carrier, Result>;

/**
 * Controls tag resolution when loading and type selection when dumping.
 *
 * @category Schemas
 */
declare class Schema {
    readonly tags: readonly TagDefinition[];
    /** @internal */
    readonly implicitScalarTags: readonly ScalarTagDefinition[];
    /**
     * Dispatch implicit scalar resolvers by `source.charAt(0)`. Each bucket holds
     * the resolvers that may match that key, in schema order; a key absent from
     * the map uses
     * {@link Schema.implicitScalarAnyFirstChar}
     * (resolvers that declared no first-char constraint, so they apply to any
     * first character).
     */
    private readonly implicitScalarByFirstChar;
    private readonly implicitScalarAnyFirstChar;
    /**
     * The default scalar tag (`!!str`), resolved once so the composer's fallback
     * for unresolved plain scalars avoids a keyed lookup per scalar.
     *
     * @internal
     */
    readonly defaultScalarTag: ScalarTagDefinition;
    /**
     * The default container tags (`!!seq` / `!!map`), used by the dumper: when a
     * value is identified by its default tag, the tag is implicit and not
     * printed. Undefined if the schema does not define them (then such values
     * can't be dumped).
     *
     * @internal
     */
    readonly defaultSequenceTag: SequenceTagDefinition | undefined;
    /** @internal */
    readonly defaultMappingTag: MappingTagDefinition | undefined;
    private readonly exact;
    private readonly prefix;
    constructor(tags: readonly TagDefinition[]);
    /** @internal */
    lookupScalarTag(tagName: string): ScalarTagDefinition | undefined;
    /** @internal */
    lookupSequenceTag(tagName: string): SequenceTagDefinition | undefined;
    /** @internal */
    lookupMappingTag(tagName: string): MappingTagDefinition | undefined;
    /** @internal */
    resolveImplicitScalarTag(source: string): {
        value: unknown;
        tag: ScalarTagDefinition;
    };
    /**
     * Creates a new schema with the specified tags added. If a tag already
     * exists, it is replaced by the specified tag.
     *
     * @example
     *
     * ```javascript
     * import { CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
     *
     * const schema = CORE_SCHEMA.withTags(mergeTag, realMapTag)
     * ```
     */
    withTags(...tags: Array<TagDefinition | readonly TagDefinition[]>): Schema;
}
/**
 * The YAML 1.2 Failsafe Schema: strings, sequences, and mappings.
 *
 * @category Schemas
 */
declare const FAILSAFE_SCHEMA: Schema;
/**
 * The YAML 1.2 JSON Schema. It uses JSON scalar forms while retaining YAML
 * collection syntax.
 *
 * @category Schemas
 */
declare const JSON_SCHEMA: Schema;
/**
 * The default schema for the loaders. Note, {@link CORE_SCHEMA} comes
 * without the `!!merge` tag. You can easily enable it if needed.
 *
 * @example
 * Enable {@link mergeTag}:
 *
 * ```javascript
 * import { load, CORE_SCHEMA, mergeTag } from 'js-yaml'
 *
 * try {
 *   load(data, { schema: CORE_SCHEMA.withTags(mergeTag) })
 * } catch (e) {
 *   console.error(e)
 * }
 * ```
 *
 * @category Schemas
 */
declare const CORE_SCHEMA: Schema;
/**
 * YAML 1.1-compatible schema.
 *
 * @category Schemas
 */
declare const YAML11_SCHEMA: Schema;
/**
 * The dumper schema for maximum compatibility. It combines all supported type
 * variants from YAML 1.1 and YAML 1.2 so strings matching any of them are
 * quoted. This makes the generated YAML more compatible with other parsers.
 *
 * The schema is based on YAML 1.1, but extends `!!int` and `!!float` to accept
 * both YAML 1.1 and Core Schema forms, since Core Schema supports some forms
 * that YAML 1.1 does not.
 *
 * @category Schemas
 */
declare const DUMP_SCHEMA: Schema;

/** @category Tags */
declare const strTag: ScalarTagDefinition<string>;

/** @category Tags */
declare const nullCoreTag: ScalarTagDefinition<null>;

/** @category Tags */
declare const nullJsonTag: ScalarTagDefinition<null>;

/** @category Tags */
declare const nullYaml11Tag: ScalarTagDefinition<null>;

/** @category Tags */
declare const boolCoreTag: ScalarTagDefinition<boolean>;

/** @category Tags */
declare const boolJsonTag: ScalarTagDefinition<boolean>;

/** @category Tags */
declare const boolYaml11Tag: ScalarTagDefinition<boolean>;

/** @category Tags */
declare const intCoreTag: ScalarTagDefinition<number>;

/** @category Tags */
declare const intJsonTag: ScalarTagDefinition<number>;

/** @category Tags */
declare const intYaml11Tag: ScalarTagDefinition<number>;

/** @category Tags */
declare const floatCoreTag: ScalarTagDefinition<number>;

/** @category Tags */
declare const floatJsonTag: ScalarTagDefinition<number>;

/** @category Tags */
declare const floatYaml11Tag: ScalarTagDefinition<number>;

/**
 * Enables merge keys in {@link CORE_SCHEMA} when added with
 * {@link Schema.withTags}.
 *
 * @category Tags
 */
declare const mergeTag: ScalarTagDefinition<"<<">;

/**
 * The `!!binary` tag, represented as a `Uint8Array`.
 *
 * @category Tags
 */
declare const binaryTag: ScalarTagDefinition<Uint8Array<ArrayBuffer>>;

/**
 * The YAML 1.1 `!!timestamp` tag, represented as a JavaScript `Date`.
 *
 * @category Tags
 */
declare const timestampTag: ScalarTagDefinition<Date>;

/** @category Tags */
declare const seqTag: SequenceTagDefinition<unknown[], unknown[]>;

/**
 * Provided only for YAML 1.1 compatibility and supported by the loader only.
 * JavaScript has no dedicated class to represent this type, so it cannot be
 * identified and dumped.
 *
 * ```yaml
 * !!omap
 *   - one: 1
 *   - two: 2
 * ```
 *
 * is loaded as
 *
 * ```javascript
 * [
 *   { one: 1 },
 *   { two: 2 }
 * ]
 * ```
 *
 * @category Tags
 */
declare const omapTag: SequenceTagDefinition<{
    list: unknown[];
    seen: Set<unknown>;
}, unknown[]>;

/**
 * Provided only for YAML 1.1 compatibility and supported by the loader only.
 * JavaScript has no dedicated class to represent this type, so it cannot be
 * identified and dumped.
 *
 * ```yaml
 * !!pairs
 *   - one: 1
 *   - two: 2
 * ```
 *
 * is loaded as
 *
 * ```javascript
 * [
 *   ['one', 1],
 *   ['two', 2]
 * ]
 * ```
 *
 * @category Tags
 */
declare const pairsTag: SequenceTagDefinition<[unknown, unknown][], [unknown, unknown][]>;

/**
 * This is the default mapping implementation. It uses `{}` objects and has only
 * partial functionality due to language limitations. This choice was made
 * because users expect to get JavaScript objects, and it was left unchanged to
 * avoid too many breaking changes in the v5 release.
 *
 * Side effects:
 *
 * - `Object.hasOwn()` checks or `for...of` loops are required for safe use (to
 *   avoid falling through to prototypes).
 * - Only scalar string keys are supported properly.
 * - Other scalar keys, such as `null` and numbers, are converted to strings.
 *   This is historical behaviour, and it can cause side effects such as
 *   problems with `!!merge`.
 *
 * Note that non-string scalar keys may be deprecated in future versions.
 *
 * Ideally, use {@link realMapTag} instead.
 *
 * @category Tags
 */
declare const mapTag: MappingTagDefinition<Record<string, unknown>, Record<string, unknown>>;

/**
 * Recommended when non-string keys are actually needed. It uses native
 * JavaScript `Map` objects, so keys keep their constructed types instead of
 * being converted to strings.
 *
 * It is not the default to avoid widespread breaking changes in existing
 * projects. `Map` has a different access API and does not pass deep equality
 * checks against `{}`-based fixtures. Alongside the other changes in v5,
 * making it the default was considered too disruptive.
 *
 * If these differences are acceptable for your project, we recommend using
 * {@link realMapTag} to guarantee the absence of problems and side effects.
 *
 * @example
 * Enable {@link realMapTag}:
 *
 * ```javascript
 * import { load, CORE_SCHEMA, realMapTag } from 'js-yaml'
 *
 * try {
 *   load(data, { schema: CORE_SCHEMA.withTags(realMapTag) })
 * } catch (e) {
 *   console.error(e)
 * }
 * ```
 *
 * @category Tags
 */
declare const realMapTag: MappingTagDefinition<Map<unknown, unknown>, Map<unknown, unknown>>;

/**
 * This implementation exists solely to reproduce v4 behavior exactly. Its use
 * is strongly discouraged. If complex or non-string keys are needed, use
 * {@link realMapTag} instead.
 *
 * @category Tags
 */
declare const legacyMapTag: MappingTagDefinition<Record<string, unknown>, Record<string, unknown>>;

/**
 * The YAML 1.1 `!!set` tag, represented as a JavaScript `Set`.
 *
 * @category Tags
 */
declare const setTag: MappingTagDefinition<Set<unknown>, Set<unknown>>;

/** @category Events */
declare const EVENT_ID: {
    readonly DOCUMENT: 1;
    readonly SEQUENCE: 2;
    readonly MAPPING: 3;
    readonly SCALAR: 4;
    readonly ALIAS: 5;
    readonly POP: 6;
};
/** @category Events */
type EventId = typeof EVENT_ID[keyof typeof EVENT_ID];
/** @category Nodes */
declare const SCALAR_STYLE: {
    readonly PLAIN: 1;
    readonly SINGLE_QUOTED: 2;
    readonly DOUBLE_QUOTED: 3;
    readonly LITERAL_BLOCK: 4;
    readonly FOLDED_BLOCK: 5;
};
/** @category Nodes */
type ScalarStyle = typeof SCALAR_STYLE[keyof typeof SCALAR_STYLE];
/** @category Nodes */
declare const COLLECTION_STYLE: {
    readonly BLOCK: 1;
    readonly FLOW: 2;
};
/** @category Nodes */
type CollectionStyle = typeof COLLECTION_STYLE[keyof typeof COLLECTION_STYLE];
/** @category Nodes */
declare const CHOMPING_MODE: {
    readonly CLIP: 1;
    readonly STRIP: 2;
    readonly KEEP: 3;
};
/** @category Nodes */
type ChompingMode = typeof CHOMPING_MODE[keyof typeof CHOMPING_MODE];
/** @category Events */
type DocumentDirective = {
    kind: 'yaml';
    version: string;
} | {
    kind: 'tag';
    handle: string;
    prefix: string;
};
/** @category Events */
interface DocumentEvent {
    type: typeof EVENT_ID.DOCUMENT;
    explicitStart: boolean;
    explicitEnd: boolean;
    directives: DocumentDirective[];
}
/** @category Events */
interface SequenceEvent {
    type: typeof EVENT_ID.SEQUENCE;
    start: number;
    anchorStart: number;
    anchorEnd: number;
    tagStart: number;
    tagEnd: number;
    style: CollectionStyle;
}
/** @category Events */
interface MappingEvent {
    type: typeof EVENT_ID.MAPPING;
    start: number;
    anchorStart: number;
    anchorEnd: number;
    tagStart: number;
    tagEnd: number;
    style: CollectionStyle;
}
/**
 * A scalar whose decoded value can be read with {@link getScalarValue}.
 *
 * @category Events
 */
interface ScalarEvent {
    type: typeof EVENT_ID.SCALAR;
    valueStart: number;
    valueEnd: number;
    anchorStart: number;
    anchorEnd: number;
    tagStart: number;
    tagEnd: number;
    style: ScalarStyle;
    chomping: ChompingMode;
    indent: number;
    fast: boolean;
}
/** @category Events */
interface AliasEvent {
    type: typeof EVENT_ID.ALIAS;
    anchorStart: number;
    anchorEnd: number;
}
/**
 * Closes the most recently opened document, sequence, or mapping.
 *
 * @category Events
 */
interface PopEvent {
    type: typeof EVENT_ID.POP;
}
/**
 * Source ranges are zero-based and end-exclusive; `-1` means absent.
 *
 * @category Events
 */
type Event = DocumentEvent | SequenceEvent | MappingEvent | ScalarEvent | AliasEvent | PopEvent;

/** @category Events */
interface ConstructorOptions {
    /** Source text referenced by offsets in `events`. */
    source: string;
    filename?: string;
    /**
     * Schema to use.
     *
     * @defaultValue {@link CORE_SCHEMA}
     */
    schema?: Schema;
    /**
     * Enables compatibility with `JSON.parse` behavior. Duplicate keys in a
     * mapping override values instead of throwing an error.
     *
     * @defaultValue `false`
     */
    json?: boolean;
    /**
     * Maximum total number of keys processed by merge (`<<`) across one load
     * call. Each member of a merge sequence also counts as one key. Set to `-1`
     * to disable the limit.
     *
     * @defaultValue `10000`
     */
    maxTotalMergeKeys?: number;
    /**
     * Maximum number of alias nodes (`*ref`) per document. Set to `0` to reject
     * all aliases, or to `-1` for no limit.
     *
     * @defaultValue `-1`
     */
    maxAliases?: number;
}
/**
 * Constructs JavaScript documents directly from parser events, without an
 * intermediate AST.
 *
 * @category Events
 */
declare function constructFromEvents(events: Event[], options: ConstructorOptions): unknown[];

/** @category Events */
interface ParserOptions {
    /**
     * File path used in error messages.
     *
     * @defaultValue `null`
     */
    filename?: string;
    /**
     * Maximum nesting depth for collections. Aliases are not taken into account.
     *
     * @defaultValue `100`
     */
    maxDepth?: number;
}
/**
 * Parses YAML into a flat event stream referencing source text by offsets.
 *
 * @category Events
 */
declare function parseEvents(input: string, options: ParserOptions): Event[];

/** @category Main */
interface LoadOptions extends ParserOptions, Omit<ConstructorOptions, 'source'> {
}
/** @inline */
type LoadAllIterator = (document: unknown) => void;
/**
 * Same as {@link load}, but understands multi-document sources.
 * Returns an array of documents.
 *
 * @category Main
 */
declare function loadAll(input: string, options?: LoadOptions): unknown[];
/**
 * @deprecated Iterator is not supported.
 */
declare function loadAll(input: string, iterator: null, options?: LoadOptions): unknown[];
/**
 * @deprecated Iterator is not supported.
 */
declare function loadAll(input: string, iterator: LoadAllIterator, options?: LoadOptions): void;
/**
 * Parses `string` as a single YAML document. Throws {@link YAMLException} on
 * error. This function does not understand multi-document or empty sources; it
 * throws an exception on those.
 *
 * > [!NOTE]
 * > 1. When processing untrusted input, see the
 * >    [security considerations](../docs/safety.md).
 * > 2. All exceptions MUST be caught, not just {@link YAMLException}.
 * > 3. The default {@link CORE_SCHEMA} comes without the `!!merge` tag. You can
 * >    easily enable it if needed.
 * > 4. The default {@link mapTag} is `{}`-object based, with known limitations
 * >    (see description). For full compatibility use {@link realMapTag}
 * >    instead (it uses native JS `Map`).
 *
 * @example
 * Enable {@link mergeTag} and {@link realMapTag}:
 *
 * ```javascript
 * import { load, CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
 *
 * try {
 *   load(data, { schema: CORE_SCHEMA.withTags(mergeTag, realMapTag) })
 * } catch (e) {
 *   console.error(e)
 * }
 * ```
 *
 * @category Main
 */
declare function load(input: string, options?: LoadOptions): unknown;

/** @category Nodes */
interface NodeBase {
    /**
     * YAML tag. Untagged nodes carry the semantic resolved tag; tagged nodes carry
     * the printable/verbatim tag spelling.
     */
    tag: string;
    /** Whether to print the node's tag explicitly. */
    tagged: boolean;
    anchor?: string;
    /** Reserved for the formatting layer; not populated by the dumper yet. */
    commentBefore?: string;
    comment?: string;
    commentAfter?: string;
    blankBefore?: number;
}
/** @category Nodes */
interface ScalarNode extends NodeBase {
    kind: 'scalar';
    /** Preferred scalar style; the presenter may fall back when necessary. */
    style: ScalarStyle;
    value: string;
}
/** @category Nodes */
interface SequenceNode extends NodeBase {
    kind: 'sequence';
    style: CollectionStyle;
    items: Node[];
}
/** @category Nodes */
interface MappingNode extends NodeBase {
    kind: 'mapping';
    style: CollectionStyle;
    items: Array<{
        key: Node;
        value: Node;
    }>;
}
/** @category Nodes */
interface AliasNode {
    kind: 'alias';
    /** The anchor name this alias points at (`*name`). */
    anchor: string;
}
/** @category Nodes */
type Node = ScalarNode | SequenceNode | MappingNode | AliasNode;
/**
 * The layer above {@link Node}: each document wraps one content node plus its
 * own markers/directives. Not a member of {@link Node} — the fields differ.
 * Document directives are ordered presentation data.
 *
 * @category Nodes
 */
interface Document {
    /** null = empty document */
    contents: Node | null;
    /** print '---' */
    explicitStart?: boolean;
    /** print '...' */
    explicitEnd?: boolean;
    directives: DocumentDirective[];
}

/** Scalar presentation state passed to styling rules. @category AST */
interface ScalarLayout {
    readonly node: Readonly<ScalarNode>;
    readonly parent: Readonly<Node> | null;
    readonly level: number;
    readonly isKey: boolean;
    readonly flowOnly: boolean;
    readonly shiftOfParent: number;
    readonly shiftOfContent: number;
    readonly shiftOfFirstLine: number;
    readonly presenterOptions: Readonly<Required<PresenterOptions>>;
    /**
     * Bit mask of allowed styles; each bit corresponds to a {@link SCALAR_STYLE}
     * value.
     */
    allowedStylesMask: number;
    /**
     * Selected output style, which styling rules may modify. To avoid overriding
     * earlier decisions, a rule should normally modify it only while it is
     * {@link SCALAR_STYLE.PLAIN}.
     */
    style: ScalarStyle;
}
/** Function signature for scalar styling rules. @category AST */
type ScalarStyleRule = (layout: ScalarLayout) => void;

/** @category AST */
interface PresenterOptions {
    /** Schema used when selecting a safe scalar style. */
    schema: Schema;
    /**
     * Indentation width in spaces.
     *
     * @defaultValue `2`
     */
    indent?: number;
    /**
     * Does not add an indentation level to array elements when enabled.
     *
     * @defaultValue `false`
     */
    seqNoIndent?: boolean;
    /**
     * Allows a nested collection to start on the same line after `-`.
     *
     * @defaultValue `true`
     */
    seqInlineFirst?: boolean;
    /**
     * Preferred line width for folding. Unbreakable and more-indented lines may
     * exceed it. Set to `-1` for unlimited width.
     *
     * @defaultValue `80`
     */
    lineWidth?: number;
    /**
     * Adds spaces inside flow collection brackets: `{a: 1}` becomes `{ a: 1 }`.
     *
     * @defaultValue `false`
     */
    flowBracketPadding?: boolean;
    /**
     * Omits the space after commas in flow collections: `[1, 2]` becomes
     * `[1,2]`.
     *
     * @defaultValue `false`
     */
    flowSkipCommaSpace?: boolean;
    /**
     * Omits the space after `:` in flow mappings: `{"a": 1}` becomes `{"a":1}`.
     *
     * This forces `quoteFlowKeys`; otherwise `a:1` would be parsed as a single
     * plain scalar instead of a mapping entry.
     *
     * @defaultValue `false`
     */
    flowSkipColonSpace?: boolean;
    /**
     * Quotes flow mapping keys: `{a: 1}` becomes `{"a": 1}`.
     *
     * @defaultValue `false`
     */
    quoteFlowKeys?: boolean;
    /**
     * Quoting style to use when a string needs quotes.
     *
     * @defaultValue `'single'`
     */
    quoteStyle?: 'single' | 'double';
    /**
     * Quotes all non-key strings using {@link quoteStyle}.
     *
     * @defaultValue `false`
     */
    forceQuotes?: boolean;
    /**
     * Customizes how strings are rendered as plain, quoted, literal, or folded
     * scalars. Rules are applied in array order; providing this option replaces
     * the {@link DEFAULT_SCALAR_STYLE_RULES default rules}.
     *
     * @defaultValue `Object.values(DEFAULT_SCALAR_STYLE_RULES)`
     */
    scalarStyleRules?: readonly ScalarStyleRule[];
    /**
     * Prints an explicit tag before an anchor: `&ref_0 !!set` becomes
     * `!!set &ref_0`.
     *
     * @defaultValue `false`
     */
    tagBeforeAnchor?: boolean;
}
/**
 * Build YAML from AST.
 *
 * @category AST
 */
declare function present(documents: Document[], options: PresenterOptions): string;

/** @category Main */
interface DumpOptions extends Omit<PresenterOptions, 'schema'> {
    /**
     * Schema to use.
     *
     * @defaultValue {@link DUMP_SCHEMA}
     */
    schema?: Schema;
    /**
     * Skips invalid types instead of throwing. Invalid mapping pairs and sequence
     * items are skipped; `undefined` sequence items are serialized as `null`.
     *
     * @defaultValue `false`
     */
    skipInvalid?: boolean;
    /**
     * Inlines duplicate objects instead of converting them into references.
     *
     * @defaultValue `false`
     */
    noRefs?: boolean;
    /**
     * Nesting level at which collections switch from block to flow style. Set to
     * `-1` to never switch automatically.
     *
     * @defaultValue `-1`
     */
    flowLevel?: number;
    /**
     * Sorts mapping keys when `true`. A function can be provided to define the
     * sort order.
     *
     * @defaultValue `false`
     * @deprecated Use {@link transform} to reorder mapping items.
     */
    sortKeys?: boolean | ((a: any, b: any) => number);
    /**
     * Mutates the generated AST before it is rendered.
     *
     * @example Sort mapping keys:
     *
     * ```typescript
     * import { dump, visit } from 'js-yaml'
     *
     * dump(value, {
     *   transform: documents => visit(documents, node => {
     *     if (node.kind === 'mapping') node.items.sort((a, b) => {
     *       const x = a.key.kind === 'scalar' ? a.key.value : ''
     *       const y = b.key.kind === 'scalar' ? b.key.value : ''
     *       return x.localeCompare(y)
     *     })
     *   })
     * })
     * ```
     */
    transform?: (documents: Document[]) => void;
}
/**
 * Serializes JS object as a YAML document. By default it can dump every
 * supported YAML type, so it throws an exception if you try to dump regexps or
 * functions. However, you can disable exceptions by setting the
 * {@link DumpOptions.skipInvalid} option to `true`.
 *
 * @category Main
 */
declare function dump(input: any, options?: DumpOptions): string;

interface SnippetMark {
    name?: string | null;
    buffer: string;
    position: number;
    line: number;
    column: number;
    snippet?: string | null;
}

/**
 * A YAML error. Unlike an ordinary `Error`, it adds a source snippet showing
 * the location of the problem to the error message, when available.
 *
 * @category Main
 */
declare class YAMLException extends Error {
    reason: string;
    mark?: SnippetMark;
    /**
     * Optional `mark` contains source snippet data. Usually, use
     * {@link YAMLException.throwAt} instead of passing it directly.
     */
    constructor(reason: string, mark?: SnippetMark);
    /**
     * Returns the formatted error, omitting the source snippet in compact mode.
     */
    toString(compact?: boolean): string;
    /**
     * Builds a YAMLException with a source snippet and throws it. `source` is
     * the raw input text; `position` is an offset into it.
     */
    static throwAt(source: string, position: number, message: string, filename?: string): never;
}

/**
 * Decodes the scalar referenced by event offsets in `input`.
 *
 * @category Events
 */
declare function getScalarValue(input: string, scalar: ScalarEvent): string;

/** @category AST */
interface FromEventsOptions {
    /** Source text referenced by offsets in `events`. */
    source: string;
    /** Schema used to resolve implicit scalar tags. */
    schema: Schema;
}
/**
 * Builds an AST from parser events
 *
 * @category AST
 */
declare function eventsToAst(events: Event[], options: FromEventsOptions): Document[];

/** @category AST */
interface FromJsOptions {
    /** Inlines duplicate objects instead of converting them into references. */
    noRefs?: boolean;
    /**
     * Skips unrepresentable values instead of throwing. Invalid mapping pairs
     * and sequence items are skipped; `undefined` sequence items become `null`.
     */
    skipInvalid?: boolean;
}
/**
 * Convert JS object to AST. A JS value is one YAML document. An unrepresentable
 * root becomes an empty document, which the presenter renders as an empty
 * string.
 *
 * @category AST
 */
declare function jsToAst(input: unknown, schema: Schema, options?: FromJsOptions): Document[];

/**
 * Default scalar styling rules in application order.
 * See [Scalar styling](../../docs/scalar_styling.md) for usage details.
 *
 * @category AST
 */
declare const DEFAULT_SCALAR_STYLE_RULES: {
    readonly applyQuoteFlowKeysOption: typeof applyQuoteFlowKeysOption;
    readonly doubleQuoteForInvisibles: typeof doubleQuoteForInvisibles;
    readonly doubleQuoteWhitespaceOnly: typeof doubleQuoteWhitespaceOnly;
    readonly applyForceQuotesOption: typeof applyForceQuotesOption;
    readonly tryLongOrMultilineAsBlock: typeof tryLongOrMultilineAsBlock;
    readonly quoteInvalidPlain: typeof quoteInvalidPlain;
    readonly fallbackToDoubleQuoted: typeof fallbackToDoubleQuoted;
};
declare function applyQuoteFlowKeysOption(layout: ScalarLayout): void;
declare function doubleQuoteForInvisibles(layout: ScalarLayout): void;
declare function doubleQuoteWhitespaceOnly(layout: ScalarLayout): void;
declare function applyForceQuotesOption(layout: ScalarLayout): void;
declare function tryLongOrMultilineAsBlock(layout: ScalarLayout): void;
declare function quoteInvalidPlain(layout: ScalarLayout): void;
declare function fallbackToDoubleQuoted(layout: ScalarLayout): void;

/**
 * Return from a visitor to stop the whole traversal.
 *
 * @category AST
 */
declare const VISIT_BREAK: unique symbol;
/**
 * Return from a visitor to skip the current node's children.
 *
 * @category AST
 */
declare const VISIT_SKIP: unique symbol;
/** @inline */
type VisitControl = typeof VISIT_BREAK | typeof VISIT_SKIP | undefined | void;
/**
 * Traversal-derived position of the current node. Kept off the node itself: a
 * node may sit in several places (alias/dedup reuse), so depth/role belong to
 * the walk, not the node. {@link VisitContext.parent} `kind` +
 * {@link VisitContext.isKey} pin the exact slot.
 *
 * @category AST
 */
interface VisitContext {
    /** 0 = document content root */
    depth: number;
    /** Enclosing sequence/mapping, null at the root */
    parent: Node | null;
    /** Node sits in a mapping key position */
    isKey: boolean;
}
/** @category AST */
type Visitor = (node: Node, ctx: VisitContext) => VisitControl;
/**
 * Walk every node in the documents, calling {@link Visitor} once per
 * node (pre-order).
 *
 * @category AST
 */
declare function visit(documents: Document[], visitor: Visitor): void;

/** @deprecated Use `EVENT_ID.DOCUMENT` instead. @internal */
declare const EVENT_DOCUMENT: 1;
/** @deprecated Use `EVENT_ID.SEQUENCE` instead. @internal */
declare const EVENT_SEQUENCE: 2;
/** @deprecated Use `EVENT_ID.MAPPING` instead. @internal */
declare const EVENT_MAPPING: 3;
/** @deprecated Use `EVENT_ID.SCALAR` instead. @internal */
declare const EVENT_SCALAR: 4;
/** @deprecated Use `EVENT_ID.ALIAS` instead. @internal */
declare const EVENT_ALIAS: 5;
/** @deprecated Use `EVENT_ID.POP` instead. @internal */
declare const EVENT_POP: 6;
/** @deprecated Use `SCALAR_STYLE.PLAIN` instead. @internal */
declare const SCALAR_STYLE_PLAIN: 1;
/** @deprecated Use `SCALAR_STYLE.SINGLE_QUOTED` instead. @internal */
declare const SCALAR_STYLE_SINGLE_QUOTED: 2;
/** @deprecated Use `SCALAR_STYLE.DOUBLE_QUOTED` instead. @internal */
declare const SCALAR_STYLE_DOUBLE_QUOTED: 3;
/** @deprecated Use `SCALAR_STYLE.LITERAL_BLOCK` instead. @internal */
declare const SCALAR_STYLE_LITERAL_BLOCK: 4;
/** @deprecated Use `SCALAR_STYLE.FOLDED_BLOCK` instead. @internal */
declare const SCALAR_STYLE_FOLDED_BLOCK: 5;
/** @deprecated Use `COLLECTION_STYLE.BLOCK` instead. @internal */
declare const COLLECTION_STYLE_BLOCK: 1;
/** @deprecated Use `COLLECTION_STYLE.FLOW` instead. @internal */
declare const COLLECTION_STYLE_FLOW: 2;
/** @deprecated Use `CHOMPING_MODE.CLIP` instead. @internal */
declare const CHOMPING_CLIP: 1;
/** @deprecated Use `CHOMPING_MODE.STRIP` instead. @internal */
declare const CHOMPING_STRIP: 2;
/** @deprecated Use `CHOMPING_MODE.KEEP` instead. @internal */
declare const CHOMPING_KEEP: 3;

export { CHOMPING_CLIP, CHOMPING_KEEP, CHOMPING_MODE, CHOMPING_STRIP, COLLECTION_STYLE, COLLECTION_STYLE_BLOCK, COLLECTION_STYLE_FLOW, CORE_SCHEMA, DEFAULT_SCALAR_STYLE_RULES, DUMP_SCHEMA, EVENT_ALIAS, EVENT_DOCUMENT, EVENT_ID, EVENT_MAPPING, EVENT_POP, EVENT_SCALAR, EVENT_SEQUENCE, FAILSAFE_SCHEMA, JSON_SCHEMA, NOT_RESOLVED, SCALAR_STYLE, SCALAR_STYLE_DOUBLE_QUOTED, SCALAR_STYLE_FOLDED_BLOCK, SCALAR_STYLE_LITERAL_BLOCK, SCALAR_STYLE_PLAIN, SCALAR_STYLE_SINGLE_QUOTED, Schema, VISIT_BREAK, VISIT_SKIP, YAML11_SCHEMA, YAMLException, binaryTag, boolCoreTag, boolJsonTag, boolYaml11Tag, constructFromEvents, defineMappingTag, defineScalarTag, defineSequenceTag, dump, eventsToAst, floatCoreTag, floatJsonTag, floatYaml11Tag, getScalarValue, intCoreTag, intJsonTag, intYaml11Tag, jsToAst, legacyMapTag, load, loadAll, mapTag, mergeTag, nullCoreTag, nullJsonTag, nullYaml11Tag, omapTag, pairsTag, parseEvents, present, realMapTag, seqTag, setTag, strTag, timestampTag, visit };
export type { AliasEvent, AliasNode, ChompingMode, CollectionStyle, ConstructorOptions, Document, DocumentDirective, DocumentEvent, DumpOptions, Event, EventId, FromEventsOptions, FromJsOptions, LoadOptions, MappingEvent, MappingNode, MappingTagDefinition, MappingTagOptions, Node, NodeBase, ParserOptions, PopEvent, PresenterOptions, ScalarEvent, ScalarLayout, ScalarNode, ScalarStyle, ScalarStyleRule, ScalarTagDefinition, ScalarTagOptions, SequenceEvent, SequenceNode, SequenceTagDefinition, SequenceTagOptions, TagDefinition, VisitContext, Visitor };
