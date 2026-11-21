#!/usr/bin/env bash
# Assertion-preserving diff gate.
#
# `npm run verify` runs this. It compares the working tree with the merge base
# against `origin/main` and refuses two kinds of change:
#
#   1. a spec that lost assertions (an assertion count that went down, or a
#      whole spec file deleted), and
#   2. new lines that silence a test (`test.skip`, `test.only`, `test.fixme`,
#      `waitForTimeout`, `force: true`).
#
# Why a diff gate rather than a rule: eslint cannot see that a PR removed
# `expect` calls from a spec that still "passes", and the repo's whole point is
# that a green run means something. Deleting coverage to get green is the one
# failure mode this repo cannot tolerate.
#
# `@known-defect` pins are fine - they are real assertions, not skips - so they
# pass this gate untouched.
#
# Overrides: BASE_REF=<ref> (default: origin/main). When the base ref cannot be
# resolved the gate prints a notice and exits 0, so a clone without history is
# not blocked; CI checks out with full history so the gate is live there.
set -uo pipefail

BASE_REF="${BASE_REF:-origin/main}"

notice() { printf '\033[0;36mcheck-assertions:\033[0m %s\n' "$*"; }
fail() {
  printf '\033[0;31mcheck-assertions:\033[0m %s\n' "$*" >&2
  FAILED=1
}

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  notice "not a git checkout - nothing to compare"
  exit 0
fi

resolve_base() {
  local candidates=("$BASE_REF")
  [ -n "${GITHUB_BASE_REF:-}" ] && candidates+=("origin/${GITHUB_BASE_REF}")
  candidates+=("main")

  local ref
  for ref in "${candidates[@]}"; do
    if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null; then
      printf '%s' "$ref"
      return 0
    fi
  done

  # A shallow clone has no base commit; fetch it once, then retry.
  for ref in "${candidates[@]}"; do
    local branch=${ref#origin/}
    if git fetch --no-tags --depth=200 origin "$branch" >/dev/null 2>&1 &&
      git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null; then
      printf '%s' "$ref"
      return 0
    fi
  done

  return 1
}

if ! BASE=$(resolve_base); then
  notice "cannot resolve $BASE_REF (no history for it) - skipping the diff gate"
  exit 0
fi

if ! MERGE_BASE=$(git merge-base "$BASE" HEAD 2>/dev/null); then
  notice "no merge base with $BASE - skipping the diff gate"
  exit 0
fi

if [ -z "$(git diff --name-only "$MERGE_BASE" -- tests/)" ] &&
  [ -z "$(git ls-files --others --exclude-standard -- tests/ | grep -E '\.spec\.ts$')" ]; then
  notice "no spec changes against $BASE - nothing to check"
  exit 0
fi

FAILED=0
CHECKED=0

count_assertions() { # <file-at-revision>
  git show "$1" 2>/dev/null | grep -oE 'expect\s*\(' | wc -l | tr -d ' '
}

# --- 1. specs must not lose assertions or disappear ------------------------
# Compares the merge base with the WORKING TREE, so an uncommitted weakening is
# caught before it is ever committed.
while IFS=$'\t' read -r status path; do
  [ -z "${path:-}" ] && continue
  case "$path" in tests/*.spec.ts) ;; *) continue ;; esac
  CHECKED=$((CHECKED + 1))

  case "$status" in
    D)
      fail "$path: spec deleted. Fix the failure - do not delete coverage."
      continue
      ;;
    A)
      if [ ! -s "$path" ] || [ "$(grep -cE 'expect\s*\(' "$path")" -eq 0 ]; then
        fail "$path: new spec contains no assertions."
      fi
      continue
      ;;
  esac

  before=$(count_assertions "${MERGE_BASE}:${path}")
  after=$(grep -oE 'expect\s*\(' "$path" 2>/dev/null | wc -l | tr -d ' ')
  after=${after:-0}

  if [ "$after" -lt "$before" ]; then
    fail "$path: assertions went from $before to $after. Weakening or deleting an assertion to go green is not allowed; assert the correct behaviour instead."
  fi
done < <(git diff --name-status "$MERGE_BASE" -- 'tests/' | awk '{print $1"\t"$2}')

# A spec added but not yet committed never shows up in `git diff`.
while IFS= read -r path; do
  [ -z "$path" ] && continue
  CHECKED=$((CHECKED + 1))
  if [ "$(grep -cE 'expect\s*\(' "$path")" -eq 0 ]; then
    fail "$path: new spec contains no assertions."
  fi
done < <(git ls-files --others --exclude-standard -- tests/ | grep -E '\.spec\.ts$' || true)

# --- 2. no silenced tests in newly added lines -----------------------------
FORBIDDEN='test\.skip|test\.only|test\.fixme|describe\.skip|describe\.only|waitForTimeout|force:\s*true|\.only\('
added=$(git diff --unified=0 "$MERGE_BASE" -- 'tests/' | grep -E '^\+' | grep -vE '^\+\+\+')
while IFS= read -r line; do
  [ -z "$line" ] && continue
  # Comments are allowed to talk about the pattern they forbid.
  case "$(printf '%s' "$line" | sed -E 's/^\+[[:space:]]*//')" in
    //* | \** | \#*) continue ;;
  esac
  hit=$(printf '%s' "$line" | grep -oE "$FORBIDDEN" | head -1)
  if [ -n "$hit" ]; then
    fail "added line silences a test: '$hit' in: $(printf '%s' "$line" | cut -c1-120)"
  fi
done <<<"$added"

if [ "$FAILED" -ne 0 ]; then
  echo "" >&2
  echo "check-assertions: blocked. If the spec genuinely changed shape, keep the" >&2
  echo "assertions: replace the weak one with a stronger value assertion." >&2
  exit 1
fi

notice "OK - $CHECKED changed spec(s), no lost assertions, no silenced tests"
