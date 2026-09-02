# ParaBank — Known defects & application quirks

This catalogue documents ParaBank behaviours that affect the test suite. Each
entry is cross-referenced from the automated tests that pin it, so if ParaBank
ever fixes one of these, the labelled test will start failing and can be
removed rather than silently masking a fix.

ParaBank is a shared public demo maintained by Parasoft. Its database is reset
periodically and mutated by anyone using it, so **tests must create or derive
their own data and never assert on specific seeded balances**.

## API quirks (verified against the live demo)

| ID         | Area                  | Behaviour                                                                                                                                                                                                  | Test                                     |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| CONTRACT-1 | `Transaction.date`    | The published OpenAPI schema declares `date` as `string (date-time)`, but the API returns **epoch milliseconds as a number** (e.g. `1788307200000`).                                                       | `accounts.api.spec.ts` (`@known-defect`) |
| FUNDS-1    | `POST /withdraw`      | Withdrawing more than the account balance **succeeds with HTTP 200** ("Successfully withdrew…") and drives the balance negative. There is no insufficient-funds validation.                                | `accounts.api.spec.ts` (`@known-defect`) |
| FUNDS-2    | `POST /transfer`      | Likewise, transfers are not balance-checked; a source account can be overdrawn.                                                                                                                            | observed, not asserted                   |
| CONTRACT-2 | `POST /createAccount` | The spec types `newAccountType` as `integer` while its description lists string values (`CHECKING`, `SAVINGS`, `LOAN`). The endpoint also returns `404` for valid-looking input in the current demo build. | documented, not asserted                 |
| REGISTER-1 | `POST /register`      | **No REST register endpoint exists** (returns `404`). New customers are created only through the web UI (`register.htm`).                                                                                  | —                                        |

## Response-format quirks

- ParaBank's CXF-backed REST API returns **XML by default**. Appending the
  `_type=json` query parameter (or sending `Accept: application/json`) switches
  the JSON-capable endpoints to JSON. The API client forces JSON everywhere via
  `_type=json`.
- Fund-movement endpoints (`/transfer`, `/deposit`, `/withdraw`) return a
  **plain-text confirmation string**, not JSON — even with `_type=json`. The
  client therefore reads them as text.

## Web quirks

- Login errors surface in a paragraph in the right-hand panel
  ("The username and password could not be verified.").
- **AUTH-1 (flaky, not pinned):** the web login does not reliably validate the
  password. On some runs a wrong password for an existing username is accepted
  (logs in as that customer); on others it is rejected. A non-existent username
  is consistently rejected. Because the behaviour is non-deterministic on the
  shared demo it is recorded here rather than pinned by a test.
- **TRANSFER-UI-1:** submitting the transfer form with an empty amount surfaces
  the generic "An internal error has occurred and has been logged." page rather
  than the friendlier inline "The amount cannot be empty." message.
- The transfer confirmation is the literal text
  "has been transferred from account #A to account #B".
- The seeded `john` / `demo` account is shared and frequently has negative
  balances; treat all balances as volatile.
