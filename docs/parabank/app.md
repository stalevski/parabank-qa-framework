# ParaBank: application and business logic

What the application under test does, in business terms. It complements
`bugs.md` (what's broken) and `design-decisions.md` (why the framework is built
the way it is).

## Reference URLs

| What                         | URL                                                                 |
| ---------------------------- | ------------------------------------------------------------------- |
| Home / login                 | `https://parabank.parasoft.com/parabank/index.htm`                  |
| Register                     | `https://parabank.parasoft.com/parabank/register.htm`               |
| Services (API catalog)       | `https://parabank.parasoft.com/parabank/services.htm`               |
| OpenAPI Swagger UI           | `https://parabank.parasoft.com/parabank/api-docs/index.html`        |
| OpenAPI spec (YAML, schemas) | `https://parabank.parasoft.com/parabank/services/bank/openapi.yaml` |
| Admin page                   | `https://parabank.parasoft.com/parabank/admin.htm`                  |
| REST API base                | `https://parabank.parasoft.com/parabank/services/bank`              |

The REST API base is a URL prefix, not a page: it returns 404 on its own and
only responds once an endpoint is appended, e.g.
`.../services/bank/customers/12212`.

## What ParaBank is

ParaBank is Parasoft's demo online-banking application. It models a small retail
bank (customers, accounts, transactions, transfers, bill payments and loans),
exposed through a web UI and a REST API, and comes pre-seeded with demo data
(customer `john` / `demo`). It ships with intentional defects and resets its
database every now and then.

## Domain entities

| Entity          | Key fields                                                            | Notes                                     |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| **Customer**    | id, firstName, lastName, address, phoneNumber, ssn, username/password | one customer → many accounts              |
| **Account**     | id, customerId, type, balance                                         | `type` is `CHECKING`, `SAVINGS` or `LOAN` |
| **Transaction** | id, accountId, type, date, amount, description                        | `type` is `Credit` or `Debit`             |
| **Address**     | street, city, state, zipCode                                          | nested on the customer                    |

(ParaBank also has stock positions and loans, which the framework doesn't
cover.)

## Business flows

1. **Register** - create a new customer. Web UI only (there's no REST
   `/register`).
2. **Login** - username + password gives you a customer identity/session.
3. **Accounts overview** - list a customer's accounts and their balances.
4. **Transfer funds** - move an amount from one account to another.
5. **Deposit / Withdraw** - add to or remove from an account balance.
6. **Bill pay** - send a payment to a named payee from an account.
7. **Open new account** - create a new CHECKING/SAVINGS account.
8. **Find transactions** - search an account's history by id, amount or date range.
9. **Request loan** - apply for a loan with an amount and down payment.
10. **Update contact info** - edit a customer's profile.

## Business rules (observed against the live demo)

- **Account types:** CHECKING, SAVINGS, LOAN.
- **Opening an account:** the REST `POST /createAccount` takes `newAccountType`
  as an integer ordinal (`0` = CHECKING, `1` = SAVINGS, `2` = LOAN). The OpenAPI
  description lists string values, but only the integer form is accepted. The
  new account is seeded with the configured minimum balance.
- **No overdraft protection:** `transfer` and `withdraw` don't reject
  insufficient funds; balances are allowed to go negative.
- **Transactions** record a type (`Credit`/`Debit`), amount, description and
  date. The date is epoch milliseconds, even though the published OpenAPI spec
  declares a `date-time` string (documented drift).
- **Login** requires an existing username and the matching password; a
  non-existent username is always rejected.
- **Registration** only exists through the web UI; the REST API has no
  `/register` endpoint (404).
- **Shared state:** the demo database is mutated by everyone and reset
  periodically, so any specific balance is volatile.

## How the framework maps to this domain

| Domain area   | Framework coverage                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Customers     | login (happy + bad password 400), get customer (happy + unknown 400), idempotent login, schema       |
| Accounts      | list, get (happy + unknown 400), create (happy), schema                                              |
| Transactions  | history, single by id, schema                                                                        |
| Fund movement | transfer (happy + zero-amount edge), deposit (happy), withdraw (overdraft `@known-defect`)           |
| Web UI        | login, logout round-trip, invalid-password login error, transfer with API verification, registration |
| Contract      | `ajv` validation against OpenAPI-derived JSON Schemas                                                |
