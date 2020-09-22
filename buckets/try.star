load('//lib/builders.star',
  'builder',
  'acls',
  'defaults',
  'dimensions',
  'builder_coverage',
)

BUCKET_NAME='try'
SERVICE_ACCOUNT="devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com"

luci.bucket(
  name=BUCKET_NAME,
  acls=[
    acls.readers,
    acl.entry(
      roles=acl.BUILDBUCKET_TRIGGERER,
      groups=[
        'project-devtools-tryjob-access',
        'service-account-cq',
      ]
    ),
  ],
)

try_builders=[]

def try_builder(**kvargs):
  builder(
    bucket=BUCKET_NAME,
    builder_group="tryserver.devtools-frontend",
    service_account=SERVICE_ACCOUNT,
    **kvargs
  )
  try_builders.append(kvargs['name'])

def presubmit_builder(name, dimensions, **kvargs):
  try_builder(
    name=name,
    recipe_name="run_presubmit",
    dimensions=dimensions,
    properties={
      "runhooks":True,
      "solution_name":"devtools-frontend"
    },
    priority=25,
    execution_timeout=5 * time.minute,
    **kvargs
  )


builder_coverage(
  covered_oss = ["linux", "win64"],
  builder_factory = presubmit_builder,
  builder_name_pattern = "dtf_presubmit_%s"
)

try_builder(
  name="devtools_frontend_linux_blink_rel",
  recipe_name="chromium_trybot",
  dimensions=dimensions.default_ubuntu,
  execution_timeout=2 * time.hour,
  build_numbers=True,
)

try_builder(
  name="devtools_frontend_linux_blink_light_rel",
  recipe_name="chromium_trybot",
  dimensions=dimensions.beefy_ubuntu,
  execution_timeout=2 * time.hour,
  build_numbers=True,
)

try_builder(
  name="dtf_linux_experiments",
  recipe_name="devtools/devtools-frontend",
  dimensions=dimensions.default_ubuntu,
  execution_timeout=2 * time.hour,
  build_numbers=True,
)

builder_coverage(
  covered_oss = ["linux", "win64", "mac"],
  builder_factory = try_builder,
  builder_name_pattern = "devtools_frontend_%s_rel",
  recipe_name="devtools/devtools-frontend",
  execution_timeout=2 * time.hour,
)

builder_coverage(
  covered_oss = ["linux"],
  builder_factory = try_builder,
  builder_name_pattern = "devtools_frontend_%s_dbg",
  recipe_name="devtools/devtools-frontend",
  execution_timeout=2 * time.hour,
  properties = {"builder_config": "Debug"},
)

builder_coverage(
  covered_oss = ["linux", "win64"],
  builder_factory = try_builder,
  builder_name_pattern = "devtools_backend_%s_rel",
  recipe_name="devtools/devtools-backend",
  execution_timeout=2 * time.hour,
)

luci.list_view(
  name="tryserver",
  title="Tryserver",
  favicon=defaults.favicon,
  entries =[luci.list_view_entry(builder=b) for b in try_builders],
)

cq_acls=[
  acl.entry(
    [acl.CQ_COMMITTER],
    groups=['project-devtools-committers']
  ),
  acl.entry(
    [acl.CQ_DRY_RUNNER],
    groups=['project-devtools-tryjob-access']
  )
]

cq_retry_config=cq.retry_config(
  single_quota=2,
  global_quota=4,
  failure_weight=2,
  transient_failure_weight=1,
  timeout_weight=4,
)

cq_master_builders=[
  'devtools_frontend_linux_blink_light_rel',
  'devtools_frontend_linux_rel',
  'devtools_frontend_mac_rel',
  'devtools_frontend_win64_rel',
  'devtools_frontend_linux_dbg',
  'devtools_backend_linux_rel',
  #'devtools_backend_mac_rel',
  'devtools_backend_win64_rel',
  'dtf_presubmit_linux',
  'dtf_presubmit_win64',
  'dtf_linux_experiments',
]

cq_master_experiment_builders = [
  # Quarantine a builder here
  # This will make them experiment 100%
  'dtf_linux_experiments',
  'devtools_backend_mac_rel',
  'devtools_backend_win64_rel',
]

def experiment_builder(builder):
  if builder in cq_master_experiment_builders:
    return 100
  else:
    return None

cq_master_includable_only_builders = [
  'devtools_frontend_mac_rel'
]

def includable_only_builder(builder):
  return builder in cq_master_includable_only_builders

luci.cq_group(
  name="master",
  watch=cq.refset(
    repo="https://chromium.googlesource.com/devtools/devtools-frontend",
    refs=["refs/heads/master"]
  ),
  acls=cq_acls,
  tree_status_host="devtools-status.appspot.com",
  retry_config=cq_retry_config,
  verifiers=[
    luci.cq_tryjob_verifier(
        builder=builder,
        disable_reuse=("presubmit" in builder),
        experiment_percentage=experiment_builder(builder),
        includable_only=includable_only_builder(builder)
    ) for builder in cq_master_builders
  ],
)

luci.cq_group(
  name="infra_config",
  watch=cq.refset(
    repo="https://chromium.googlesource.com/devtools/devtools-frontend",
    refs=["refs/heads/infra/config"]
  ),
  acls=cq_acls,
  retry_config=cq_retry_config,
  verifiers=[
    luci.cq_tryjob_verifier(builder="dtf_presubmit_linux", disable_reuse=True)
  ],
)
