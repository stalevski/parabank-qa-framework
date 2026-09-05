# ParaBank: known defects and quirks

This is a catalogue of ParaBank behaviours that affect the test suite. Each entry
is pinned by an automated test, so if ParaBank fixes one of them the matching
test starts failing and can be removed rather than quietly masking the fix.

ParaBank is a shared public demo run by Parasoft. Its database is reset now and
then, and anyone using it can mutate it, so the tests always create or derive
their own data and never assert on a specific seeded balance.

## API quirks (verified against the live demo)

| ID         | Area               | Behaviour                                                                                                                                                                   | Test                                          |
| ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| CONTRACT-1 | `Transaction.date` | The published OpenAPI schema declares `date` as `string (date-time)`, but the API returns **epoch milliseconds as a number** (e.g. `1788307200000`).                        | `known-defects.api.spec.ts` (`@known-defect`) |
| FUNDS-1    | `POST /withdraw`   | Withdrawing more than the account balance **succeeds with HTTP 200** ("Successfully withdrew…") and drives the balance negative. There is no insufficient-funds validation. | `known-defects.api.spec.ts` (`@known-defect`) |
| FUNDS-2    | `POST /transfer`   | Likewise, transfers are not balance-checked; a source account can be overdrawn.                                                                                             | observed, not asserted                        |

## Response-format quirks

- ParaBank's CXF-backed REST API returns **XML by default**. Sending the
  standard `Accept: application/json` header - which `BaseApiClient` adds to
  every request - switches the JSON-capable endpoints to JSON. (The CXF
  `_type=json` query shortcut also works but is ParaBank-specific, so the client
  uses the portable header.)
- Fund-movement endpoints (`/transfer`, `/deposit`, `/withdraw`) return a
  **plain-text confirmation string**, not JSON, regardless of the `Accept`
  header. The client reads them as text.
- `POST /createAccount` returns the new `Account` with `balance: 0`, even though
  the account is then seeded with the configured minimum balance (a later read
  shows the real balance).

## Web quirks

- Login errors show up as a paragraph in the right-hand panel
  ("The username and password could not be verified.").
- Submitting the transfer form with an empty amount shows the generic
  "An internal error has occurred and has been logged." page instead of the
  friendlier inline "The amount cannot be empty." message.
- Transfer/deposit/withdraw confirmations are literal server-generated
  sentences, e.g. "Successfully transferred $25.00 from account #13344 to
  account #14343". ParaBank echoes the amount with the same decimal scale it
  receives (send "0" and it says "$0"; send "0.00" and it says "$0.00"), so the
  client always sends amounts with two decimals and tests assert the full
  dynamically-built sentence - never a hardcoded literal (the numbers vary per
  run).
- The seeded `john` / `demo` account is shared and often has negative balances;
  treat all balances as volatile.
