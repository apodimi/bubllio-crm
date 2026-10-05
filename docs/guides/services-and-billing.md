# Services and billing guide

This guide explains the feature in operational language. It is intended for
business owners, account managers, and IT administrators.

## What the feature answers

For every customer, the workspace can now answer four practical questions:

1. What service has the customer purchased?
2. How often is it charged and when is the next charge due?
3. What amount, including VAT, is expected?
4. Has the charge been paid in full, paid in part, or not paid yet?

This is an operational collection and renewal tool. It does not issue official
tax invoices or replace accounting software.

## Set up the catalog

Open **Services → Catalog** and add the services the business sells repeatedly.
Store the usual net price, currency, VAT rate, and billing cycle. These values
are defaults: they save time but may be changed for an individual customer.

Mark a catalog service inactive when it should no longer be offered. Existing
customer subscriptions remain unchanged.

## Add a customer subscription

Open **Services → Customer subscriptions** and select **Add subscription**.
Choose the customer and either a catalog service or a custom service. Confirm:

- the agreed net amount and VAT rate;
- whether the cycle is one-off, monthly, quarterly, six-monthly, or annual;
- the start date and first charge date;
- whether the next charge should be created automatically after full payment;
- an optional operational reference and internal notes.

The first charge is created immediately. The agreed values are copied into the
subscription, so future catalog edits do not change an existing agreement.

## Record a payment

Open **Services → Charges** and select **Record** beside an open charge. Enter
the amount received, payment date, method, and any external reference.

Partial payments are supported. The charge remains open and shows the exact
outstanding amount. The system rejects amounts above the outstanding balance.
When a recurring charge is fully paid, the next charge is created once, provided
the subscription is active, auto-renew is enabled, and its end date has not
passed.

## Understand the statuses

- **Upcoming:** due on a future date and no payment has been recorded.
- **Due:** due today.
- **Overdue:** the due date has passed.
- **Partially paid:** some money was received but a balance remains.
- **Paid:** the full gross amount was received.
- **Paused:** the customer subscription is temporarily on hold.
- **Cancelled / expired:** the agreement is no longer active. History remains.

## Permissions and data safety

Workspace viewers can read services and charges. Owners, administrators, and
members can create services, edit subscriptions, and record payments according
to the existing CRM permissions. Every company, service, charge, and payment is
isolated to its own workspace. References from another workspace are rejected.

Payments should only be entered after the amount has actually been received.
This first release does not yet support payment reversal, credit notes, bank
reconciliation, or official invoice issuance.
