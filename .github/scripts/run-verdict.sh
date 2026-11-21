#!/usr/bin/env bash
# Machine-readable CI run verdict.
#
# Why this exists
# ---------------
# `continue-on-error: true` on a job makes `needs.<job>.result` report `success`
# even when the job failed. On run 44798937153 the Web suite and the
# known-defect pins both failed while the run conclusion was "success", so
# `gh run list` told everyone - humans and agents alike - that the repo was
# green. That is the exact failure mode this script closes.
#
# The suite jobs therefore record the outcome of their *test step* (which stays
# truthful under continue-on-error) into job outputs, and this script is the
# single place that decides what the run means.
#
# Verdicts
#   pass          every selected suite ran and passed                      exit 0
#   not-verified  ParaBank was unhealthy, so no demo suite ran. A vendor
#                 outage is not a repo defect, so this does NOT fail the run -
#                 but it says so loudly instead of claiming success.        exit 0
#   fail          a suite failed, or a selected suite never ran while
#                 ParaBank was healthy.                                     exit 1
#
# Inputs are environment variables (see the `verdict` job in playwright.yml):
#   EVENT, LAYER, UPSTREAM_RESULT, HEALTHY, UI_CODE, API_CODE, LINT_RESULT,
#   SUITE_<NAME>_RESULT (needs.<job>.result) and SUITE_<NAME>_OUTCOME
#   (steps.<test>.outcome). Suites: api, web, known-defects, shuffle.
set -uo pipefail

EVENT=${EVENT:-unknown}
LAYER=${LAYER:-all}
HEALTHY=${HEALTHY:-false}
UPSTREAM_RESULT=${UPSTREAM_RESULT:-}
LINT_RESULT=${LINT_RESULT:-}
UI_CODE=${UI_CODE:-unknown}
API_CODE=${API_CODE:-unknown}
VERDICT_FILE=${VERDICT_FILE:-run-verdict.json}
SUMMARY_FILE=${SUMMARY_FILE:-${RUNNER_TEMP:-.}/run-verdict.md}

SUITES=(api web known-defects shuffle)

failures=()
passed=()
skipped=()
not_selected=()

indirect() { # indirect <VAR_NAME>
  local name=$1
  printf '%s' "${!name:-}"
}

is_selected() { # <suite name> -> "1" when the job was supposed to run
  local name=$1
  if [ "$EVENT" != "workflow_dispatch" ]; then
    printf '1'
    return
  fi
  case "$LAYER" in
    api) case "$name" in api | known-defects) printf '1' ;; *) printf '0' ;; esac ;;
    web) case "$name" in web | shuffle) printf '1' ;; *) printf '0' ;; esac ;;
    *) printf '1' ;;
  esac
}

classify() { # <name> <job result> <recorded step outcome> <selected>
  local name=$1 result=$2 outcome=$3 selected=$4

  if [ "$selected" != "1" ]; then
    not_selected+=("$name")
    return
  fi

  if [ "$result" = "skipped" ] || [ "$result" = "cancelled" ]; then
    if [ "$HEALTHY" = "true" ]; then
      # Nothing legitimately skips a selected suite while the demo is healthy:
      # a filter typo, a missing dependency, or a cancelled job hid real work.
      failures+=("$name: job was '$result' while ParaBank was healthy")
    else
      skipped+=("$name")
    fi
    return
  fi

  # A gating job that arrives here already failed. Demo jobs under
  # `continue-on-error` report `success` here instead, which is why the step
  # outcome below is the real signal.
  if [ "$result" = "failure" ] || [ "$result" = "timedout" ]; then
    failures+=("$name: job failed")
    return
  fi

  case "$outcome" in
    success) passed+=("$name") ;;
    failure | timedout) failures+=("$name: tests failed") ;;
    cancelled) failures+=("$name: cancelled mid-run") ;;
    skipped)
      if [ "$HEALTHY" = "true" ]; then
        failures+=("$name: test step was skipped while ParaBank was healthy")
      else
        skipped+=("$name")
      fi
      ;;
    '')
      # The job concluded but the test step never recorded an outcome (an
      # install/setup failure, or the step never ran).
      failures+=("$name: no test outcome recorded (setup failed or step skipped)")
      ;;
    *)
      failures+=("$name: test step ended '$outcome'")
      ;;
  esac
}

# Gating checks that are not demo suites: these are repo-owned and must pass.
if [ "$LINT_RESULT" != "success" ]; then
  failures+=("lint: job was '$LINT_RESULT'")
fi
if [ "$UPSTREAM_RESULT" != "success" ]; then
  failures+=("upstream probe: job was '$UPSTREAM_RESULT' (the probe script itself failed)")
fi

for suite in "${SUITES[@]}"; do
  upper=${suite^^}
  upper=${upper//-/_}
  classify "$suite" "$(indirect "SUITE_${upper}_RESULT")" "$(indirect "SUITE_${upper}_OUTCOME")" "$(is_selected "$suite")"
done

if [ "${#failures[@]}" -gt 0 ]; then
  verdict=fail
elif [ "$HEALTHY" != "true" ]; then
  verdict=not-verified
elif [ "${#skipped[@]}" -gt 0 ]; then
  # Defensive: skipped suites with a healthy vendor are already failures above.
  verdict=fail
  failures+=("a selected suite did not run")
else
  verdict=pass
fi

join_json() { # quoted, comma-separated list for the JSON payload
  local out='' item
  for item in "$@"; do
    [ -z "$item" ] && continue
    out+="${out:+,}\"${item//\"/\\\"}\""
  done
  printf '%s' "$out"
}

suite_row() { # "<name>": "<state>" for the JSON payload
  local name=$1
  if printf '%s\n' "${failures[@]:-}" | grep -q "^$name:"; then
    printf 'failed'
  elif printf '%s\n' "${passed[@]:-}" | grep -qx "$name"; then
    printf 'passed'
  elif printf '%s\n' "${skipped[@]:-}" | grep -qx "$name"; then
    printf 'skipped'
  else
    printf 'not-selected'
  fi
}

json="{\"verdict\":\"${verdict}\",\"event\":\"${EVENT}\",\"layer\":\"${LAYER}\",\"upstream\":{\"healthy\":${HEALTHY},\"uiStatus\":\"${UI_CODE}\",\"apiStatus\":\"${API_CODE}\"},\"suites\":{"
first=1
for suite in "${SUITES[@]}"; do
  [ "$first" -eq 0 ] && json+=","
  json+="\"${suite}\":\"$(suite_row "$suite")\""
  first=0
done
json+="},\"failures\":[$(join_json "${failures[@]:-}")],\"skipped\":[$(join_json "${skipped[@]:-}")]}"

printf '%s\n' "$json" >"$VERDICT_FILE"

# --- human-readable summary -------------------------------------------------
{
  echo "### Run verdict: \`${verdict}\`"
  echo ""
  echo "| field | value |"
  echo "|---|---|"
  echo "| upstream | healthy=${HEALTHY} (UI ${UI_CODE} / API ${API_CODE}) |"
  echo "| lint | ${LINT_RESULT} |"
  for suite in "${SUITES[@]}"; do
    echo "| ${suite} | $(suite_row "$suite") |"
  done
  echo ""
  case "$verdict" in
    pass)
      echo "**Every selected suite ran and passed.** This run certifies the branch against ParaBank as it was at probe time."
      ;;
    not-verified)
      echo "**NOT VERIFIED - no demo suite ran.** ParaBank answered UI=${UI_CODE} / API=${API_CODE}, so the suites were skipped. This is a vendor outage (5xx / 429 / Cloudflare 1015), not a repository defect - but this run proves nothing about the tests either. Re-run later or run \`npm run verify\` / \`npm run verify:api\` locally."
      ;;
    fail)
      echo "**FAILED.** Details:"
      echo ""
      for f in "${failures[@]}"; do echo "- ${f}"; done
      echo ""
      echo "If the HTML report shows HTTP 429 / 1015 / 5xx against \`parabank.parasoft.com\`, the failure is the vendor rate-limiting the demo - still a real red signal, but not a regression in this repo. A 4xx/assertion failure is a test defect."
      ;;
  esac
} >"$SUMMARY_FILE"

cat "$SUMMARY_FILE"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  cat "$SUMMARY_FILE" >>"$GITHUB_STEP_SUMMARY"
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "verdict=$verdict"
    echo "file=$VERDICT_FILE"
  } >>"$GITHUB_OUTPUT"
fi

case "$verdict" in
  fail)
    echo "::error title=CI verdict: FAIL::$(printf '%s; ' "${failures[@]}")"
    exit 1
    ;;
  not-verified)
    echo "::warning title=CI verdict: NOT VERIFIED (vendor unhealthy)::UI=${UI_CODE} API=${API_CODE} - the demo suites were skipped, so this run says nothing about the tests."
    exit 0
    ;;
  *)
    echo "::notice title=CI verdict: PASS::all selected suites green"
    exit 0
    ;;
esac
