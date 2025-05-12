# Chrome DevTools frontend with Agentic Framework (Browser Operator)

The custom version client-side of the Chrome DevTools, including all TypeScript & CSS to run the DevTools webapp. This version includes the ability to run multi-agent workflows directly on the browser using a stateful, orchestration framework.

|Features| Status |
|--|--|
| Multi-Agent Workflow | Completed |
| OpenAI LLM | Completed |
| Custom Prompt Support| |
| Custom Agents | |
| Custom Workflow Graphs | |
| Eval Management | |
| Local LLM | |
| Memory | |
| MCP | |
| A2A Protocol | |

### Demos

Watch Browser Operator in action with our demo videos:

#### Overview Demo
See how Browser Operator transforms your browser into an intelligent agentic platform.
[Watch Demo](https://player.vimeo.com/video/1081705645)

#### Deep Research
Browser Operator seamlessly integrates public web data with your private documents and knowledge bases, creating comprehensive research without switching between tools.
[Watch Demo](https://player.vimeo.com/video/1081705602)

#### Product Discovery & Comparison
Streamline your shopping research by automatically gathering specifications, user ratings, and availability across retailers, to help you make confident purchasing decisions.
[Watch Demo](https://player.vimeo.com/video/1081705556)

#### Professional Talent Search
Efficiently discover and evaluate potential candidates based on skills, experience, and portfolio quality, creating detailed profiles for recruitment decision-making.
[Watch Demo](https://player.vimeo.com/video/1082407151)

### Steps to run project

1. Follow this instructions to [set up](chromium.googlesource.com) devtools
2. Update the code to this fork implementation
3. Use this to run the [code](https://github.com/tysonthomas9/browser-operator-devtools-frontend/blob/main/front_end/panels/ai_chat/Readme.md)

### Source code and documentation

The frontend is available on [chromium.googlesource.com]. Check out the [Chromium DevTools
documentation] for instructions to [set up], use, and maintain a DevTools front-end checkout,
as well as design guidelines, and architectural documentation.

- DevTools user documentation: [devtools.chrome.com](https://devtools.chrome.com)
- Debugger protocol documentation: [chromedevtools.github.io/devtools-protocol](https://chromedevtools.github.io/devtools-protocol)
- Awesome Chrome DevTools: [github.com/paulirish/awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools)
- Contributing to Chrome DevTools: [goo.gle/devtools-contribution-guide](http://goo.gle/devtools-contribution-guide)
- Contributing To Chrome DevTools Protocol: [goo.gle/devtools-contribution-guide-cdp](https://goo.gle/devtools-contribution-guide-cdp)

### Source mirrors

DevTools frontend repository is mirrored on [GitHub](https://github.com/ChromeDevTools/devtools-frontend).

DevTools frontend is also available on NPM as the [chrome-devtools-frontend](https://www.npmjs.com/package/chrome-devtools-frontend) package. It's not currently available via CJS or ES modules, so consuming this package in other tools may require [some effort](https://github.com/paulirish/devtools-timeline-model/blob/master/index.js).

The version number of the npm package (e.g. `1.0.373466`) refers to the Chromium commit position of latest frontend git commit. It's incremented with every Chromium commit, however the package is updated roughly daily.

### Getting in touch

[BrowserOperator@X](https://x.com/BrowserOperator)
