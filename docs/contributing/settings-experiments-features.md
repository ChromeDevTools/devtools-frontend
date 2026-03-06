# Settings, Experiments, and Features in Chromium DevTools

Chromium DevTools can be customized in several ways:

**Preferences** (found in Settings > Preferences) control the general appearance and behavior of
DevTools, such as language or UI options. In the codebase, these are represented as "Settings"
([documentation](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/front_end/core/common/README.md)).
They are intended as permanent options that remain relatively stable over time.

**Experiments** are features under active development or evaluation. These can change frequently
and are managed through DevTools > Settings > Experiments, `chrome://flags`, or command-line
switches. They are implemented using Chromium's `base::Feature` system, which allows for granular
control and testing.

[TOC]

## How to add base::Feature feature flags

`base::Feature` flags are defined in the Chromium repository and exposed to DevTools through [host
bindings](https://crsrc.org/c/chrome/browser/devtools/devtools_ui_bindings.cc). This architecture
ensures a single source of truth for features that span both the front-end (DevTools) and back-end
(Chromium). Even features that only affect the front-end should use this system for consistency.
By default, `base::Features` are configurable via command line parameters when launching Chromium.
Optionally, they can be made available via the `chrome://flags` UI and via
DevTools > Settings > Preferences as well.

### Define a new base::Feature

Add a new `base::Feature` to DevTools' [`features.cc`](https://crsrc.org/c/chrome/browser/devtools/features.cc). This feature will automatically be available as a Chrome command line parameter:

```cxx
// in features.cc
BASE_FEATURE(kDevToolsNewFeature, "DevToolsNewFeature",
             base::FEATURE_DISABLED_BY_DEFAULT);

// Optionally add feature parameters
const base::FeatureParam<std::string> kDevToolsNewFeatureStringParam{
    &kDevToolsNewFeature, "string_param", /*default_value=*/""};
const base::FeatureParam<double> kDevToolsNewFeatureDoubleParam{
    &kDevToolsNewFeature, "double_param", /*default_value=*/0};
```

Start Chrome via command line including flags:

```bash
[path to chrome]/chrome --enable-features=DevToolsNewFeature
```

Command for starting Chrome with feature and additional feature parameters:

```bash
[path to chrome]/chrome --enable-features="DevToolsNewFeature:string_param/foo/double_param/0.5"
```

### Add the new feature to the host configuration being sent to DevTools

 Add the new feature to `DevToolsUIBindings::GetHostConfig` ([link to code](https://crsrc.org/c/chrome/browser/devtools/devtools_ui_bindings.cc;l=1506;drc=dd0b2a0bee86088ec0d481bd8722c06edaaba4a4), [example CL](https://crrev.com/c/5625935)).

### In DevTools, use the new property added to HostConfig

* Update the type definition in [`Runtime.ts`](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/core/root/Runtime.ts).
* Check if the `base::Feature` is enabled and use this to run certain code blocks conditionally by
accessing the host config via `Root.Runtime.hostConfig`.
* In unit tests, make sure to assign the expected configuration using
`updateHostConfig({ someFeature: {enabled: true} })`.

Please refer to this [example CL](https://crrev.com/c/6820841).

### Optional: Make the base::Feature available via chrome://flags

This step is optional. If you want the `base::Feature` to be controllable via the
`chrome://flags` UI and not only via the command line, follow
[this documentation](https://chromium.googlesource.com/chromium/src/+/main/docs/how_to_add_your_feature_flag.md#step-2_adding-the-feature-flag-to-the-chrome_flags-ui).

[Example CL](https://crrev.com/c/7588357)

### Optional: Add the base::Feature to DevTools > Settings > Experiments

Prerequisite: The `base::Feature` needs to be have been added to `chrome://flags`.

#### Step 1: Create a HostExperiment in the DevTools repository

Register the experiment in [`MainImpl.ts`](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/entrypoints/main/MainImpl.ts;l=343)

```ts
Root.Runtime.experiments.registerHostExperiment({
  name: Root.ExperimentNames.ExperimentName.DURABLE_MESSAGES,
  // Short description of the experiment, shown to users
  title: 'Durable Messages',
  // This must match the name of the Chrome flag as seen in `chrome://flags` or in `chrome/browser/about_flags.cc`
  aboutFlag: 'devtools-enable-durable-messages',
  isEnabled: Root.Runtime.hostConfig.devToolsEnableDurableMessages?.enabled ?? false,
  // Whether the experiment requires a Chrome restart or only a reload of DevTools
  requiresChromeRestart: false,
  // optional
  docLink: 'https://goo.gle/related-documentation',
  // optional
  feedbackLink: 'https://crbug.com/[bug number]',
});
```

[Example CL](https://crrev.com/c/7588114)

`requiresChromeRestart` should be set to `true` if the `base::Feature` is used for conditionally
running code in the Chromium repository as well. If it only affects code paths in the DevTools
repository, `requiresChromeRestart` should be set to `false`. This means that toggling the
experimental feature requires only reloading DevTools and not restarting Chrome.

You may also pass in two additional arguments which can be used to link users to documentation and
to a place for providing feedback.

You must also add the experiment to [UserMetrics.ts](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/core/host/UserMetrics.ts;l=807).
Add an entry to the `DevToolsExperiments` enum, incrementing the `MAX_VALUE` by 1 and assigning the
un-incremented value to your experiment (the gaps in the values assigned to experiments are caused
by expired experiments which are no longer part of the codebase).

#### Step 2: Update UI bindings to allow toggling the experiment from the DevTools UI

In the scenario of allowing users to toggle the experiment from the DevTools UI, when assembling
the host config to be sent to DevTools, use the `GetFeatureStateForDevTools` helper to determine
the enabled/disabled state of the experiment.

```cxx
response_dict.Set(
  "devToolsNewFeature",
  base::DictValue().Set(
    "enabled",
    GetFeatureStateForDevTools(
      ::features::kDevToolsNewFeature,
      enabled_by_flags,
      disabled_by_flags
    )
  )
);
```

#### Step 3: Add the experiment to enums.xml in the Chromium repository

In Chromium, edit [tools/metrics/histograms/metadata/dev/enums.xml](https://crsrc.org/c/tools/metrics/histograms/metadata/dev/enums.xml;l=898).
Find the enum titled `DevToolsExperiments`, and add a new entry. Make sure that the value matches the one from
[UserMetrics.ts](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/core/host/UserMetrics.ts;l=807)
in the DevTools repository. The label can be anything you like but make sure it is easily identifiable.

```xml
<int value="95" label="yourExperimentNameHere"/>
```

[Example CL](https://crrev.com/c/4915777)

## Deprecated: DevTools experiments

Previously, DevTools experiments that lacked a Chrome component were managed separately. This
system is now deprecated. All legacy experiments are being migrated to the `base::Feature`
framework to streamline development.

## A/B Testing with Finch and base::Feature

`base::Feature` flags can be used with Finch to conduct A/B testing by toggling feature flags for a defined percentage of users. A/B testing can be a good way of testing the waters. However, since the time to get meaningful metrics may take a long time, it shouldn't be used to get feedback on options quickly.

### Advantages and Disadvantages

#### Advantages

*   **Straightforward Setup**: Finch configuration for A/B testing is simple, with reusable templates. Upcoming [automation tools](http://go/finch-automation-doc) will make this even easier.
*   **Integrated Dashboard**: UMA-based Finch dashboards are available for monitoring experiments and tracking UMA histograms.
*   **Flexible Rollout**: Rollout percentages can be dynamically managed.

#### Disadvantages

*   **Time-to-Meaningful Metrics**: It can take a long time to gather enough data from users, which may delay releases. This is especially true when waiting for features to reach the Stable channel.
*   **Deployment Restrictions**: Finch changes are subject to freezes (e.g., around holidays) and cannot be deployed on weekends.
*   **Potential Rollout Latency**: Rollouts can take from 1-2 days to several weeks to reach all users.
*   **Launch Coordination**: A/B testing on Beta and Stable channels requires coordination with the formal launch process.

### General Information

#### Deployment Cycle of Finch changes: How and when do Finch changes propagate to the user?

1.  A Finch CL is pushed to servers.
2.  The client pulls the configuration (usually within hours).
3.  The change is applied after a Chrome restart (which can take days).

#### Querying Visual Logging Data for Experiments

To query VE (Visual Logging) data for your experiment, you will need the decimal hashes of your study and study groups.

*   **Finding Field Trial Hashes**: Use the [go/finch-hashes](http://go/finch-hashes) tool.
*   **Study Name/ID (`name_id`)**: This is your study name plus the `StructuredMetrics` suffix (e.g., `DevToolsAiSubmenuPromptsStructuredMetrics`).
*   **Experiment Group ID (`group_id`)**: This is the experiment group name plus the `StructuredMetrics` suffix (e.g., `LaunchStructuredMetrics`).
