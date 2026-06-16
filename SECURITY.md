# Chrome DevTools Frontend Security Policy & Threat Model

This document outlines the security goals, boundaries, and threat model for the Chrome DevTools frontend.

## Architectural Philosophy & Trust Boundaries

Chrome DevTools is a privileged web app running in a sandboxed renderer process, communicating via the Chrome DevTools Protocol (CDP).

* **Intended Capabilities:** DevTools is designed to inspect, mutate, and control debug targets (tabs, workers, remote nodes). Actions like code execution (Console, Snippets) or filesystem binding are intended behaviors, not vulnerabilities.
* **Data Processing:** The frontend does not execute untrusted user-space code in its own processes. It may instruct the debug target to execute code. It parses structured data from the CDP target. While a target page may be compromised, DevTools must safely display this data without escalating privileges to the browser process or host OS.

## Threat Model Boundaries

### Inside Threat Model
* Compromising the DevTools frontend renderer process.
* Compromising the CDP backend via tampered protocol messages.
* Unauthorized exfiltration of sensitive local files or user data outside the debugging scope.
* Triggering Chrome memory corruption exploits.

### Outside Threat Model
* **Social Engineering:** Convincing developers to paste payloads into the Console, download and open a compromised file, or connect to malicious remote debugging ports, etc.
* **Legitimate Data Exposure:** Displaying local user data, cookies, tokens, or auth headers within UI panels.
* **Local Data Persistence:** Saving user-initiated traces, heaps, profiles, or logs to disk.
* **Correctness & Availability:** Stale, misleading, or missing UI information (classified as functional bugs).
* **Denial of Service:** Chrome extensions or debug targets that disrupt DevTools' availability, e.g. through performance degradation.
* **Disabled-by-default Experimental Features:** Experimental features or capabilities that are disabled by default, e.g. requiring a command-line flag to be activated, or a specific runtime setting within DevTools to be manually turned on.

## Specific Severity Classification Rules (S1–S4)

### S0 (Critical)
* Exploits affecting users without Chrome DevTools being open.

### S1 (High)
* Exploits requiring only standard user actions within an open DevTools window.
* HTML injection or rendering untrusted content within the DevTools UI.
* Persistent exploits (e.g., manipulating service worker source code).

### S2 (Medium)
* Exploits strictly dependent on explicit, non-standard user interactions.
* Targets leveraging parsing flaws to compromise another renderer process without escaping the browser sandbox.

### S3 (Low)
* Exploits requiring a malicious, highly-privileged Chrome Extension to interact with DevTools APIs, including bypassing extension host policy.
* Spoofing links in DevTools that navigate to restricted internal URLs (e.g., `chrome://`).
* Vulnerabilities requiring specific command-line arguments, third-party tools, or loading tampered local files.
* Other exploits in features which are marked as experimental, but enabled by default.

## Specific Aspects

### AI & LLM Features
* **Trusted Backend:** The remote Google LLM backend is trusted; data sent to it is not an exfiltration vulnerability.
* **AI Safety:** Prompt injection, jailbreaks, or offensive/incorrect AI output are functional bugs, not vulnerabilities.
* **Exception:** Prompt injection is only a vulnerability if it crosses cross-origin boundaries or executes unauthorized CDP commands.

### Side-Effect Free Evaluation
* Side-effect free JavaScript evaluation is a best-effort developer heuristic to prevent accidental state changes, not a security boundary. Bypassing it to cause side effects on the debugged page is not a vulnerability.
