# Bar Tap + Firebase

Sign-in uses Firebase Authentication (Google and email/password). Shared data lives in Cloud Firestore.
The Firebase config is in `src/firebase.ts`.

## What is stored where

| Firestore path | What | Who can write |
| --- | --- | --- |
| `users/{uid}` | name, email, role (`user` / `owner` / `admin`), `ownedBarIds`, `savedBarIds`, `tappedBarIds` | the user (not `role`, `ownedBarIds`); admins can set `role` to `user`/`owner` and `ownedBarIds` from the Admin screen |
| `reviews/{reviewId}` | shared reviews: `barId`, `userId`, `userName`, `rating`, `comment`, `vibeTags`, `createdAt` | the reviewer (create only) |
| `bars/{barId}` | the full bar listing: name, address, `coordinates`, `market`, neighborhood, type, `weeklyHours`, phone, cover, `priceLevel`, features, drink specials, photo, cameras, `isActive`, plus owner edits (today's hours, events, deals, replies to reviews) | admins (everything); that bar's owner (live fields only: today's hours, cover, specials, events, deals, phone, website, tagline, cameras, replies) |
| `config/seed` | marks that the built-in bars were copied into `bars` | admins |
| `ownerRequests/{uid}` | "link my venue" requests from the Business Owner tab | the requester; admins approve/decline |
| `bars/{barId}/chat/{msgId}` | live chat next to the video: `uid`, `name`, `text`, `role` (`user`/`owner`/`admin`), `createdAt`, `expiresAt` (the bar's closing time tonight) | signed-in users (one message every 5 seconds, no links, not while muted); delete: the writer, that bar's owner, admins |
| `bars/{barId}/chatUsers/{uid}` | slow-mode stamp (`lastPostAt`) and "muted tonight" (`mutedUntil`, `mutedBy`), plus `expiresAt` | the user (slow-mode stamp only); that bar's owner and admins (mute) |
| `chatReports/{id}` | chat messages people reported | any signed-in user creates; that bar's owner and admins read and delete |
| `users/{uid}.blockedUids` | people this user blocked in chat | the user |

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

## Optional: Firebase Storage for photos

Photo uploads work without this. Storage keeps bar documents small and lets you use full-size photos.
New Firebase projects need the pay-as-you-go **Blaze** plan to use Storage (it has a free usage allowance).

1. Firebase console > **Storage** > **Get started** (pick the same region as Firestore).
2. **Storage > Rules**: paste all of `storage.rules`, then **Publish** (only admins can upload; anyone can view).

## Bar Tap is free for every user

There are no user tiers. Everyone gets live camera feeds, deals and vouchers. Older user documents may still
have `isPremium` or `freeVip` fields from an earlier version; the app ignores them, so you can leave them or delete them.

## Live chat (next to the live video)

- One chat room per bar. Anyone can read it; people must be signed in to post. Names show as first name + last
  initial ("Nick B."); a bar's owner posts under the bar's name with a copper **Owner** badge, admins get a
  **Bar Tap** badge. The rules check these badges, so nobody can fake them.
- **Slow mode:** one message every 5 seconds per person (enforced by the rules, not just the app).
- **Filter:** the app refuses slurs, "kill yourself"-type messages, links, emails and phone numbers, and masks
  strong swear words. The rules also refuse links. Word lists are in `src/utils/chatFilter.ts`.
- **Tap any message** for Report, Block, and (owners/admins) Delete and **Mute until closing time**.
  Owners and admins also get **Clear chat** at the top of the chat panel.
- **Reports** show up in Admin > **Chat reports**, with Delete message, Mute and Dismiss.
- **Clearing at closing time:** each message is saved with `expiresAt` = the bar's closing time tonight (from
  its hours; 4 AM if it has none or is closed). The app hides messages after that time right away. To also
  delete them from the database, turn on the two TTL policies below (one time).

### One-time: turn on auto-delete (TTL) for chat

1. Open https://console.cloud.google.com/firestore/databases and sign in with the same Google account.
   At the top, make sure your Firebase project (gen-lang-client-...) is picked.
2. Click **(default)**, then **Time-to-live** in the left menu, then **Create policy**.
3. Collection group: `chat`. Timestamp field: `expiresAt`. Click **Create**.
4. Click **Create policy** again. Collection group: `chatUsers`. Timestamp field: `expiresAt`. Click **Create**.
5. Each policy takes about 10 minutes or more to switch on. When it says **Serving**, you're done.
   Expired messages are usually deleted within 24 hours of closing time. Deletes count as normal Firestore
   deletes, which fit in the free daily allowance for a small app.
