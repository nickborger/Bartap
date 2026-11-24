# Bar Tap + Firebase

Sign-in uses Firebase Authentication (Google and email/password). Shared data lives in Cloud Firestore.
The Firebase config is in `src/firebase.ts`.

## What is stored where

| Firestore path | What | Who can write |
| --- | --- | --- |
| `users/{uid}` | name, email, role (`user` / `owner` / `admin`), `ownedBarIds`, `isPremium`, `freeVip`, `savedBarIds`, `tappedBarIds` | the user (not `role`, `isPremium`, `ownedBarIds`); admins can set `role` to `user`/`owner` and `ownedBarIds` from the Admin screen |
| `reviews/{reviewId}` | shared reviews: `barId`, `userId`, `userName`, `rating`, `comment`, `vibeTags`, `createdAt` | the reviewer (create only) |
| `bars/{barId}` | the full bar listing: name, address, `coordinates`, `market`, neighborhood, type, `weeklyHours`, phone, cover, `priceLevel`, features, drink specials, photo, cameras, `isActive`, plus owner edits (today's hours, events, deals, replies to reviews) | admins (everything); that bar's owner (live fields only: today's hours, cover, specials, events, deals, phone, website, tagline, cameras, replies) |
| `config/seed` | marks that the built-in bars were copied into `bars` | admins |
| `ownerRequests/{uid}` | "link my venue" requests from the Business Owner tab | the requester; admins approve/decline |

Bars are no longer in the code. `src/data/bars.ts` only holds The Hub at Feather Oaks as **seed data**: until an
admin presses **Copy built-in bars to Firestore** on the Admin screen, the app shows that built-in bar so it is
never empty. After that, the `bars` collection is the only source and new bars go live with no redeploy.

City and location stay in the browser (localStorage). Signed-out visitors can browse; saving a bar or
writing a review asks them to sign in. Tap-ins by signed-out visitors stay on their device.

## One-time Firebase console setup

1. **Authentication > Sign-in method**: enable **Google** and **Email/Password**.
2. **Firestore Database > Create database**: production mode, pick a region (e.g. `us-east1`).
3. **Firestore Database > Rules**: paste all of `firestore.rules`, then **Publish**.
   Do this again every time `firestore.rules` changes (this version adds admin rules).
4. **Authentication > Settings > Authorized domains**: add the domain your Oracle VM serves the app on
   (e.g. `bartap.duckdns.org` or `bartap.com`, without `https://`). See `ORACLE_SETUP.md`.
   You can remove the old AI Studio / Cloud Run address (`*.run.app`) once the Oracle site works.

## Making yourself an admin (first time only)

1. Open the deployed app and sign in once with your own account (this creates your profile).
2. Firebase console > **Firestore Database** > **Data** > `users`. Find your document (its `email` field is your
   sign-in email; the document ID is your user ID, also shown under **Authentication > Users**).
3. Click the `role` field, change its value to `admin` (type: string), and press **Update**.
4. Reload the app. A copper **Admin** button appears in the top bar.
5. On the Admin screen, press **Copy built-in bars to Firestore** once. This moves The Hub at Feather Oaks into
   the `bars` collection (keeping its photo and any owner edits).

Admin can only be granted in the console. The app and the rules never let anyone make themselves, or anyone
else, an admin. To add another admin, repeat steps 2-3 for their document. To remove one, set `role` back to `user`.

## Adding and managing bars (Admin screen > Bars)

- **Add a bar**: fill in the form and press **Add bar (goes live now)**. Only the name and street address are
  required. **Look up** fills the map position from the address (free OpenStreetMap lookup; you can also type
  latitude/longitude). The bar ID is made from the name, e.g. `madison-social`.
- **Edit**: change any field and **Save changes**. Owner-managed extras (events, flash deals, staff, replies) are kept.
- **Hide / Show**: hides a bar from patrons without deleting it (`isActive: false`).
- **Delete**: removes the bar for good and unlinks its owners. Its reviews stay in `reviews`.
- **Photos**: **Upload photo** uses Firebase Storage if it is enabled; otherwise the photo is shrunk and saved
  inside the bar's document, so uploads work either way. You can also paste an image link.

## Making someone a bar owner (Admin screen > Owners)

1. The person signs in to Bar Tap once.
2. Admin screen > **Owners** > type their sign-in email, pick the bar, press **Make owner**.
   This sets their `role` to `owner` and adds the bar ID to `ownedBarIds`. They get the Owner dashboard on next load.
3. Requests sent from the Business Owner tab ("Request Venue Access") show under **Venue access requests**,
   with **Approve** (links them to the bar you pick) and **Decline**.
4. To remove an owner, tap the unlink icon next to the bar under **Current owners**.

To give someone premium by hand, set `isPremium` to `true` on their user document.

## Optional: Firebase Storage for photos

Photo uploads work without this. Storage keeps bar documents small and lets you use full-size photos.
New Firebase projects need the pay-as-you-go **Blaze** plan to use Storage (it has a free usage allowance).

1. Firebase console > **Storage** > **Get started** (pick the same region as Firestore).
2. **Storage > Rules**: paste all of `storage.rules`, then **Publish** (only admins can upload; anyone can view).

## Free VIP tier

The app's "Activate Free VIP ($0/mo)" button sets `freeVip: true` on the user's own document, which the
rules allow. `isPremium` (for a future paid tier) can only be set from the console or a server.
When VIP stops being free, remove the free activation and grant `isPremium` from a server instead.
