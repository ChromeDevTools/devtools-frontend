# Chrome DevTools frontend with Agentic Framework (Browser Operator)

This version provides an user interface to run multi-agent workflows directly on the browser using a stateful, orchestration framework.

### Demos

Watch Browser Operator in action with our demo videos:

#### Overview Demo
See how Browser Operator transforms your browser into an intelligent agentic platform.
[Watch Demo](https://player.vimeo.com/video/1081705645)

https://github.com/user-attachments/assets/d6ffc034-ca38-4afa-861e-c65b3ec79906

#### Deep Research
Browser Operator seamlessly integrates public web data with your private documents and knowledge bases, creating comprehensive research without switching between tools.

https://github.com/user-attachments/assets/225319db-c5a0-4834-9f37-5787fb646d16

#### Product Discovery & Comparison
Streamline your shopping research by automatically gathering specifications, user ratings, and availability across retailers, to help you make confident purchasing decisions.

https://github.com/user-attachments/assets/c478b18e-0342-400d-98ab-222c93eecd7a

#### Professional Talent Search
Efficiently discover and evaluate potential candidates based on skills, experience, and portfolio quality, creating detailed profiles for recruitment decision-making.

https://github.com/user-attachments/assets/90150f0e-e8c8-4b53-b6a6-c739f143f4a0

### Quick Roadmap

|Features| Status |
|--|--|
| Multi-Agent Workflow | Completed |
| OpenAI LLM | Completed |
| Local LLM | |
| MCP | |
| Customize Prompt in UI| |
| Customize Agents in UI| |
| Customize Workflow Graphs in UI| |
| Eval Management | |
| Memory | |
| A2A Protocol | |

### Steps to run project

1. Follow this instructions to [set up](chromium.googlesource.com) devtools
2. Update the code to this fork implementation
3. Use this to run the [code](https://github.com/tysonthomas9/browser-operator-devtools-frontend/blob/main/front_end/panels/ai_chat/Readme.md)

### Source code and documentation

The frontend is available on [chromium.googlesource.com]. Check out the [Chromium DevTools
documentation] for instructions to [set up], use, and maintain a DevTools front-end checkout,
as well as design guidelines, and architectural documentation.

#### Agentic Framework Documentation

*   [`front_end/panels/ai_chat/core/Readme.md`](front_end/panels/ai_chat/core/Readme.md): Explains how to customize the `BaseOrchestratorAgent` to add new top-level agent types and UI buttons, and details its graph-based workflow.
*   [`front_end/panels/ai_chat/agent_framework/Readme.md`](front_end/panels/ai_chat/agent_framework/Readme.md): Describes the AI Agent Framework, its core components (`ConfigurableAgentTool`, `AgentRunner`, `ToolRegistry`), and how to create, configure, and register new custom agents, including agent handoff mechanisms.

#### General DevTools Documentation

- DevTools user documentation: [devtools.chrome.com](https://devtools.chrome.com)

### Join Us

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/JKYuuubr)
[![X (Twitter)](https://img.shields.io/badge/X_(Twitter)-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/BrowserOperator)
