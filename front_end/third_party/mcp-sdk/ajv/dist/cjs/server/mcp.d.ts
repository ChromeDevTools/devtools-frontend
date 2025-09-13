import { Server, ServerOptions } from "./index.js";
import { z, ZodRawShape, ZodObject, AnyZodObject, ZodTypeAny, ZodType, ZodTypeDef, ZodOptional } from "zod";
import { Implementation, CallToolResult, Resource, ListResourcesResult, GetPromptResult, ReadResourceResult, ServerRequest, ServerNotification, ToolAnnotations } from "../types.js";
import { UriTemplate, Variables } from "../shared/uriTemplate.js";
import { RequestHandlerExtra } from "../shared/protocol.js";
import { Transport } from "../shared/transport.js";
/**
 * High-level MCP server that provides a simpler API for working with resources, tools, and prompts.
 * For advanced usage (like sending notifications or setting custom request handlers), use the underlying
 * Server instance available via the `server` property.
 */
export declare class McpServer {
    /**
     * The underlying Server instance, useful for advanced operations like sending notifications.
     */
    readonly server: Server;
    private _registeredResources;
    private _registeredResourceTemplates;
    private _registeredTools;
    private _registeredPrompts;
    constructor(serverInfo: Implementation, options?: ServerOptions);
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The `server` object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    connect(transport: Transport): Promise<void>;
    /**
     * Closes the connection.
     */
    close(): Promise<void>;
    private _toolHandlersInitialized;
    private setToolRequestHandlers;
    private _completionHandlerInitialized;
    private setCompletionRequestHandler;
    private handlePromptCompletion;
    private handleResourceCompletion;
    private _resourceHandlersInitialized;
    private setResourceRequestHandlers;
    private _promptHandlersInitialized;
    private setPromptRequestHandlers;
    /**
     * Registers a resource `name` at a fixed URI, which will use the given callback to respond to read requests.
     */
    resource(name: string, uri: string, readCallback: ReadResourceCallback): RegisteredResource;
    /**
     * Registers a resource `name` at a fixed URI with metadata, which will use the given callback to respond to read requests.
     */
    resource(name: string, uri: string, metadata: ResourceMetadata, readCallback: ReadResourceCallback): RegisteredResource;
    /**
     * Registers a resource `name` with a template pattern, which will use the given callback to respond to read requests.
     */
    resource(name: string, template: ResourceTemplate, readCallback: ReadResourceTemplateCallback): RegisteredResourceTemplate;
    /**
     * Registers a resource `name` with a template pattern and metadata, which will use the given callback to respond to read requests.
     */
    resource(name: string, template: ResourceTemplate, metadata: ResourceMetadata, readCallback: ReadResourceTemplateCallback): RegisteredResourceTemplate;
    private _createRegisteredTool;
    /**
     * Registers a zero-argument tool `name`, which will run the given function when the client calls it.
     */
    tool(name: string, cb: ToolCallback): RegisteredTool;
    /**
     * Registers a zero-argument tool `name` (with a description) which will run the given function when the client calls it.
     */
    tool(name: string, description: string, cb: ToolCallback): RegisteredTool;
    /**
     * Registers a tool taking either a parameter schema for validation or annotations for additional metadata.
     * This unified overload handles both `tool(name, paramsSchema, cb)` and `tool(name, annotations, cb)` cases.
     *
     * Note: We use a union type for the second parameter because TypeScript cannot reliably disambiguate
     * between ToolAnnotations and ZodRawShape during overload resolution, as both are plain object types.
     */
    tool<Args extends ZodRawShape>(name: string, paramsSchemaOrAnnotations: Args | ToolAnnotations, cb: ToolCallback<Args>): RegisteredTool;
    /**
     * Registers a tool `name` (with a description) taking either parameter schema or annotations.
     * This unified overload handles both `tool(name, description, paramsSchema, cb)` and
     * `tool(name, description, annotations, cb)` cases.
     *
     * Note: We use a union type for the third parameter because TypeScript cannot reliably disambiguate
     * between ToolAnnotations and ZodRawShape during overload resolution, as both are plain object types.
     */
    tool<Args extends ZodRawShape>(name: string, description: string, paramsSchemaOrAnnotations: Args | ToolAnnotations, cb: ToolCallback<Args>): RegisteredTool;
    /**
     * Registers a tool with both parameter schema and annotations.
     */
    tool<Args extends ZodRawShape>(name: string, paramsSchema: Args, annotations: ToolAnnotations, cb: ToolCallback<Args>): RegisteredTool;
    /**
     * Registers a tool with description, parameter schema, and annotations.
     */
    tool<Args extends ZodRawShape>(name: string, description: string, paramsSchema: Args, annotations: ToolAnnotations, cb: ToolCallback<Args>): RegisteredTool;
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(name: string, config: {
        description?: string;
        inputSchema?: InputArgs;
        outputSchema?: OutputArgs;
        annotations?: ToolAnnotations;
    }, cb: ToolCallback<InputArgs>): RegisteredTool;
    /**
     * Registers a zero-argument prompt `name`, which will run the given function when the client calls it.
     */
    prompt(name: string, cb: PromptCallback): RegisteredPrompt;
    /**
     * Registers a zero-argument prompt `name` (with a description) which will run the given function when the client calls it.
     */
    prompt(name: string, description: string, cb: PromptCallback): RegisteredPrompt;
    /**
     * Registers a prompt `name` accepting the given arguments, which must be an object containing named properties associated with Zod schemas. When the client calls it, the function will be run with the parsed and validated arguments.
     */
    prompt<Args extends PromptArgsRawShape>(name: string, argsSchema: Args, cb: PromptCallback<Args>): RegisteredPrompt;
    /**
     * Registers a prompt `name` (with a description) accepting the given arguments, which must be an object containing named properties associated with Zod schemas. When the client calls it, the function will be run with the parsed and validated arguments.
     */
    prompt<Args extends PromptArgsRawShape>(name: string, description: string, argsSchema: Args, cb: PromptCallback<Args>): RegisteredPrompt;
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected(): boolean;
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged(): void;
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged(): void;
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged(): void;
}
/**
 * A callback to complete one variable within a resource template's URI template.
 */
export type CompleteResourceTemplateCallback = (value: string) => string[] | Promise<string[]>;
/**
 * A resource template combines a URI pattern with optional functionality to enumerate
 * all resources matching that pattern.
 */
export declare class ResourceTemplate {
    private _callbacks;
    private _uriTemplate;
    constructor(uriTemplate: string | UriTemplate, _callbacks: {
        /**
         * A callback to list all resources matching this template. This is required to specified, even if `undefined`, to avoid accidentally forgetting resource listing.
         */
        list: ListResourcesCallback | undefined;
        /**
         * An optional callback to autocomplete variables within the URI template. Useful for clients and users to discover possible values.
         */
        complete?: {
            [variable: string]: CompleteResourceTemplateCallback;
        };
    });
    /**
     * Gets the URI template pattern.
     */
    get uriTemplate(): UriTemplate;
    /**
     * Gets the list callback, if one was provided.
     */
    get listCallback(): ListResourcesCallback | undefined;
    /**
     * Gets the callback for completing a specific URI template variable, if one was provided.
     */
    completeCallback(variable: string): CompleteResourceTemplateCallback | undefined;
}
/**
 * Callback for a tool handler registered with Server.tool().
 *
 * Parameters will include tool arguments, if applicable, as well as other request handler context.
 *
 * The callback should return:
 * - `structuredContent` if the tool has an outputSchema defined
 * - `content` if the tool does not have an outputSchema
 * - Both fields are optional but typically one should be provided
 */
export type ToolCallback<Args extends undefined | ZodRawShape = undefined> = Args extends ZodRawShape ? (args: z.objectOutputType<Args, ZodTypeAny>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult> : (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>;
export type RegisteredTool = {
    description?: string;
    inputSchema?: AnyZodObject;
    outputSchema?: AnyZodObject;
    annotations?: ToolAnnotations;
    callback: ToolCallback<undefined | ZodRawShape>;
    enabled: boolean;
    enable(): void;
    disable(): void;
    update<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(updates: {
        name?: string | null;
        description?: string;
        paramsSchema?: InputArgs;
        outputSchema?: OutputArgs;
        annotations?: ToolAnnotations;
        callback?: ToolCallback<InputArgs>;
        enabled?: boolean;
    }): void;
    remove(): void;
};
/**
 * Additional, optional information for annotating a resource.
 */
export type ResourceMetadata = Omit<Resource, "uri" | "name">;
/**
 * Callback to list all resources matching a given template.
 */
export type ListResourcesCallback = (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => ListResourcesResult | Promise<ListResourcesResult>;
/**
 * Callback to read a resource at a given URI.
 */
export type ReadResourceCallback = (uri: URL, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => ReadResourceResult | Promise<ReadResourceResult>;
export type RegisteredResource = {
    name: string;
    metadata?: ResourceMetadata;
    readCallback: ReadResourceCallback;
    enabled: boolean;
    enable(): void;
    disable(): void;
    update(updates: {
        name?: string;
        uri?: string | null;
        metadata?: ResourceMetadata;
        callback?: ReadResourceCallback;
        enabled?: boolean;
    }): void;
    remove(): void;
};
/**
 * Callback to read a resource at a given URI, following a filled-in URI template.
 */
export type ReadResourceTemplateCallback = (uri: URL, variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => ReadResourceResult | Promise<ReadResourceResult>;
export type RegisteredResourceTemplate = {
    resourceTemplate: ResourceTemplate;
    metadata?: ResourceMetadata;
    readCallback: ReadResourceTemplateCallback;
    enabled: boolean;
    enable(): void;
    disable(): void;
    update(updates: {
        name?: string | null;
        template?: ResourceTemplate;
        metadata?: ResourceMetadata;
        callback?: ReadResourceTemplateCallback;
        enabled?: boolean;
    }): void;
    remove(): void;
};
type PromptArgsRawShape = {
    [k: string]: ZodType<string, ZodTypeDef, string> | ZodOptional<ZodType<string, ZodTypeDef, string>>;
};
export type PromptCallback<Args extends undefined | PromptArgsRawShape = undefined> = Args extends PromptArgsRawShape ? (args: z.objectOutputType<Args, ZodTypeAny>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => GetPromptResult | Promise<GetPromptResult> : (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => GetPromptResult | Promise<GetPromptResult>;
export type RegisteredPrompt = {
    description?: string;
    argsSchema?: ZodObject<PromptArgsRawShape>;
    callback: PromptCallback<undefined | PromptArgsRawShape>;
    enabled: boolean;
    enable(): void;
    disable(): void;
    update<Args extends PromptArgsRawShape>(updates: {
        name?: string | null;
        description?: string;
        argsSchema?: Args;
        callback?: PromptCallback<Args>;
        enabled?: boolean;
    }): void;
    remove(): void;
};
export {};
//# sourceMappingURL=mcp.d.ts.map