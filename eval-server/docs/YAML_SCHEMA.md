# YAML Evaluation Schema Documentation

## Overview

This document describes the YAML schema used to define evaluations for each client. Each client has a dedicated YAML file stored in the `clients/` directory, named after their client ID.

## File Location

```
bo-eval-server/
└── clients/
    ├── 550e8400-e29b-41d4-a716-446655440000.yaml
    ├── 771f9500-f39c-52e5-b827-557766551111.yaml
    └── ...
```

## Schema Structure

### Root Level

```yaml
# Client identification and authentication
client:
  id: "550e8400-e29b-41d4-a716-446655440000"  # Required: UUID v4
  name: "Chrome DevTools Agent"                 # Required: Human-readable name
  secret_key: "optional-secret-key"            # Optional: Authentication key
  description: "Production DevTools instance"   # Optional: Client description

# Client-specific settings
settings:
  max_concurrent_evaluations: 3     # Maximum parallel evaluations
  default_timeout: 30000           # Default timeout in milliseconds
  retry_policy:
    max_retries: 2                 # Maximum retry attempts
    backoff_multiplier: 2          # Exponential backoff multiplier
    initial_delay: 1000            # Initial retry delay in ms

# List of evaluations assigned to this client
evaluations:
  - id: "eval-001"
    # ... evaluation definition
  - id: "eval-002"
    # ... evaluation definition
```

### Evaluation Definition

Each evaluation in the `evaluations` array follows this structure:

```yaml
- id: "wikipedia-chrome-devtools-001"        # Required: Unique evaluation ID
  name: "Extract Chrome DevTools Wikipedia"  # Required: Display name
  description: "Extract structured data"     # Optional: Detailed description
  enabled: true                             # Optional: Enable/disable (default: true)
  
  # Target configuration
  target:
    url: "https://en.wikipedia.org/wiki/Chrome_DevTools"  # Required: Target URL
    wait_for: "networkidle"    # Optional: Wait condition (load|domcontentloaded|networkidle)
    wait_timeout: 5000         # Optional: Wait timeout in ms
  
  # Tool configuration
  tool: "extract_schema_data"   # Required: Tool to execute
  timeout: 30000               # Optional: Override default timeout
  
  # Tool-specific input
  input:
    schema:                    # For extract_schema_data tool
      type: "object"
      properties:
        title:
          type: "string"
        summary:
          type: "string"
    
  
  # Validation configuration
  validation:
    type: "llm-judge"          # llm-judge|snapshot|hybrid
    
    # For llm-judge validation
    llm_judge:
      model: "gpt-4o-mini"     # LLM model to use
      temperature: 0.3         # Model temperature
      criteria:                # Evaluation criteria
        - "Title should be accurately extracted"
        - "Summary should be comprehensive"
        - "All required fields should be present"
      
      # Visual verification settings
      visual_verification:
        enabled: true
        capture_before: true   # Screenshot before tool execution
        capture_after: true    # Screenshot after tool execution
        prompts:              # Custom verification prompts
          - "Verify the title matches the page header"
    
    # For snapshot validation
    snapshot:
      structure_only: false    # Compare structure only
      exclude_paths:          # Paths to exclude from comparison
        - "timestamp"
        - "random_id"
      sanitizers:             # Value sanitization rules
        - path: "date"
          pattern: "\\d{4}-\\d{2}-\\d{2}"
          replacement: "YYYY-MM-DD"
    
    # For hybrid validation (both llm-judge and snapshot)
    hybrid:
      weight_llm: 0.7         # Weight for LLM score
      weight_snapshot: 0.3    # Weight for snapshot score
  
  # Metadata and tags
  metadata:
    tags:                     # Categorization tags
      - "schema-extraction"
      - "wikipedia"
      - "regression"
    priority: "normal"        # low|normal|high
    owner: "team-browser"     # Responsible team/person
    created: "2024-01-01"     # Creation date
    modified: "2024-01-15"    # Last modification date
```

## Tool-Specific Input Schemas

### extract_schema_data

```yaml
input:
  schema:                     # JSON Schema for extraction
    type: "object"
    properties:
      title:
        type: "string"
      items:
        type: "array"
        items:
          type: "object"
          properties:
            name:
              type: "string"
            price:
              type: "number"
```

### research_agent

```yaml
input:
  query: "Research the latest AI developments"  # Research query
  max_iterations: 5          # Maximum agent iterations
  include_sources: true      # Include source URLs
  depth: "comprehensive"     # shallow|moderate|comprehensive
```

### action_agent

```yaml
input:
  task: "Fill out the contact form"  # Task description
  form_data:                         # Data to use
    name: "Test User"
    email: "test@example.com"
  verify_completion: true            # Verify task completion
```

### web_task_agent

```yaml
input:
  instructions: |                    # Multi-line instructions
    1. Navigate to the products page
    2. Search for "laptop"
    3. Filter by price < $1000
    4. Extract the first 5 results
  expected_outcome: "List of laptops under $1000"
  max_steps: 10                     # Maximum action steps
```

## Complete Example

```yaml
client:
  id: "550e8400-e29b-41d4-a716-446655440000"
  name: "Chrome DevTools Production Agent"
  secret_key: "sk-prod-abc123"
  description: "Production DevTools instance for continuous evaluation"

settings:
  max_concurrent_evaluations: 5
  default_timeout: 45000
  retry_policy:
    max_retries: 3
    backoff_multiplier: 2
    initial_delay: 2000

evaluations:
  # Schema extraction evaluation
  - id: "schema-extract-wiki-001"
    name: "Wikipedia Chrome DevTools Schema Extraction"
    description: "Test schema extraction on Wikipedia article"
    enabled: true
    
    target:
      url: "https://en.wikipedia.org/wiki/Chrome_DevTools"
      wait_for: "networkidle"
      wait_timeout: 5000
    
    tool: "extract_schema_data"
    timeout: 30000
    
    input:
      schema:
        type: "object"
        properties:
          title:
            type: "string"
          summary:
            type: "string"
          features:
            type: "array"
            items:
              type: "string"
          lastModified:
            type: "string"
    
    
    validation:
      type: "hybrid"
      llm_judge:
        model: "gpt-4o"
        criteria:
          - "All schema fields must be populated"
          - "Summary should be at least 100 characters"
          - "Features should contain at least 5 items"
      snapshot:
        exclude_paths:
          - "lastModified"
      hybrid:
        weight_llm: 0.6
        weight_snapshot: 0.4
    
    metadata:
      tags: ["schema", "wikipedia", "daily"]
      priority: "high"
      owner: "qa-team"

  # Research agent evaluation
  - id: "research-agent-news-001"
    name: "Research Latest Tech News"
    description: "Test research agent on current tech news"
    enabled: true
    
    target:
      url: "https://news.ycombinator.com"
    
    tool: "research_agent"
    timeout: 60000
    
    input:
      query: "What are the top 3 technology stories today?"
      max_iterations: 5
      include_sources: true
      depth: "moderate"
    
    
    validation:
      type: "llm-judge"
      llm_judge:
        model: "gpt-4o-mini"
        temperature: 0.3
        criteria:
          - "Response includes 3 distinct technology stories"
          - "Each story has a clear summary"
          - "Sources are provided for each story"
          - "Information is current (from today)"
    
    metadata:
      tags: ["research", "news", "tech"]
      priority: "normal"
```

## Validation Rules

1. **Client ID**: Must be valid UUID v4 format
2. **Evaluation IDs**: Must be unique within the file
3. **Tool names**: Must match registered tools in the client
4. **URLs**: Must be valid HTTP/HTTPS URLs
5. **Timeouts**: Must be positive integers (milliseconds)

## YAML Best Practices

1. Use meaningful IDs that describe the evaluation
2. Group related evaluations together
3. Use tags consistently for categorization
4. Document complex input schemas with comments
5. Keep validation criteria specific and measurable
6. Use anchors and aliases for repeated configurations:

```yaml
# Define anchor
defaults: &defaults
  timeout: 30000
  retry_policy:
    max_retries: 2

# Use alias
evaluations:
  - id: "eval-001"
    <<: *defaults  # Inherits timeout and retry_policy
    name: "Test 1"
    # ...
```