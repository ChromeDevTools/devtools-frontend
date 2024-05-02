# Chrome DevTools Protocol

## Definitions
### Domain
A group of CDP methods and events, which can usually be individually enabled or
disabled and individually supported by different types of targets.

*Source: [Chrome DevTools Walkthrough](https://docs.google.com/document/d/1QG7P18wDIhB_twNbkvEAbgJfNoTkyTRXf-6Nk2TTYPI/edit#)*

### Agent (in blink) or Handler (in browser)
TLDR: Backend implementation of a domain that syncs with the frontend.

Agents and Handlers are backend classes that implement individual protocol
domains. Some domains are implemented as agents in the renderer process (either
in Blink or v8; no agents are currently present in the content/renderer so far)
and some as handlers  in the browser process (implemented either by the content
layer or by the embedder). A domain may be implemented by multiple agents or
handlers spanning several layers and processes, e.g. have instances in
`chrome/`, `content/` and `blink/renderer/` . A single command may be handled by
 multiple layers in the following sequence:
 embedder, content browser, blink, V8. An agent may indicate that it has
 completed handling the command or let the command fall-through to the
 next layer.


*Source:
 - [Chrome DevTools Contribution Guide](https://docs.google.com/document/d/1WNF-KqRSzPLUUfZqQG5AFeU_Ll8TfWYcJasa_XGf7ro/edit#)
 - [third_party/blink/public/devtools_protocol - chromium/src - Git at Google](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/public/devtools_protocol/)


## Background

### browser_protocol.pdl

The `browser_protocol.pdl` file is the source of truth that is used to generate
the `browser_protocol.json` file and the `.ts`, `.h` and `.cc` files.

However, there are multiple `browser_protocol.pdl` files across the codebase.
The main one is located at (in your chromium repo):

`third_party/blink/public/devtools_protocol/browser_protocol.pdl`

This is the one you should modify and the other ones will be synced using
different commands explained later.

There’s also a separate `js_protocol.pdl` that has only V8-specific domains.

## Create a new Protocol

### 1- Create your domain on the Chromium repository

#### 1.1- Add your domain to the main browser_protocol.pdl file in your

chromium repository To create a new domain, you should add your new domain to
`third_party/blink/public/devtools_protocol/browser_protocol.pdl`

#### 1.2- Modify headless/BUILD.gn
Open the file `headless/BUILD.gn` in your chromium repository and the name of
your new domain under the devtools_domain section.

#### 1.3- Modify third_party/blink/renderer/core/inspector/BUILD.gn
Open the file `third_party/blink/renderer/core/inspector/BUILD.gn` in your
chromium repository and add the new protocol files to be generated under the
outputs section. The convention is to use the domain name converting it from
camel case to snake case.

The protocol files generated will list the methods that your Agent will need to
implement to enable the communication between the Chrome DevTools and Chromium.

#### 1.4- Modify inspector_protocol_config.json

Open the file
`third_party/blink/renderer/core/inspector/inspector_protocol_config.json` and
under `protocol.options`, add your new domain:

```
{
    "domain": "YourNewDomain"
}
```

#### 1.5- Build chromium
Build chromium as you normally would.

#### 1.6- See the newly generated protocol C++ files
Your new domain files should be generated in this folder:

```
src/out/Default/gen/third_party/blink/renderer/core/inspector/protocol/your_new_domain.cc
src/out/Default/gen/third_party/blink/renderer/core/inspector/protocol/your_new_domain.h
```

#### 1.7- Add the agent to the devtools-frontend/front_end/core/protocol_client/InspectorBackend.ts

Open the file `devtools-frontend/front_end/core/protocol_client/InspectorBackend.ts` and add a new method to expose your Agent.

```
youNewDomainAgent(): ProtocolProxyApi.YourNewAgentApi {
    return this.getAgent('YourNewAgent');
}
```

#### 1.8- Add the newly generated protocol files to the BUILD.gn

In your chromium repository, open the file
`third_party/blink/renderer/core/inspector/BUILD.gn` and add the newly generated
protocol files. This will make them available to be used later in the Agent
class.

```
outputs = [
...
"inspector/protocol/your_new_domain.cc",
"inspector/protocol/your_new_domain.h",
```

### 2- Sync the browser_protocol files and generate the protocol resources
As mentioned before, there are many browser_protocol files. To synchronize the
modifications, run this command from your Chrome DevTools repository:

```
scripts/deps/roll_deps.py ~/chromium/src .
```

The first parameter is the path from your Chrome DevTools repository to the
chromium repository. The second parameter is the root of the
Chrome DevTools repository.

### 3- Create the Agent on the Chromium repository

#### 3.1- Create the Agent class
The Agent class should inherit the newly created protocol
`protocol::YourNewDomainAgent::Metainfo`

```
class MODULES_EXPORT YourNewDomainAgent final : public InspectorBaseAgent<protocol::YourNewDomainAgent::Metainfo> {
```

#### 3.2- Register the Agent
The Agent must be registered with the Session. To do so, go to the file
`third_party/blink/renderer/modules/modules_initializer.cc` and append it to the
 session in this method:

```
void ModulesInitializer::InitInspectorAgentSession {
…
session->CreateAndAppend<YourNewAgent>...
```

### 4- Setup the communication from the Chrome DevTools repository
In the TypeScript class, your agent can now be accessible directly from the
target. With the target, you can simply access your agent like this:

```
initialize(target: SDK.Target.Target) {
    target.yourNewDomainAgent();
}
```
