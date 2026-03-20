/**
 * Type contains the list of OpenAPI data types.
 */
export declare enum Type {
    TYPE_UNSPECIFIED = 0,
    STRING = 1,
    NUMBER = 2,
    INTEGER = 3,
    BOOLEAN = 4,
    ARRAY = 5,
    OBJECT = 6,
    NULL = 7
}
/**
 * The category of a rating.
 */
export declare enum HarmCategory {
    HARM_CATEGORY_UNSPECIFIED = 0,
    HARM_CATEGORY_HARASSMENT = 7,
    HARM_CATEGORY_HATE_SPEECH = 8,
    HARM_CATEGORY_SEXUALLY_EXPLICIT = 9,
    HARM_CATEGORY_DANGEROUS_CONTENT = 10
}
/**
 * The probability that a piece of content is harmful.
 */
export declare enum HarmProbability {
    HARM_PROBABILITY_UNSPECIFIED = 0,
    NEGLIGIBLE = 1,
    LOW = 2,
    MEDIUM = 3,
    HIGH = 4
}
/**
 * Block at and beyond a specified harm probability.
 */
export declare enum HarmBlockThreshold {
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = 0,
    BLOCK_LOW_AND_ABOVE = 1,
    BLOCK_MEDIUM_AND_ABOVE = 2,
    BLOCK_ONLY_HIGH = 3,
    BLOCK_NONE = 4,
    OFF = 5
}
export declare enum HarmBlockMethod {
    HARM_BLOCK_METHOD_UNSPECIFIED = 0,
    SEVERITY = 1,
    PROBABILITY = 2
}
/**
 * Defines the reason why the model stopped generating tokens.
 */
export declare enum FinishReason {
    FINISH_REASON_UNSPECIFIED = 0,
    STOP = 1,
    MAX_TOKENS = 2,
    SAFETY = 3,
    RECITATION = 4,
    OTHER = 5,
    BLOCKLIST = 6,
    PROHIBITED_CONTENT = 7,
    SPII = 8,
    MALFORMED_FUNCTION_CALL = 9,
    IMAGE_SAFETY = 10,
    IMAGE_PROHIBITED_CONTENT = 11,
    IMAGE_RECITATION = 12,
    IMAGE_OTHER = 13,
    UNEXPECTED_TOOL_CALL = 14,
    NO_IMAGE = 15
}
/**
 * The suggestion method used.
 */
export declare enum Method {
    METHOD_UNSPECIFIED = 0,
    GENERATE_CODE = 1,
    COMPLETE_CODE = 2,
    TRANSFORM_CODE = 3,
    CHAT = 4
}
/**
 * The status of the suggestion received.
 */
export declare enum SuggestionStatus {
    STATUS_UNSPECIFIED = 0,
    NO_ERROR = 1,
    ERROR = 2,
    CANCELLED = 3,
    EMPTY = 4
}
/**
 * The type of interaction.
 */
export declare enum InteractionType {
    INTERACTION_TYPE_UNSPECIFIED = 0,
    THUMBS_UP = 1,
    THUMBS_DOWN = 2,
    ACCEPT = 3,
    ACCEPT_PARTIALLY = 4,
    REJECT = 5,
    COPY = 6
}
export declare enum InclusionReason {
    INCLUSION_REASON_UNSPECIFIED = 0,
    ACTIVE = 1,
    OPEN = 2,
    RECENTLY_CLOSED = 3,
    RECENTLY_EDITED = 4,
    COLOCATED = 5,
    RELATED = 6,
    USER_SELECTED = 7
}
/**
 * A list of reasons why content may have been blocked.
 */
export declare enum BlockReason {
    BLOCKED_REASON_UNSPECIFIED = 0,
    SAFETY = 1,
    OTHER = 2,
    BLOCKLIST = 3,
    PROHIBITED_CONTENT = 4,
    IMAGE_SAFETY = 5
}
/**
 * Supported programming languages for the generated code.
 */
export declare enum Language {
    LANGUAGE_UNSPECIFIED = 0,
    PYTHON = 1
}
/**
 * Enumeration of possible outcomes of the code execution.
 */
export declare enum Outcome {
    OUTCOME_UNSPECIFIED = 0,
    OUTCOME_OK = 1,
    OUTCOME_FAILED = 2,
    OUTCOME_DEADLINE_EXCEEDED = 3
}
/**
 * Defines the execution behavior for function calling.
 */
export declare enum Mode {
    MODE_UNSPECIFIED = 0,
    AUTO = 1,
    ANY = 2,
    NONE = 3
}
export interface GenerateContentRequest {
    model?: string;
    aicode?: AiCodeConfig;
    contents: Content[];
    system_instruction?: Content;
    tools?: Tool[];
    tool_config?: ToolConfig;
    labels?: Record<string, string>;
    safety_settings?: SafetySetting[];
    generation_config?: GenerationConfig;
    session_id?: string;
}
export interface AiCodeConfig {
    experience: string;
    files?: SourceFile[];
}
export interface SourceFile {
    inclusion_reason?: InclusionReason[];
    file_uri: string;
    programming_language?: string;
}
export interface FileEdit {
    file_uri: string;
    content: string;
}
export type Role = 'user' | 'model';
export interface Content {
    parts?: Part[];
    role: Role;
}
export interface Part {
    text?: string;
    inline_data?: Blob;
    file_data?: FileData;
    function_call?: FunctionCall;
    function_response?: FunctionResponse;
    executable_code?: ExecutableCode;
    code_execution_result?: CodeExecutionResult;
    video_metadata?: VideoMetadata;
    thought?: boolean;
    thought_signature?: string;
}
export interface Blob {
    mime_type: string;
    data: string;
}
export interface FileData {
    mime_type: string;
    file_uri: string;
}
export interface FunctionCall {
    name: string;
    args?: Record<string, unknown>;
    id?: string;
}
export interface FunctionResponse {
    name: string;
    response: Record<string, unknown>;
    id?: string;
}
export interface ExecutableCode {
    language: Language;
    code: string;
}
export interface CodeExecutionResult {
    outcome: Outcome;
    output: string;
}
export interface Tool {
    function_declarations?: FunctionDeclaration[];
    google_search?: {
        time_range_filter?: {
            start_time?: string;
            end_time?: string;
        };
    };
}
export interface FunctionDeclaration {
    name: string;
    description: string;
    parameters?: Schema;
    parameters_json_schema?: unknown;
    response?: Schema;
    response_json_schema?: unknown;
}
export interface Schema {
    type?: Type;
    format?: string;
    description?: string;
    nullable?: boolean;
    enum?: string[];
    items?: Schema;
    properties?: Record<string, Schema>;
    required?: string[];
    minimum?: number;
    maximum?: number;
    min_length?: number;
    max_length?: number;
    pattern?: string;
    example?: unknown;
}
export interface ToolConfig {
    function_calling_config?: FunctionCallingConfig;
}
export interface FunctionCallingConfig {
    mode: Mode;
    allowed_function_names?: string[];
}
export interface SafetySetting {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
    method?: HarmBlockMethod;
}
export interface GenerationConfig {
    candidate_count?: number;
    stop_sequences?: string[];
    max_output_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    seed?: number;
    response_mime_type?: string;
    response_schema?: Schema;
    response_json_schema?: unknown;
    presence_penalty?: number;
    frequency_penalty?: number;
    thinking_config?: ThinkingConfig;
}
export interface ThinkingConfig {
    include_thoughts?: boolean;
    thinking_budget?: number;
}
export interface GenerateContentResponse {
    candidates: Candidate[];
    prompt_feedback: PromptFeedback;
    usage_metadata: UsageMetadata;
    model_version: string;
    response_id: string;
}
export interface Candidate {
    index: number;
    content: Content;
    finish_reason: FinishReason;
    safety_ratings: SafetyRating[];
    citation_metadata: CitationMetadata;
    grounding_metadata: GroundingMetadata;
    aicode_output: AiCodeOutput;
}
export interface SafetyRating {
    category: HarmCategory;
    probability: HarmProbability;
    blocked: boolean;
}
export interface CitationMetadata {
    citations: Citation[];
}
export interface Citation {
    start_index: number;
    end_index: number;
    uri: string;
    license: string;
}
export interface GroundingMetadata {
    web_search_queries?: string[];
    search_entry_point?: {
        rendered_content?: string;
        sdk_blob?: string;
    };
    grounding_chunks?: Array<{
        web?: {
            uri?: string;
            title?: string;
        };
    }>;
    grounding_supports?: Array<{
        segment?: {
            part_index?: number;
            start_index?: number;
            end_index?: number;
            text?: string;
        };
        grounding_chunk_indices?: number[];
        confidence_scores?: number[];
    }>;
    retrieval_metadata?: {
        google_search_dynamic_retrieval_score?: number;
    };
}
export interface AiCodeOutput {
    contents: DerivedContent[];
}
export interface DerivedContent {
    start_index?: number;
    end_index?: number;
    file?: OutputSourceFile;
    code_block?: CodeBlock;
    text_block?: TextBlock;
    prediction_metadata?: PredictionMetadata;
}
export interface OutputSourceFile {
    file_uri: string;
    content: string;
}
export interface CodeBlock {
    content: string;
    programming_language: string;
}
export interface TextBlock {
    content: string;
}
export interface PredictionMetadata {
    score: number;
    classifier_score: number;
}
export interface PromptFeedback {
    block_reason: BlockReason;
    safety_ratings: SafetyRating[];
    block_reason_message: string;
}
export interface UsageMetadata {
    prompt_token_count: number;
    candidates_token_count: number;
    total_token_count: number;
    thoughts_token_count: number;
    cached_content_token_count: number;
}
export interface VideoMetadata {
    start_offset?: string;
    end_offset?: string;
    fps?: number;
}
export interface SendTelemetryRequest {
    feedback_metrics: FeedbackMetric[];
}
export interface FeedbackMetric {
    event_time: string;
    response_id: string;
    suggestion_offered?: SuggestionOffered;
    suggestion_interaction?: SuggestionInteraction;
}
export interface SuggestionOffered {
    method?: Method;
    status?: SuggestionStatus;
    first_message_latency?: string;
    response_latency?: string;
    displayed?: boolean;
    e2e_latency?: string;
    display_duration?: string;
    programming_language?: string;
}
export interface SuggestionInteraction {
    interaction?: InteractionType;
    accepted_lines?: number;
    accepted_characters?: number;
    accepted_comment_lines?: number;
    candidate_index?: number;
}
