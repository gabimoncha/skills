# tally

Invoicing service for small agencies.

## Operations

- All outbound HTTP calls time out after 30 seconds.
- Nightly reconciliation runs at 02:00 UTC and compares issued invoices with
  settled payments.
- Access tokens are refreshed automatically before they expire.

## Develop

```sh
npm install
npm test
```
