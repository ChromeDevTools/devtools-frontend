# Resource management in DevTools

This document outlines how DevTools keeps track of resources like scripts and
HTML files, and how they interact with other features such as the Debugger.
The source code lives in the bindings/, persistence/ and workspace/ directories.

## Core concepts and classes

* **Project:** Interface to a collection of resources. DevTools supports
  different project **types**. For example “filesystem”, for resources
  originating from the developers local machine, and “network”, for actual page
  resources. The **Project** interface abstracts away rudimentary file
  operations. Depending on the **type**, a **Project** may be able to create,
  rename or delete resources, or change the contents.

* **Workspace**: A collection of all the **Projects** currently in use.
  Implemented as a singleton in WorkspaceImpl.ts.

* **UISourceCode:** An actual resource identified by its URL. Scripts and
  stylesheets are prominent examples, but DevTools also uses more esoteric
  **ResourceTypes** such as XHR, WebSocket or EventSource.

## Project types

A short overview over the different Project types and what **kind of resources**
they contain.

* **Network:** All resources loaded from the network are stored in network
  projects. Different targets and/or **Resource** **types** may use different
  projects. E.g. Each target has their own project containing only JavaScript
  source maps.

* **Filesystem:** Resources stored on the developers local machine.
  * Snippets are managed with a single Project just for snippets.
  * Each local directory mapped into DevTools with the “Workspaces” feature has
    its own project.
  * Each directory used for the “Overrides” feature has a corresponding project
    to manage the local files.

* **Formatter:** A single project of this type manages the formatted version of
  script resources. That is the “pretty-print” feature for minified JS files.

* **ContentScripts**: Scripts from extensions running in the context of the page
  itself. One project per target. Source maps for content scripts are managed by
  separate, per target, projects. The source map projects also have the
  **ContentScripts** type.

* **Service:** One project of this type per target. It holds placeholder
  UISourceCodes for source maps while they are loaded. Once a source map
  finishes loading, the placeholder is removed from the **Service** project.

* **Debugger:** One project of this type per target. Debugger projects store
  parsed JS scripts (see next section).

## The “Debugger” project type

When V8 parses scripts, it sends out a
[“Debugger.ScriptParsed”](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#event-scriptParsed)
event with some details, including a unique script ID and the URL of the script.
For each “Debugger.ScriptParsed” event, DevTools creates a **Script** object and
an associated **UISourceCode** in the “debugger” project. It is important to
note that the URL of this “debugger” UISourceCode contains both the script ID as
well as the script name (not URL!) to uniquely identify it. This is because:

_The relationship between network/filesystem UISourceCodes and **Script**
**objects**/debugger UISourceCodes is 1:n._

For example if the same script is included twice on a page with &lt;script>
elements, it will result in a single UISourceCode in the **Network** project but
**two Script** **objects** and two UISourceCodes in the **Debugger** project.
Similarly, every invocation of a Snippet will result in a separate **Script**
object per invocation while the Snippet itself is stored in a **Filesystem**
project.

## Mappings and bindings

As can be seen above, UISourceCodes in different projects can potentially be
related to one another. A minified script resource in a **scripts Network project**
might have a pretty-printed version in the **Formatter project** while the
source map for the minified script is stored in the **source map Network project**.
Once the minified script is parsed/executed by V8, it also has a corresponding
**Script object** and a UISourceCode in the **Debugger project**.

This brings us to mappings and bindings. The terminology is roughly:

* _A **binding** ties different UISourceCodes together and determines which
  UISourceCodes relate to one another._
* _A **mapping** translates source positions between bound UISourceCodes._

## Binding implementations

There are a couple of classes tasked with establishing bindings between
UISourceCodes:

* **DebuggerWorkspaceBinding:** Responsible for scripts and source maps.
  It ties together network/filesystem UISourceCodes with **Script** objects and
  the debugger USourceCodes. Script source maps are also partially implemented
  by this class.

* **CSSWorkspaceBinding:** Responsible for CSS and CSS source maps. DevTools can
  handle source mapped CSS when it was authored in SASS and this class is
  responsible for binding the corresponding UISourceCodes.

* **PersistenceBinding/PersistenceImpl/Automapping**: Responsible for the
  [“Workspaces”](https://developer.chrome.com/docs/devtools/workspaces/)
  feature. When a developer adds a local directory to DevTools that corresponds
  to the pages sources, these classes establish and manage the binding between
  the corresponding **Filesystem** and **Network** resources.

* **NetworkPersistenceManager**: Responsible for the
  [“Local Overrides”](https://developer.chrome.com/blog/new-in-devtools-65/#overrides)
  feature. It connects the **Network** resources with the corresponding
  overwritten version in a **Filesystem** project. This class also handles
  network request interceptions and determines whether to serve the original or
  the overwritten UISourceCode.

Please keep in mind that many of these classes have gathered additional
responsibilities over the years, so the concepts presented above might not
always cleanly apply or be apparent in code.
