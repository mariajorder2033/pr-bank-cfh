# gadgetsite — Product Requirements Document (PRD)

Version 1.1 · Market: Bangladesh · Currency: BDT (৳) · Languages: English + Bangla
Reference material: 10 page screenshots and one ~4-minute (239.7 s) screen recording of the reference store, captured at 1920×868 on a 125 % display scale (= **1536 CSS px** viewport). `design.html` is the visual prototype. Recording analysed so far: **0:00–0:40** (see §13).

---

## 1. Vision and goals

**gadgetsite** is an electronics e-commerce store (phones, tablets, laptops, wearables, audio, TV, home appliances, accessories) for Bangladeshi shoppers. Its defining requirement: **every piece of content, price, image, layout block, menu, policy and setting is controlled from an Admin Panel. No code change is needed for day-to-day operations.**

### Goals
1. A storefront that matches the reference design and behaviour (header, mega menus, sliders, cards, product page, footer).
2. A complete admin panel so non-technical staff can run the business.
3. Bangladesh-specific commerce: EMI by bank and tenure, bKash/Nagad/cards/COD, refund SLAs per payment method, pre-orders and booking amounts, warranty/care plans, Bangla copy.
4. Fast on mobile 4G, SEO-friendly (price pages rank on search).

### Non-goals (v1)
Marketplace with third-party sellers, native mobile apps (a PWA is in scope; the reference lists a Google Play app which is v2), B2B quotations.

### Success metrics
| Metric | Target |
|---|---|
| Mobile page load (LCP) | < 2.5 s on 4G |
| Checkout conversion | ≥ 2.0 % of sessions |
| Share of orders using EMI | tracked, baseline in month 1 |
| Time for staff to launch a campaign | < 10 minutes |
| Admin-only changes (no developer) | 100 % of content/pricing tasks |

---

## 2. Users and roles

| User | Needs |
|---|---|
| Shopper | Find a device, compare, see real price and EMI, pay, track, claim warranty/refund |
| Super Admin | Everything, including roles, payments, settings |
| Content Editor | Home builder, banners, pages, blogs, SEO |
| Catalog Manager | Products, variants, stock, prices, badges |
| Order/Support Agent | Orders, refunds, pre-order requests, chat inbox |
| Marketing | Promotions, flash sales, coupons, newsletter |

Every admin action is permission-checked and written to an audit log.

---

## 3. Brand identity (admin-controlled)

- Site name is **gadgetsite**; the name and **logo are uploaded in Admin → Settings → Site identity**. No hard-coded brand text anywhere.
- Name/logo appear in: header, footer, ribbon ("Welcome to {name} Commerce", "Download the {name} Mobile App"), About page, copyright line ("© 2026 Thanks From {name}TM Ltd."), emails, invoices, SEO titles.
- Logo upload: SVG/PNG, light and dark variants, favicon, social share image.
- Text fallback with ™ if no logo is set.
- Theme tokens editable: page background `#2c2b27` (sampled), raised surface / nav bar `#373330`, header gradient `#302c29 → #151513`, panel `#3a332c`, sand accent `#d2a679`, active-row `#5e5243`, brown band `#6b3f12`, success green, sale pink `#ff7b7b`, banner-dot gold `#eab51a`. Font: Outfit (UI), serif for long descriptions.

---

## 4. Global storefront components

### 4.1 Header (all pages, identical)
- **Top line:** left "New Blogs" and "EMI Policy" (accent colour); right: phone number and "Store locations". All editable.
- **Main row:** logo; text links Brand, Online Exclusive, **Offer** (highlighted pill), Pre-Order; wide search bar ("Search for the item"); three icon boxes: account, cart (with count), theme toggle (light/dark).
- **Menu row:** "EXPLORE ALL" button + dark rounded bar with category items: Phones, Tablet, Laptop, Smart Watch, Gadget, Accessories, Sounds, Smart TV, Home Appliance, Monitor (each with a chevron). Order, names, visibility managed in admin.
- **Scroll behaviour (corrected from recording):** the whole header scrolls away. It is **not** sticky and the menu row does **not** pin. Only the **ribbon** (§4.3) pins to the top of the viewport.
- Header is full-width, dark, with a 28 px rounded bottom and a subtle gradient; the top line sits in an inset pill (rounded bottom, slightly darker).
- **Measured geometry (1536 px viewport):** content container 1328 px; top line ≈ 30 px; logo ≈ 34 px; search 50 px high and ≈ 545 px wide; icon boxes ≈ 52×50, radius 13; menu row 47 px high; chips 31 px high, 14.5 px / weight 500, radius 8; Explore All 140 px wide. Chip hover: text turns sand (0.15 s) and the chevron flips 180° (0.2 s).

### 4.2 Mega menus (hover)
- **EXPLORE ALL:** opens on **hover** (not click), top-down wipe ≈ 0.2 s, closes **instantly** when the pointer leaves. Panel ≈ 581 × 300 px, square corners, flush under the menu row. Left: category list (rows 41 px, radius 8, active row `#5e5243`, with icons). Right: **3-column grid of white brand tiles** (≈ 95×87, radius 10, logo + name) with a thin scrollbar. **Every category has its own brand list**; moving to another category swaps the grid instantly and resets its scroll. Few brands (e.g. Smart TV) → short grid.
- **Category dropdowns:** panel wipes open top-down in ≈ 0.2 s. Moving the pointer from one menu item to another **swaps the panel instantly and replays the wipe** (no close/reopen fade). Leaving the menu row closes it **instantly**. Panel is square-cornered, flush under the menu row, background = page tone. Layouts per category are admin-configured:
  - Phones: 3 columns of brand names.
  - Laptop: 2 columns (e.g. Mac Mini, Apple MacBook, iMac, Gaming Laptop, Ultrabook/2-in-1, Mac Studio, Lenovo | Samsung, Asus, Acer, Dell, MSI, HP).
  - Accessories: wide 6-column list, **7 rows × 36 px**, 14.5 px text, 1 px column dividers, ≈ 1170 px wide, starts at the left edge of the menu bar (Headphone, Keyboards, Chargers, Cases, Power Banks, etc.).
  - Home Appliance: 2 columns (Coffee Maker, Air Purifier, Humidifier, Air Fryer, Massager, Washing Machine, Vacuum Cleaner, Kitchen Stuff, Refrigerator & Freezer, Air Conditioner…).
  - Monitor: short single column of brands.
- Touch devices: tapping a menu item opens its panel; tapping outside closes it. Below 1100 px panels become full-width sheets (§8).

### 4.3 Ribbon
Marquee strip under the header, scrolling at a **constant ≈ 78 px/s** (animation duration is derived from the real content width; pause-on-hover is kept as an accessibility default but was not observed in the recording). **Pins to the top of the viewport once the header has scrolled away**; when pinned it gets a lighter translucent background (`rgba(66,62,57,.96)` + blur), rounded bottom corners (14 px) and a soft shadow, fading in ≈ 0.25 s. Messages (admin list, each with optional icon/link): Welcome message, Mega Sale up to 70 % off, Free delivery above ৳999, Download the app, Secure payment with bKash/Nagad/cards, plus campaign messages (e.g. "iPhone 18 Pro & Pro Max ready stock — instant delivery", Bangla text supported). Red dot separators.

### 4.4 Floating "Send message" tab
Vertical tab fixed to the right edge on every page; opens the chat/message widget; messages go to the admin inbox.

### 4.5 Footer (all pages, identical)
- Newsletter card overlapping the footer top: title, subtitle, email input + Subscribe. Subscriptions stored in admin.
- Dark rounded-top footer, five columns:
  1. Logo, branch addresses (first two shown), 4 social icons (Facebook, Instagram, LinkedIn, YouTube), "Download Our App" + Google Play badge.
  2. **Company:** About Us, Career, Our Brand, Blogs, Press Coverage, Order Tracking, Trade In, Product Disclaimer Policy, Membership Policy, Pre-Order Policy.
  3. **Help Center:** FAQ, Support System, Announcement, Corporate, Feedback, Sitemap, Affiliate Policy, Cookies Policy, Data Protection Policy, Loyalty Program Policy.
  4. **Terms & Conditions:** Terms & Conditions, Refund, Privacy, Warranty, Exchange, Delivery, EMI, Cancellation Policy, Newsletter.
  5. **Branch location:** Branch 1–3 shown, "See more" expands Branches 4–6 and toggles to "See less".
- Bottom curved tab: "© 2026 Thanks From {name}TM Ltd. | All rights reserved".
- All links, columns, branches and badges editable in admin (Menus & Footer).

### 4.6 Product card (used everywhere)
Image · discount % pill (top-left, computed) · badge pill (top-right: Hot Product, New Arrival, Top Selling, High Demand, Customers Choice, Most Popular, Best Selling, Offer Running, Official, Coming Soon) · "Few Left Only!" tag · warranty shield "1 YEAR ✚" on the image · heart (wishlist) and compare icons · name + stock status (green *In Stock* / red *Out of Stock*) · price (bold) + struck regular price · **Add to Cart** and quick-view (eye). Items "To Be Announced" show "Add to Wishlist" instead. Hover: card lifts, image zooms slightly. Heart toggles with a small pop animation.

### 4.7 Other global behaviour
Back-to-top button after scrolling; light/dark theme toggle; page content fades in on navigation; respects "reduced motion"; keyboard focus visible.

---

## 5. Pages

### 5.1 Home
Order of sections (each can be reordered, hidden, scheduled in the Home Builder):
1. Ribbon + **hero slider** — two banners visible (current ≈ 66 % of the container, next peeking at right; 24 px gap; slide shape ≈ 2:1). Full cycle **4.85 s** (≈ 4.55 s hold + **0.28 s** slide, ease-out: fast start, soft stop); the new banner enters from the left. Clickable dots (9 px white; active = 28 px gold pill). Slides contain image, headline, CTA, link, schedule.
2. **Categories** — 8 tiles per page, 2 pages (auto-switch ≈ 6 s with sideways slide, dots clickable); tiles are 4:5, radius 26, 1 px gold-brown border, product image centred; hover fades the tile to cream over ≈ 0.28 s and back on leave. "See all" button darkens slightly on hover.
3. **Flash Sale** — brown full-width band, live countdown (HH:MM:SS style pills), tabs Newest / Popular, 5-card row with dots (slides sideways).
4. Two promo banners (e.g. iPhone Duo pre-book, iPhone 18 Pro series).
5. **Trending Now** — tabs Newest / Best Seller / Best Value.
6. **Clip to Cart** — brown band of vertical video reels with price and quick-add, play button.
7. Two promo banners (TV, iPad).
8. **Shop by Brand** — brand tile strip (selected tile bordered) with that brand's product row.
9. **New Arrivals** — brown band, tabs Newest / Popular.
10. Promo banners (MacBook, Windows laptops).
11. **Most Popular**, three tall banners, **Hot Deal of the Day**, **Feature Products**, two banners.
12. **Latest Blog** — 3 cards (tag, date, title, excerpt, Read More).
13. Trust badges: 100 % Genuine Products, Super fast Delivery, 36 Months Installments, 2 Years Replacement, Best Price in Bangladesh.
14. Four SEO text blocks (smartphones, tablets, laptops, MacBook/iMac) with internal links, "Read More".

### 5.2 Category (e.g. Phones, Laptop)
- Breadcrumb; brand chips (All + brands); **sticky left filter sidebar** with collapsible groups: Budgets (dual-handle tick-mark slider with min/max), Stock Status, Color (and per-category extra filters such as RAM/storage).
- Optional banner slider, **Top Selling** row, **Trending** row, then **Products of {category}** grid with count ("1,220 products found"), sort, pagination/infinite scroll.
- Brand sub-page (e.g. Phones › Vivo) uses the same layout filtered.
- SEO block below the grid: heading, intro, **model-price tables** (e.g. iPhone price list), "Why choose us" list, FAQ-style Q&A, links to other brand price pages. All editable rich text; price tables can auto-generate from live prices.

### 5.3 Product
- Breadcrumb; **left column sticky**: main image with zoom icon, 6 thumbnails (colour images), "Also Order From" WhatsApp / Messenger / Call.
- Right column: title, brand link, wishlist + compare, "N people viewing now" chip, quantity selector, short spec list (display, performance, camera, battery, build), variant selectors (Colour swatches, RAM & Storage, Region/Variant such as JP/MEA, SG/AUS/TH/ZA, USA, "China Variant"), "Sorry! This variant is not available" state, **care plans** (checkbox list with price and coverage), **Exchange** and **EMI** buttons, calculators (Profit Meter, Instant Replacement Calculator, Live price check), **Offer vs Regular price toggle** (offer = Cash/Card/MFS; regular shows "EMI begins at ৳X/month"), **Buy More Save More** add-on list with discounted prices, info tiles (Estimated Delivery, Purchase Point, Minimum Booking Amount).
- Description tab (rich text, images, specs, FAQs), related products.
- **Fixed bottom buy bar:** Store Pickup (view store availability), Home Delivery (express 4 hrs – Dhaka; standard 1–3 days), stock state ("Not in stock"), quantity, Not Available / Buy Now.
- Variant selection updates price, stock, images and bar state.

### 5.4 Brands
Search box + A–Z letter filter (click F → Fastrack, Fitbit, Fujifilm; N → Noise, Nokia, Nothing); logo tile grid (6 columns desktop).

### 5.5 Online Exclusive
Hero banner ("Up to 50 % off"), delivery windows (1–3 days / 3–7 days), four themed banners, rows: Online Exclusive Products, Best Selling Items, Deals of the Day.

### 5.6 Pre-Order ("Looking for something different?")
Form: product name/URL, image upload, name, phone, email, subject, address, T&C checkbox, Submit. Lands in admin inbox with status workflow.

### 5.7 Policy pages
EMI Policy (bank tables, see §6.8), Refund, Warranty, Exchange, Delivery, Cancellation, Privacy, Terms, Cookies, Data Protection, Affiliate, Loyalty, Membership, Pre-Order, Product Disclaimer. Rich text, English + Bangla, "last updated" date shown.

### 5.8 About
Welcome heading, intro, large store photo, 9 stat tiles (customers, products delivered, followers, Google reviews, replacements honoured, outlets, team, SKUs, brands), "Why choose us" images, category cards, city chips with status (live / opening soon). All numbers editable.

### 5.9 Commerce pages
Cart (drawer + page), Checkout (address, delivery method: store pickup / home delivery with express option, payment: COD, card, bKash, Nagad, bank, EMI), Order success, Order tracking, Account (profile, orders, wishlist, addresses, points, warranty claims), Compare, Search results, Blog list/detail, Store locator, FAQ, Contact/Support, 404 and "page couldn't load" error page with Reload / Back.

---

## 6. Admin panel — everything controlled

### 6.1 Dashboard
Sales (today/week/month), orders by status, low-stock list, pre-order requests, top products, traffic, EMI share, refund queue.

### 6.2 Site identity & settings
Name, logo variants, favicon, theme colours, contact numbers, social links, app links, languages, currency format (৳1,85,990 Bangladeshi grouping), delivery zones and fees (free over ৳999; Dhaka express 4 hrs), taxes, payment methods on/off, SMS/email templates, SEO defaults, maintenance mode.

### 6.3 Catalog
- **Products:** title, slug, brand, categories, status, short specs, description (rich text), FAQ, gallery, SEO, badges, "official" flag, warranty text, tags, related products.
- **Variants:** colour (with swatch image), storage/RAM, region/variant; per-variant SKU, offer price, regular price, stock, images, booking amount, availability.
- **Care plans** attachable per product; **add-ons** (Buy More Save More) with discount; **exchange** and **EMI** toggles.
- Computed (never typed): discount %, EMI monthly, stock label.
- Bulk import/export (CSV), duplicate product, bulk price/stock update.
- Rules: product page and listings read the same stock; duplicate model names blocked.

### 6.4 Categories, brands, filters
Category tree with icon/image and order; brand list with logo and A–Z; per-category filters; mega-menu layout builder (columns, items, brand tile sets).

### 6.5 Home & landing builder
Drag-and-drop sections (hero, categories, flash sale, rows, banners, reels, brand strip, blog, trust badges, SEO blocks). Each block: data source (manual / rule: newest, best seller, category, brand, tag), count, tabs, schedule start/end, device visibility. Banner library with image per breakpoint, Bangla/English text, link, CTA. Reels: video upload, linked product. Ribbon messages. Preview before publish; scheduled publish; version history and rollback.

### 6.6 Pages & content
CMS for all policy/about pages, blog posts (categories, tags, SEO, scheduling), FAQ, price-list tables, About stats and store gallery, branch list with status.

### 6.7 Orders
List with filters; status flow (placed → confirmed → packed → shipped → delivered / cancelled / returned); payments; invoices/packing slips; courier assignment and tracking; notes; refunds with SLA timer by method (bank 3 working days, MFS 7–15, EMI 7–15, COD 3); warranty/replacement claims.

### 6.8 EMI & payments manager
Bank table: name, minimum transaction (৳5,000), tenures 3/6/9/12/18/24/30/36 months with % per tenure (two tables: "normal transaction" and "website payment/no POS charge"), N/A cells, gateway fees (QR/link, website direct), card-type fees (VISA/MasterCard vs AMEX). Storefront EMI page and product EMI calculator read these values. "Last updated" stamp.

### 6.9 Promotions
Flash sales (countdown, items, discount), coupons, Buy-More-Save-More rules, free-gift rules, loyalty points ("Purchase Point"), membership tiers, instant discount (e.g. 5 %), pre-book campaigns.

### 6.10 Customers & engagement
Customer list, wishlist, reviews moderation, newsletter subscribers, chat/"Send message" inbox, pre-order request inbox, notifications (SMS, email, push).

### 6.11 Users, roles, audit
RBAC, 2FA, session control, audit log (who changed what, before/after).

---

## 7. Key business rules
1. Displayed price = selected variant's offer price; Regular toggle shows regular price and "EMI begins at ৳X/month".
2. Discount % = (regular − offer) / regular, computed.
3. EMI monthly = (price × (1 + rate)) / tenure using rates from the EMI manager; minimum ৳5,000; banks without a tenure show N/A.
4. A variant with zero stock shows "Not in stock"; Buy Now disabled; the card shows Out of Stock. Listings, product page and bar always agree.
5. Minimum booking amount (e.g. ৳10,000) applies to pre-book items.
6. Free delivery above ৳999; express delivery in 4 hours inside Dhaka where enabled.
7. Care plans and add-ons update the cart total live.
8. Refunds return to the original payment method within the SLA.
9. Flash-sale and banner schedules are enforced server-side.
10. Product pages for items "To Be Announced" accept wishlist only.

---

## 8. Non-functional requirements
- Performance: LCP < 2.5 s, CLS < 0.1, images WebP/AVIF with responsive sizes, lazy loading.
- Accessibility: WCAG 2.1 AA targets, keyboard navigable menus, `prefers-reduced-motion` honoured.
- Responsive: **100 % responsive, mobile-first; zero horizontal scrolling at 375, 768, 1024, 1440 and 1536 px.** Breakpoints: ≤ 700 (phone), 701–1100 (tablet), ≥ 1101 (desktop, matches the recording). Phone header: logo + icons, full-width search, scrollable link row (Brand / Online Exclusive / Offer / Pre-Order), Explore All + horizontally scrollable category chips; top line scrolls sideways. Dropdowns become full-width sheets (mega menu 2 columns, Explore All keeps list + auto-fill grid, max-height 62 vh, scrollable). Hero slides ≈ 88 % wide on phone, 78 % on tablet. Categories 4 columns on phone. Filters in a bottom sheet; buy bar fixed on mobile.
- Localisation: English/Bangla, Bangla numerals optional, ৳ grouping.
- Security/privacy: PCI-safe hosted payments, data-protection policy, cookie consent.
- Availability: 99.9 %; daily backups.
- SEO: server-rendered pages, schema.org Product/Breadcrumb/FAQ, sitemap, canonical URLs, price-list pages.

---

## 9. Animation & interaction specification (from the recording)
| Element | Behaviour |
|---|---|
| Hero slider | Peeking 2-up; cycle 4.85 s (hold ≈ 4.55 s); slide ≈ 0.28 s ease-out `cubic-bezier(.22,.8,.2,1)`; new banner enters from the left; dots clickable |
| Categories | 8 per page, 2 pages, ≈ 6 s auto-switch, sideways slide; hover → tile fades to cream ≈ 0.28 s (and back) |
| Rows (Flash Sale, Trending, etc.) | Sideways slide on dot click/auto; dots pill-style, active dot elongated yellow |
| Countdown | Ticks every second |
| Ribbon | Continuous marquee ≈ 78 px/s; pins to top after the header scrolls away (lighter translucent bg, rounded bottom) |
| Dropdowns | Top-down wipe ≈ 0.2 s; swap between items is instant and replays the wipe; close is instant; chevron flips 180° / text turns sand on hover; Explore All opens on hover and swaps its brand grid (per-category lists) instantly |
| Header on scroll | Scrolls away completely (not sticky); only the ribbon pins |
| Cards | Hover lift + image zoom; heart pop |
| Product page | Sticky gallery; thumbnails swap main image; fixed buy bar |
| Category page | Sticky filter sidebar; collapsible groups with chevrons |
| Footer | "See more" expands with fade |
| Pages | Fade-in on navigation |

*Timings for 0:00–0:40 were measured from frame-by-frame differences at 30 fps plus 10–20 fps contact sheets (accuracy ≈ ±0.05 s). Later sections of the recording are still to be analysed.*

---

## 10. Content issues in the reference to avoid
- Product page showed "Not in stock / variant not available" while listings showed "In Stock" → single source of truth for stock.
- Duplicate "iPhone 14 Plus" row in a price table; an accessory image labelled for a different model → admin validation for duplicates and image/model checks.
- A "page couldn't load" state appeared during navigation → provide a branded error page and retry.

---

## 11. Release plan
| Phase | Scope |
|---|---|
| 1 | Auth, roles, site identity, catalog, variants, media library |
| 2 | Storefront pages, header/footer, menus, search, filters |
| 3 | Cart, checkout, payments, EMI engine, orders |
| 4 | Home builder, CMS, promotions, reels, blog |
| 5 | Refunds, warranty, notifications, analytics, QA, launch |

## 12. Open questions
1. Which payment providers and EMI banks are contracted at launch?
2. Courier partners and express-delivery coverage?
3. Is a native app required at launch or PWA only?
4. Real brand assets: logo, product photography, banner art, store photos.
5. Legal text for policies (Bangla and English).

---

## 13. Reference-recording analysis log (motion & layout)
| Range | Findings applied |
|---|---|
| 0:00–0:10 | Hero slide 0.28 s ease-out, cycle 4.85 s; ticker 78 px/s; nav dropdown wipe 0.2 s, instant swap/close |
| 0:10–0:20 | Hero slides at ≈ 10.0, 14.9, 19.8 s; Explore All opens on hover, closes instantly, brand grid swaps per category |
| 0:20–0:30 | Explore All stays open while the pointer moves down the list; per-category brand lists; grid scrolls (thin scrollbar) |
| 0:30–0:40 | Page scrolls; header leaves, ribbon pins (translucent, rounded bottom); category tile cream fade; "See all" hover; dots style |
| 0:40–4:00 | Not yet analysed |

Layout capture: 1920×868 @125 % = 1536 CSS px; container 1328 px. Brand names, logos and banner artwork in the recording belong to the reference store and are **not** reproduced — all such assets come from Admin.

---

## 14. Full buying process (end to end)

### 14.1 Shopper journey
1. **Discover** — home, category, search, brand, campaign pages.
2. **Product page** — choose colour, storage/RAM, region variant; see live offer price, regular price, stock, delivery estimate, booking amount; add **care plans** and **Buy More Save More** add-ons; optional **Exchange** (trade-in value request) and **EMI** calculator.
3. **Add to Cart** (cart drawer slides in, item count animates) or **Buy Now** (skips the drawer).
4. **Cart** — quantity +/−, remove, care plan and add-on lines, coupon code, loyalty points redemption, free-delivery progress bar (free over ৳999), price-change and stock warnings.
5. **Checkout (4 steps, guest or account):**
   1. *Contact* — phone number with OTP (primary identity in Bangladesh), name, email optional.
   2. *Address* — division → district → upazila/thana → area (from the courier area list), street address, landmark, save address.
   3. *Delivery* — Store pickup (choose branch) · Home delivery standard (1–3 days) · Express (Dhaka, 4 hours, where enabled). Live delivery charge and ETA from the courier quote API.
   4. *Payment* — Cash on delivery · bKash · Nagad · Rocket/Upay · Cards and net banking (gateway page) · **EMI** (choose bank card + tenure, see monthly amount and total) · Bank transfer (upload slip) · Pay at store. Booking-amount items allow paying only the minimum booking amount now and the balance later.
   Right-hand **order summary** stays visible: items, discounts, delivery, payment charge, EMI interest, total (৳ with Bangladeshi grouping).
6. **Review & Place order** — T&C and refund-policy acknowledgement; price and stock re-validated server side; stock reserved for 15 minutes while paying.
7. **Payment** — redirect/pop-up to provider; return to site; status confirmed server-side (never from the browser alone).
8. **Order confirmation** — order number, summary, next steps; SMS + email + (optional) WhatsApp; invoice PDF.
9. **Fulfilment** — admin/auto-confirm, pack, courier booked, tracking link sent.
10. **Tracking** — order tracking page with timeline (Placed → Confirmed → Packed → Handed to courier → In transit → Out for delivery → Delivered) and courier name, consignment ID, rider contact where available.
11. **Delivery** — COD collected by courier, or prepaid parcel handed over (OTP/receipt check for high-value phones: IMEI/serial shown on invoice).
12. **After purchase** — warranty registration (Care+), loyalty points credited, review request, return/exchange/refund request, reorder.

### 14.2 Variations
- **Pre-order / booking:** pay booking amount → order status *Booked* → notify on arrival → pay balance link → ship.
- **Out of stock:** "Notify me" and Wishlist; variant-level "not available" message.
- **Exchange:** upload device details/photos → admin quotes value → value deducted at delivery or checkout.
- **Store pickup:** order ready SMS with pickup code; pay at store or prepaid.
- **Guest checkout:** allowed; order lookup by phone + order number.
- **Reorder / repeat address / saved payment method (tokenised, via gateway only).**

### 14.3 Failure and edge cases (all must have designed states)
Payment failed, cancelled, timed out, or double-clicked (idempotent); gateway returns but webhook is late (pending state, auto-poll); price/stock changed during checkout (clear message, update cart); address not serviceable by any courier (suggest store pickup); courier booking fails (auto-retry, switch courier, alert admin); customer not reachable / delivery attempt failed (reschedule flow); wrong item / damaged (return request within policy window); COD refused (marked, optional future COD restriction).

### 14.4 Order statuses (customer-visible names)
Pending payment · Placed · Confirmed · Processing · Packed · Ready to ship · Shipped · Out for delivery · Delivered · Completed · Cancelled · Payment failed · Return requested · Returned · Refund initiated · Refunded · Booked (pre-order).

---

## 15. Payment systems (Bangladesh)

All payment providers are **pluggable adapters**, switched on/off and configured in Admin → Payment gateways (sandbox/live mode, credentials entered write-only, webhook URL shown for copying, "Test connection" button).

| Method | Provider options | Notes |
|---|---|---|
| Mobile financial services | **bKash** (tokenised checkout), **Nagad**, **Rocket / Upay** (directly or via aggregator) | Customer approves in the wallet app; refunds through provider API |
| Cards, net banking, MFS aggregator | **SSLCommerz**, **aamarPay**, **ShurjoPay** | Hosted payment page (keeps site out of card-data scope); IPN + validation call |
| EMI | Bank EMI via the gateway card flow; EMI table (banks, tenures 3–36 months, minimum ৳5,000) managed in admin | Monthly amount computed from admin rates; website-payment and normal-transaction fee tables kept separate |
| Cash on delivery | Courier collects | Admin rules: allowed zones, max order value, phone OTP required, optional advance/booking payment, COD fee |
| Bank transfer | Manual | Customer uploads slip; admin verifies and marks paid |
| Pay at store | Branch POS | Pickup orders |

Rules: amounts verified server-side against the order; one payment attempt record per try; partial payments (booking + balance) supported; refunds always go back to the original method within the policy SLA (bank transfer 3 working days, MFS 7–15, EMI 7–15, COD 3); gateway charges can be absorbed or passed to the customer per method (admin setting); payment reconciliation report per provider per day.

---

## 16. Courier and shipping systems

| Courier | Use |
|---|---|
| **Pathao Courier** | Nationwide + Dhaka express; price quote, area list, order creation, tracking, webhooks |
| **Steadfast** | Nationwide COD parcels; order creation (single/bulk), status check, balance, return requests |
| **RedX** | Nationwide/hub network; parcel creation, areas, tracking |
| **Paperfly / eCourier** | Alternates and fallbacks |
| **Own riders** | Dhaka 4-hour express and store delivery (manual assignment, status updates by app/phone) |
| **Store pickup** | Branch handover with pickup code |

Capabilities in admin: enable/disable each courier with credentials; **courier rules** by zone, weight, order value and COD amount (priority order and fallback); live **delivery charge quotes** at checkout; **book parcel** with one click (or automatically on "Ready to ship"); bulk booking and bulk label/invoice printing; tracking sync (webhooks + polling); failed-delivery and return handling; **COD settlement** ledger (collected → remitted by courier → reconciled); courier performance report (delivery success rate, average time, returns).

Shipment statuses: Created · Pickup scheduled · Picked up · In transit · At hub · Out for delivery · Delivered · Delivery failed · Rescheduled · Returned to merchant · Cancelled. COD sub-status: Collected · Remitted · Reconciled.

---

## 17. Admin additions for commerce
- **Payment gateways** screen: provider list, mode toggle, credential fields (masked), webhook URL, test, fee settings, EMI banks, COD rules, daily reconciliation.
- **Shipping & couriers** screen: courier list with connection test, rules table (zone → courier priority → base rate), packaging weights, pickup stores/addresses, label templates, COD settlement and courier scorecards.
- **Order detail**: payment attempts timeline, courier booking (button + status), tracking events, notes, partial refund, exchange handling, invoice/label download, audit trail.
- **Risk controls**: phone OTP for COD, repeat-return flag, order velocity limits, blocklist, manual review queue.
- **Notifications templates** (SMS/email/WhatsApp) for each order, payment and shipment event, in English and Bangla.

## 18. Acceptance criteria (commerce)
1. A shopper can complete guest checkout with COD, bKash and card in the sandbox and receive confirmation.
2. A failed or cancelled payment never creates a paid order and releases reserved stock.
3. Paying twice or double-clicking never creates two orders or two charges.
4. Admin can book a parcel with Pathao or Steadfast from the order page and the tracking timeline updates on the customer page.
5. A COD parcel appears in the settlement ledger when marked delivered and can be reconciled.
6. Refunds are issued to the original method and reflected in the order and payment history.
7. All gateway and courier credentials are editable in admin without redeploying and are never shown in full.
