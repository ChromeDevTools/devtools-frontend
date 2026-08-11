# AI Assistant Skills

This directory contains the definitions for skills used by `AiAgent2`.

## Authoring Skills

Skills are authored as Markdown files with YAML frontmatter.

Example:
```markdown
---
name: styling
allowed-tools: [executeJavaScript]
---
You are a CSS expert...
```

*   **Frontmatter**: Contains metadata like `name` and `allowed-tools`.
*   **Body**: The instructions for the skill (prompt).

### Why Markdown?

Skills are stored as Markdown to make it easier to share them with other codebases or systems that might not be using TypeScript or the DevTools build system. This is an intentional trade-off that requires a build step for DevTools.

## Build System

Markdown files are converted to JavaScript files (`.skill.js`) during the build process.

*   **Script**: `scripts/build/build_ai_skills.mjs` processes each file individually.
*   **GN Target**: `action_foreach("generate_skills")` in `front_end/models/ai_assistance/skills/BUILD.gn`.
*   **Output**: Files are placed in the generation directory, e.g., `out/Default/gen/front_end/models/ai_assistance/skills/styling.skill.js`.

## Consumption

To use a skill in TypeScript:

1.  Import it: `import {skill} from './styling.skill.js';`
2.  Register it in `SkillRegistry.ts`.

Types are provided globally in `front_end/global_typings/global_defs.d.ts` via a wildcard module declaration (`*.skill.js`). This avoids the need to generate `tsconfig.json` files for the generated skills.

## Building a skill for AIv2

_Note: some of this is a bit rough around the edges and subject to change as we build V2 out._

If you want to add a new skill to DevTools AI v2 you should:

Firstly, consider if we need it or not. Can we test the AI to see how it can handle relevant prompts without a new skill? (We are currently working on eval architecture to make this easier in the future too).

Assuming we do want it, then we should create the new skill in `models/ai_assistance/skills/<NAME>.md`.

This skill must have YAML frontmatter that defines its name and description, and optionally any tools that it is allowed to call (more on tools below):

```
---
name: performance
description: Web performance analysis, trace inspection, and trace recording.
allowed-tools:
  - recordPerformanceTrace
---

<body of the skill goes here>
```

The name and description are important. These are given to the AI in its context window so it knows that this tool exists and understands when to use it. You should think carefully about producing a very clear description and ideally evaluate this to check if the AI uses the tool in the right scenarios.

To have the skill built as JavaScript and available to the AI:

1. Update `models/ai_assistance/skills/BUILD.gn` to add the new skill file as a source.
2. Update `models/ai_assistance/skills/Skill.ts` to add the new skill name to the `SkillName` union type.
3. Update `models/ai_assistance/skills/SkillRegistry.ts` to import the generated skill file and register it in the `SKILLS` object.
4. Add the generated skill file (`front_end/models/ai_assistance/skills/<NAME>.skill.js`) to the list of release sources in `config/gni/devtools_grd_files.gni`.

If your skill does not need to call any tools, then you are done. The AI can now learn your skill and use it.

### Using existing tools

If your new skill needs to use tools that are already implemented:

1. **Find the tool name**: Locate the tool's registration name in the `ToolName` enum (e.g., `executeJavaScript`, `listNetworkRequests`, `getStyles`) from `models/ai_assistance/tools/Tool.ts`.
2. **Bind the tool to the skill**: Add the tool name to the `allowed-tools` list in your skill's Markdown frontmatter:
   ```yaml
   ---
   name: my-skill
   allowed-tools:
     - executeJavaScript
   ---
   ```

By doing this you ensure that if the AI learns you skill, those functions are learned and added to the active conversation for the AI to invoke.

Even if other skills list the tool you need, you should list it also. Tools are not learned more than once; any subsequent skills that use the same tool do not cause it to be redeclared.

### Implementing and binding tools

If your new skill requires tools that do not exist yet, you should:

1. Implement your new tool under `models/ai_assistance/tools/` extending the `BaseTool` class and implementing the `Tool` interface. Use the existing tools as guidance.
2. Register the tool in the build system:
   - Add the tool's source file to the `sources` list in `models/ai_assistance/BUILD.gn`.
   - Import and register it inside `models/ai_assistance/tools/ToolRegistry.ts`.
3. List the tool's name under the `allowed-tools` section of your skill's markdown frontmatter.
