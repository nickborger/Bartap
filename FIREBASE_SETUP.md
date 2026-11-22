# Bar Tap + Firebase

Sign-in uses Firebase Authentication (Google and email/password). Shared data lives in Cloud Firestore.
The Firebase config is in `src/firebase.ts`.

## What is stored where

| Firestore path | What | Who can write |
| --- | --- | --- |
| `users/{uid}` | name, email, role (`user` / `owner`), `ownedBarIds`, `isPremium`, `freeVip`, `savedBarIds`, `tappedBarIds` | the user (not `role`, `isPremium`, `ownedBarIds`) |
| `reviews/{id}` | patron reviews, shared by everyone | the review's author |
| `bars/{barId}` | owner edits: hours, cover, drink specials, deals, events, replies to reviews | that bar's owner |
| `ownerRequests/{uid}` | "link my venue" requests from the Business Owner tab | the requester |

The built-in bar list still comes from `src/data/*.ts`; `bars/{barId}` only holds the changes an owner made.
City and location stay in the browser (localStorage). Signed-out visitors can browse; saving a bar or
writing a review asks them to sign in. Tap-ins by signed-out visitors stay on their device.

## One-time Firebase console setup

1. **Authentication > Sign-in method**: enable **Google** and **Email/Password**.
2. **Firestore Database > Create database**: production mode, pick a region (e.g. `us-east1`).
3. **Firestore Database > Rules**: paste all of `firestore.rules`, then **Publish**.
4. **Authentication > Settings > Authorized domains**: add your deployed domain (the Cloud Run URL,
   e.g. `bartap-xxxxx.us-west1.run.app`, without `https://`).

## Making someone a bar owner

1. They sign in once (patron or Business Owner tab) so their `users/{uid}` document exists.
   If they used "Request Venue Access", their request is in `ownerRequests/{uid}`.
2. Firebase console > Firestore Database > `users` > their document:
   - set `role` to `owner` (string)
   - set `ownedBarIds` to an array of bar ids, e.g. `["hub-at-feather-oaks"]`
     (ids are the `id` fields in `src/data/bars.ts`; the only bar right now is `hub-at-feather-oaks`)
3. Next time they open the Business Owner tab, the Business Owner Platform opens for their venues.

To give someone premium by hand, set `isPremium` to `true` on their user document.

## Free VIP tier

The app's "Activate Free VIP ($0/mo)" button sets `freeVip: true` on the user's own document, which the
rules allow. `isPremium` (for a future paid tier) can only be set from the console or a server.
When VIP stops being free, remove the free activation and grant `isPremium` from a server instead.
