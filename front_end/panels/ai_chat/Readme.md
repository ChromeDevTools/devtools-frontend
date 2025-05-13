# AI Chat Panel

This panel is a Multi-Agent Framework that allows a user to connect an existing LLM with the chromium browser.

### Steps to run project

1. Setup the depot_tools to fetch the chromium dev tools using the instructions provided [here](https://www.chromium.org/developers/how-tos/get-the-code/)
```sh
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH="$PATH:/path/to/depot_tools"
```
2. Follow this instructions to [set up](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md) dev tools

```sh
# fetching code
mkdir devtools
cd devtools
fetch devtools-frontend

# Build steps
cd devtools-frontend
gclient sync
npm run build
```

3. Update the code to this fork implementation
```sh
git remote add upstream git@github.com:tysonthomas9/browser-operator-devtools-frontend.git
git checkout upstream/main
```

4. Use this to run the [code](https://github.com/tysonthomas9/browser-operator-devtools-frontend/blob/main/front_end/panels/ai_chat/Readme.md)
```sh
npm run build
python -m http.server
```

5. Run Chrome or Chromium Browser instance
```sh
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --disable-infobars --custom-devtools-frontend=http://localhost:8000/

# MacOS Example
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --custom-devtools-frontend=http://localhost:8000/
```

### Setup and Development

1. Build the project and use watch mode
```sh
npm run build -- --watch
```

2. Serve the content of out/Default/gen/front_end on a web server, e.g. via python -m http.server.

```sh
cd out/Default/gen/front_end

python3 -m http.server
```

3. Use the AI Chat panel.

```sh
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --disable-infobars --custom-devtools-frontend=http://localhost:8000/
```


### Agent Architecture

The AI Chat Panel uses the multi-agent framework with the following components:

1. **State Management**: Tracks conversation history, user context, and DevTools state
2. **Tools**: Provides capabilities for DOM inspection, network analysis, and code execution
3. **Workflow**: Defines the agent's reasoning process and decision-making flow

## Reference
https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md#Standalone-checkout-Checking-out-source
