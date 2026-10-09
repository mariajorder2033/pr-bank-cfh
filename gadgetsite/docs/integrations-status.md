# Payment and courier integrations — status

Every adapter is written from the provider's current official documentation and must pass its
sandbox before going live. Sandbox or live is a per-provider toggle in admin; credentials are
entered in admin, never in code.

The build environment's network policy currently blocks these sandbox hosts, so live sandbox
tests cannot run there yet. Allow them under the environment's Network access settings.

| Provider   | Kind    | Covers                         | Status      | Sandbox host to allow            |
| ---------- | ------- | ------------------------------ | ----------- | -------------------------------- |
| bKash      | Payment | bKash tokenized checkout       | not started | `tokenized.sandbox.bka.sh`       |
| SSLCommerz | Payment | Cards, net banking, EMI, MFS   | not started | `sandbox.sslcommerz.com`         |
| aamarPay   | Payment | Nagad, Rocket, Upay            | not started | `sandbox.aamarpay.com`           |
| COD        | Payment | Cash on delivery               | not started | —                                |
| Bank       | Payment | Bank transfer (slip upload)    | not started | —                                |
| Pathao     | Courier | Nationwide, Dhaka express      | not started | `courier-api-sandbox.pathao.com` |
| Steadfast  | Courier | Nationwide COD parcels         | not started | `portal.packzy.com`              |
| RedX       | Courier | Nationwide hub network         | not started | `sandbox.redx.com.bd`            |
| Own riders | Courier | Dhaka express, manual dispatch | not started | —                                |
| Pickup     | Courier | Store pickup                   | not started | —                                |

Not in v1: ShurjoPay, Paperfly, eCourier, direct Nagad/Rocket/Upay merchant APIs.
