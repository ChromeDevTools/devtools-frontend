# DevTools AI Evaluations

This directory contains automated test suites for DevTools AI Assistance.

> [!WARNING]
> **Google Linux (`gLinux`) Environment Required**
> This automated test suite runs only on Google Linux (`gLinux`) workstations and bots. It requires `stubby` and Linux-specific internal Google tools, which means it does not work for external contributors.
>
> **Note for macOS Users:** You can still run AI Assistance evaluations on macOS. Use the manual evaluation workflow in [`../../scripts/ai_assistance/README.md`](../../scripts/ai_assistance/README.md).

---

## Prerequisites

Before you run this automated test suite, the prerequisites are:

1. A Google Linux workstation (`gLinux`).
2. Authentication with `gcloud`:
   ```bash
   gcloud auth login
   ```
3. A Google OTA (test) account. Make sure to create a production test account, with a password set (see 'updated password flow' during account creation).
4. Add `"checkout_ai_evals": True` to `custom_vars` in your `.gclient` file and run `gclient sync`.

---

## Build the Tests

Compile the test files before you run the test suite:

```bash
autoninja -C out/Default test/ai_evals:ai_evals
```

---

## Run the Tests

AI Evals tests:

```bash
npm run test:evals -- --ota-username your_ota_account@gmail.com
```
Or:
```bash
npm run test -- test/ai_evals/ --ota-username your_ota_account@gmail.com
```

Harness tests:

```bash
vpython3 scripts/test_harness.py DevToolsTestHarness.test_ai_evals_auth_helper
```

Protip: You can add `--debug` to the harness test command line, to see the output.

---

## Test Execution Steps

When you run the test, the test runner performs these steps:

1. Uses `stubby` to get a temporary password for the OTA account.
2. Starts Chrome and signs in to the Google account automatically.
3. Configures DevTools AI Assistance preferences.
4. Opens the inspected target page and sends prompts to AI Assistance.
5. Verifies that DevTools receives structured AI responses.
