# Newsletter privacy operations

Agreed with the owner on 1 November 2026. Public notice: privacy/index.html.

## Manual handling

Unsubscribe links currently open an email to info@doxaessence.com. They are not an automatic opt-out endpoint. Monitor this inbox and process requests promptly, stopping newsletter sends as soon as the request is handled. Before preparing a mailing, check outstanding opt-outs; deleting a contact must not leave an already prepared recipient job eligible to send.

Within 30 days of receiving an opt-out, delete the newsletter profile using the administrator contact deletion action (covers launch list and legacy waitlist; welcome notification is cascade-deleted). Review queued campaigns, historical newsletter recipient/delivery records and Resend records separately: profile deletion alone does not remove all copies. Cancel unsent newsletter jobs and remove or anonymise records no longer needed.

Keep only email address, opt-out date and opt-out status in a restricted opt-out record where needed to avoid accidental re-import. Do not use this record for marketing. The current application does not implement a dedicated suppression list or automatic 30-day cleanup: this is an owner-operated procedure. A fresh explicit signup can be distinguished from an accidental re-import.

At least annually, review whether the newsletter list is actively used and still necessary. Remove unused profiles if the newsletter is discontinued. Review the need for minimal opt-out records and correspondence at the same time. Record the review date and outcome. No scheduled reminder or cleanup was created by this text update.

## Provider verification

The public notice describes published supplier transfer mechanisms, not a verification of this account's executed contracts or settings. Verify applicable DPAs for Supabase, Resend and Cloudflare in the owner accounts, save the applicable terms and transfer safeguards, and check database region and backup/log retention settings. The previous notice stated Ireland; this update avoids asserting a region that was not independently confirmed in the account.

Sources checked on 1 November 2026:
- https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- https://supabase.com/legal/customer-resources/data-processing-addendum
- https://resend.com/legal/dpa
- https://resend.com/legal/subprocessors
- https://www.cloudflare.com/cloudflare-customer-dpa/

The notice concerns the newsletter website. Update it before enabling sales to describe Mollie, PostNL and the actual order data, legal bases and retention rules. This change does not deploy the website.
