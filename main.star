#!/usr/bin/env lucicfg

# Enable luci.tree_closer.
lucicfg.enable_experiment("crbug.com/1054172")

# Tell lucicfg what files it is allowed to touch
lucicfg.config(
    config_dir = "generated",
    tracked_files = [
        "commit-queue.cfg",
        "cr-buildbucket.cfg",
        "luci-logdog.cfg",
        "luci-milo.cfg",
        "luci-notify.cfg",
        "luci-notify/**/*",
        "luci-scheduler.cfg",
        "project.cfg",
    ],
    fail_on_warnings = True,
)

luci.project(
    name = "devtools-frontend",
    buildbucket = "cr-buildbucket.appspot.com",
    logdog = "luci-logdog",
    milo = "luci-milo",
    notify = "luci-notify.appspot.com",
    scheduler = "luci-scheduler",
    swarming = "chromium-swarm.appspot.com",
    acls = [
        acl.entry(
            [
                acl.BUILDBUCKET_READER,
                acl.LOGDOG_READER,
                acl.PROJECT_CONFIGS_READER,
                acl.SCHEDULER_READER,
            ],
            groups = ["all"],
        ),
        acl.entry(
            [acl.SCHEDULER_OWNER],
            groups = [
                "project-devtools-sheriffs",
                "project-v8-admins",
            ],
        ),
        acl.entry(
            [acl.LOGDOG_WRITER],
            groups = ["luci-logdog-chromium-writers"],
        ),
    ],
)

luci.notify(tree_closing_enabled = True)

EXCLUDED_STEPS = [
    "Failure reason",
    "steps",
    ".* \\(flakes\\)",
    ".* \\(retry shards with patch\\)",
    ".* \\(with patch\\)",
    ".* \\(without patch\\)",
]

luci.notifier(
    name = "devtools notifier",
    on_occurrence = ["FAILURE"],
    failed_step_regexp_exclude = [
        "bot_update",
        "isolate tests",
        "package build",
        "extract build",
        "cleanup_temp",
        "gsutil upload",
        "taskkill",
    ] + EXCLUDED_STEPS,
    notify_emails = ["liviurau@chromium.org", "devtools-waterfall-sheriff-onduty@grotations.appspotmail.com"],
)

luci.tree_closer(
    name = "devtools tree closer",
    tree_status_host = "devtools-status.appspot.com",
    failed_step_regexp_exclude = EXCLUDED_STEPS,
)

luci.milo(
    logo = "https://storage.googleapis.com/chrome-infra-public/logo/devtools.svg",
)

luci.logdog(gs_bucket = "chromium-luci-logdog")

luci.cq(
    submit_max_burst = 1,
    submit_burst_delay = 60 * time.second,
    status_host = "chromium-cq-status.appspot.com",
)

exec("//buckets/ci.star")
exec("//buckets/try.star")
