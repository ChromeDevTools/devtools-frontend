# AI Assistant Skills

This directory contains the definitions for skills used by `AiAgent2`.

## Authoring Skills

Skills are authored as Markdown files with YAML frontmatter.

Example:
```markdown
---
name: styling
allowed-tools: [search_web]
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
