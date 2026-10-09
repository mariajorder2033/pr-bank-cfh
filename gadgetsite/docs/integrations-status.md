# Payment and courier integrations — status

Every adapter is written from the provider's current official documentation and must pass its
sandbox before going live. Sandbox or live is a per-provider toggle in admin; credentials are
entered in admin, never in code.

The build environment's network policy currently blocks these sandbox hosts, so live sandbox
tests cannot run there yet. Allow them under the environment's Network access settings.

| Provider   | Kind    | Covers                            | Status                                                                                                                                                 | Sandbox host to allow            |
| ---------- | ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| bKash      | Payment | bKash tokenized checkout          | not started                                                                                                                                            | `tokenized.sandbox.bka.sh`       |
| SSLCommerz | Payment | Cards, net banking, EMI, MFS      | not started                                                                                                                                            | `sandbox.sslcommerz.com`         |
| aamarPay   | Payment | Nagad, Rocket, Upay               | not started                                                                                                                                            | `sandbox.aamarpay.com`           |
| COD        | Payment | Cash on delivery                  | not started                                                                                                                                            | —                                |
| Bank       | Payment | Bank transfer (slip upload)       | not started                                                                                                                                            | —                                |
| Pathao     | Courier | Nationwide, Dhaka express         | not started                                                                                                                                            | `courier-api-sandbox.pathao.com` |
| Steadfast  | Courier | Nationwide COD parcels            | not started                                                                                                                                            | `portal.packzy.com`              |
| RedX       | Courier | Nationwide hub network            | not started                                                                                                                                            | `sandbox.redx.com.bd`            |
| Own riders | Courier | Dhaka express, manual dispatch    | not started                                                                                                                                            | —                                |
| Pickup     | Courier | Store pickup                      | not started                                                                                                                                            | —                                |
| BulkSMSBD  | SMS     | Login codes (and later order SMS) | built, **unverified** — written from the open-source client `sofolitltd/bulksmsbd` (official docs blocked here); test with your account before go-live | `bulksmsbd.net`                  |

Not in v1: ShurjoPay, Paperfly, eCourier, direct Nagad/Rocket/Upay merchant APIs.

## BulkSMSBD setup

1. In the BulkSMSBD dashboard: get the API key and an **approved** sender ID, and turn **off** IP
   whitelisting (or whitelist the server's IP) — otherwise sends fail with code `1032`.
2. Enter the key and sender ID in the admin panel (Settings → Services, Stage 3). Until that
   screen exists, set `SMS_PROVIDER=bulksmsbd`, `BULKSMSBD_API_KEY`, `BULKSMSBD_SENDER_ID`.
3. Send yourself a login code from `/account/login` → _SMS code_. A failed send is logged as
   `[sms] send failed: BulkSMSBD <code>: <meaning>` and the shopper sees "We could not send the SMS".

Keys saved in admin are encrypted with `CREDENTIALS_KEY` (64 hex characters) and shown only as
their last four characters.
