import React, { useEffect } from 'react';
import {
  CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  MINIMUM_AGE,
  OPERATOR_LOCATION,
  OPERATOR_NAME,
  PRIVACY_PATH,
  SITE_URL,
  TERMS_PATH,
} from '../legal/legalConfig.ts';

/*
 * Bar Tap's Privacy Policy and Terms of Use, shown at /privacy and /terms.
 * Plain-language starting template, not legal advice. Settings (contact email,
 * dates, names) live in src/legal/legalConfig.ts.
 */

type LegalPageName = 'privacy' | 'terms';

/** " by Bar Tap LLC" once OPERATOR_NAME is a business or person, otherwise nothing. */
const runBy = OPERATOR_NAME && OPERATOR_NAME !== 'Bar Tap' ? ` by ${OPERATOR_NAME}` : '';

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const Contact: React.FC = () =>
  CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-tan font-semibold underline underline-offset-2 hover:text-white">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-300 font-semibold">
      [contact email goes here]
    </span>
  );

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
    {children}
  </section>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="leading-relaxed text-neutral-300">{children}</p>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc pl-5 space-y-2 leading-relaxed text-neutral-300 marker:text-copper">{children}</ul>
);

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-neutral-100 font-semibold">{children}</strong>
);

const A: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    className="text-tan underline underline-offset-2 hover:text-white"
  >
    {children}
  </a>
);

// ---------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------

const PrivacyPolicy: React.FC = () => (
  <>
    <P>
      This policy explains what information Bar Tap collects, why, who helps us handle it, and the choices you have.
      Bar Tap is a free app for finding bars, watching live video from the bars that take part, and checking
      specials, deals and reviews. It is run{runBy} from {OPERATOR_LOCATION}, and it is available at{' '}
      <A href={SITE_URL}>{SITE_URL.replace('https://', '')}</A>. In this policy, "we" and "us" mean Bar Tap.
    </P>
    <P>
      <B>The short version:</B> we collect only what the app needs to work. We do not sell your information, we do
      not show ads, and Bar Tap does not charge you anything. Live bar video passes through our server as it plays and
      is not recorded, and it has no sound.
    </P>

    <Section id="information-we-collect" title="1. Information we collect">
      <P>
        <B>When you create an account or sign in.</B> You can sign in with Google or with an email address and
        password.
      </P>
      <List>
        <li>
          With Google, Google shares your name, email address and Google account ID with us. If you have a profile
          picture, Google may share its link too. We never see your Google password.
        </li>
        <li>
          With email, we get the name and email address you type. Your password is handled by Firebase
          Authentication (a Google service) and is never visible to us.
        </li>
        <li>We also keep the date you joined and your account type (patron, bar owner or admin).</li>
      </List>

      <P>
        <B>What you do in the app.</B>
      </P>
      <List>
        <li>The bars you save and the bars you "tap in" to.</li>
        <li>
          Reviews you write: your ratings, your comments, any tags you pick, the date, and the display name shown
          with the review.
        </li>
        <li>
          Live chat messages you post next to a bar's live video: the message, the time, the bar, and the chat name
          shown with it (your first name and last initial, or the bar's name for its owner). We also keep a small
          record of when you last posted (for slow mode), whether a bar owner or admin muted you, people you have
          blocked, and reports you send about a message.
        </li>
      </List>

      <P>
        <B>If you are a bar owner or manager.</B>
      </P>
      <List>
        <li>
          Your request for owner access: your name, job title, work email, account email and the bar you work for.
        </li>
        <li>
          The information you add for your bar: hours, cover, specials, events, deals, phone, website, camera names,
          and replies to reviews.
        </li>
        <li>
          Bar photos and bar details added by you or by the Bar Tap admin. Bar listings are public business
          information.
        </li>
      </List>

      <P>
        <B>Your location (only if you allow it).</B> If you let your browser share your location, the app uses it
        to sort bars by distance and suggest your city. It is saved only on your own device (in your browser's
        storage), not on our servers. You can turn it off any time in your browser or phone settings. If you are
        not signed in, your tap-ins and chosen city are also saved only on your device.
      </P>

      <P>
        <B>Usage and device information.</B> We use Google Analytics for Firebase to understand how the app is used,
        for example which screens are opened and roughly how many people visit. It collects things like your device
        and browser type, pages viewed, an app-instance identifier, and an approximate location worked out from your
        IP address. Our server, like almost every website, also handles your IP address and basic technical details
        when your browser connects to it, and may keep short-lived technical logs to keep the service running and
        secure.
      </P>

      <P>
        <B>Venue numbers.</B> To show how many people are watching a bar's live video, and to give bar owners simple
        totals, Bar Tap counts things like how long a live video was watched, how many people watched at once, and
        how many times a bar's page, directions, website, phone number, social links or chat were used. These are
        stored as anonymous counts and times, with no name, email or account attached, and bar owners only ever see
        the totals. While you are watching, your account ID is held for a moment so that only you can change your
        own entry, and it is deleted as soon as you stop.
      </P>

      <P>
        <B>What we do not collect:</B> payment details (Bar Tap is free), your contacts, your microphone, or your
        camera. Bar Tap never turns on your device's camera or microphone.
      </P>
    </Section>

    <Section id="how-we-use" title="2. How we use your information">
      <List>
        <li>To sign you in and keep your account, saved bars and tap-ins working on any device.</li>
        <li>To show your reviews, and owners' replies to them, to other people using Bar Tap.</li>
        <li>
          To run live chat: show your messages to everyone watching that bar, hide messages from people you block,
          and let owners and admins handle reports, delete messages and mute people.
        </li>
        <li>To check and approve bar owner requests, and let owners manage their own bar's page.</li>
        <li>To show bars near you, if you allowed location.</li>
        <li>To keep Bar Tap safe: stop spam, abuse, cheating and misuse, and enforce our Terms of Use.</li>
        <li>To understand how the app is used so we can fix problems and make it better.</li>
        <li>To answer you when you contact us.</li>
      </List>
      <P>
        We do not sell or rent your personal information, we do not use it for advertising, and we do not share it
        with data brokers.
      </P>
    </Section>

    <Section id="what-is-public" title="3. What other people can see">
      <List>
        <li>
          <B>Reviews are public.</B> Anyone using Bar Tap can see a review, its ratings and the display name next to
          it. Your email address is never shown.
        </li>
        <li>
          <B>Bar owners can see reviews of their bar</B> and reply to them publicly.
        </li>
        <li>
          <B>Live chat is public.</B> Anyone watching a bar's live video can read its chat, including people who are
          not signed in. They see your message and your chat name (first name and last initial), never your email.
          The bar's owner and the Bar Tap admin can delete messages, see reports about messages in that bar, and
          mute someone for the night. Who you block stays private.
        </li>
        <li>
          <B>Saved bars and tap-ins</B> are private to your account. A bar's total tap-in count may be shown, but not
          who tapped in.
        </li>
        <li>
          <B>The Bar Tap admin</B> can see account details (name, email, account type) to manage owners and handle
          reports.
        </li>
      </List>
    </Section>

    <Section id="service-providers" title="4. Services that help run Bar Tap">
      <P>
        A few trusted companies handle information for us, only to run the app. They process it under their own
        privacy and security terms.
      </P>
      <List>
        <li>
          <B>Google Firebase</B> (Authentication, Cloud Firestore database, Realtime Database, Cloud Storage and Google
          Analytics for Firebase) stores accounts, reviews, live chat messages, saved bars, owner information, bar
          photos and anonymous venue counts, and runs sign-in.{' '}
          <A href="https://firebase.google.com/support/privacy">Firebase privacy information</A>,{' '}
          <A href="https://policies.google.com/privacy">Google Privacy Policy</A>.
        </li>
        <li>
          <B>Google Sign-In</B>, if you choose "Continue with Google." Bar Tap's use of information received from
          Google follows the{' '}
          <A href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </A>
          , including its Limited Use requirements. We ask only for your basic profile (name, email and picture).
        </li>
        <li>
          <B>Oracle Cloud</B> hosts the server that delivers the website and passes live bar video through to
          viewers.
        </li>
        <li>
          <B>Google Fonts</B> supplies the app's fonts, so your browser connects to Google to load them.
        </li>
        <li>
          <B>OpenStreetMap (Nominatim)</B> is used only by bar owners and the admin to look up a bar's map location
          from its street address. Only the bar's address is sent, never your personal information.
        </li>
      </List>
      <P>
        We may also share information if the law requires it (for example a valid court order), to protect someone's
        safety, or to protect Bar Tap and its users from fraud or abuse. If Bar Tap is ever sold or merged, your
        information may move to the new owner, who must keep honoring this policy or tell you about changes first.
      </P>
    </Section>

    <Section id="live-video" title="5. Live video from bars">
      <List>
        <li>
          <B>Only bars that choose to take part</B> stream video to Bar Tap, from cameras they own and control.
        </li>
        <li>
          <B>Public areas only.</B> Cameras are meant to show public areas of the bar, such as the main bar, patio,
          stage or entrance, so people can see how busy it is. They must never show restrooms, changing areas,
          offices or any place where people expect privacy.
        </li>
        <li>
          <B>Video only, no sound.</B> Bar Tap streams pictures only. It does not carry or record audio, so
          conversations are never captured or shared through Bar Tap.
        </li>
        <li>
          <B>Not recorded by Bar Tap.</B> Video passes through our cloud relay live, as it plays, and is not saved on
          our servers. We do not use facial recognition and do not try to identify anyone on camera.
        </li>
        <li>
          <B>Bars are responsible for notice.</B> Each participating bar must post clear signs telling guests that
          the area is on a live camera that streams online, and must follow the laws that apply to its cameras.
        </li>
        <li>
          <B>Don't want to be on camera?</B> Ask the bar's staff, or contact us with the bar, the camera and the time,
          and we will look into it. We can switch off a bar's video on Bar Tap.
        </li>
      </List>
      <P>
        A bar's own camera system may keep its own recordings. That is between you and the bar, and is covered by
        the bar's policies, not this one.
      </P>
    </Section>

    <Section id="retention" title="6. How long we keep information">
      <P>
        We keep your account information, saved bars and reviews while your account is open. When you delete your
        account, we delete your profile, saved bars, tap-ins and reviews within 30 days. A few things may last a bit
        longer: copies in Google's routine backups (which expire on Google's schedule), and records we must keep to
        follow the law, settle a dispute or stop abuse. Analytics data is kept for the period set in Google
        Analytics and is not tied to your name or email.
      </P>
      <P>
        <B>Live chat messages are short-lived.</B> Each bar's chat clears at the bar's closing time each night (or at
        4 AM if the bar has no posted hours). After that, messages are no longer shown and are deleted from our
        database automatically, usually within a day. Slow-mode and mute records are cleared the same way. A
        reported message is kept with its report until the admin reviews it, and we may keep records longer when we
        need them to stop abuse or follow the law.
      </P>
    </Section>

    <Section id="delete-account" title="7. Your choices and deleting your account">
      <List>
        <li>
          <B>See or fix your information:</B> you can change your saved bars in the app at any time. For anything
          else, contact us and we will help.
        </li>
        <li>
          <B>Delete a review:</B> contact us with the bar's name and the review, and we will remove it.
        </li>
        <li>
          <B>Delete a chat message or block someone:</B> tap any chat message. You can delete your own messages, and
          report or block anyone else. Blocking hides their messages from you on every bar.
        </li>
        <li>
          <B>Delete your account and data:</B> email <Contact /> from the email address on your account, with the
          subject "Delete my Bar Tap account." We will confirm it is you and delete your account and the data
          linked to it within 30 days, as described above. You do not need to give a reason.
        </li>
        <li>
          <B>Location:</B> turn it off in your browser or phone settings. The app keeps working without it.
        </li>
        <li>
          <B>Google sign-in:</B> you can also remove Bar Tap's access from your Google Account at{' '}
          <A href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</A>. This stops future
          sign-ins with Google but does not delete your Bar Tap data; email us for that.
        </li>
      </List>
      <P>
        Depending on where you live, you may have extra rights, such as asking for a copy of your information. Contact
        us and we will respond within the time the law requires.
      </P>
    </Section>

    <Section id="security" title="8. Security">
      <P>
        Bar Tap uses encrypted connections (HTTPS) and database rules that let each person change only their own
        account, and let owners change only their own bar. Admin access is granted by hand. No system is perfectly
        secure, so please use a strong password and keep it to yourself. If we learn of a breach that affects your
        information, we will tell you as the law requires.
      </P>
    </Section>

    <Section id="age" title={`9. Age requirement (${MINIMUM_AGE}+)`}>
      <P>
        Bar Tap is about bars and drinks, so it is only for people who are {MINIMUM_AGE} or older. We do not knowingly
        collect information from anyone under {MINIMUM_AGE}, and never from children under 13. If you believe someone
        under {MINIMUM_AGE} has an account, contact us and we will delete it.
      </P>
    </Section>

    <Section id="changes" title="10. Changes to this policy">
      <P>
        If we change this policy, we will post the new version here and update the date at the top. If a change is
        important, we will also let you know in the app or by email before it takes effect.
      </P>
    </Section>

    <Section id="contact" title="11. Contact us">
      <P>
        Questions, requests or concerns about privacy: <Contact />. Bar Tap is run from {OPERATOR_LOCATION}, USA.
      </P>
    </Section>
  </>
);

// ---------------------------------------------------------------------------
// Terms of Use
// ---------------------------------------------------------------------------

const TermsOfUse: React.FC = () => (
  <>
    <P>
      These Terms of Use are the rules for using Bar Tap, the website at{' '}
      <A href={SITE_URL}>{SITE_URL.replace('https://', '')}</A> and any Bar Tap app (together, "Bar Tap"). Bar Tap
      is run{runBy} from {OPERATOR_LOCATION}. By using Bar Tap or creating an account, you agree to these
      Terms and to our <A href={PRIVACY_PATH}>Privacy Policy</A>. If you do not agree, please do not use Bar Tap.
    </P>

    <Section id="eligibility" title={`1. You must be ${MINIMUM_AGE} or older`}>
      <P>
        Bar Tap is about bars and alcohol. You must be at least {MINIMUM_AGE} years old to use it. By using Bar Tap you
        confirm that you are. We may close any account we believe belongs to someone under {MINIMUM_AGE}.
      </P>
    </Section>

    <Section id="accounts" title="2. Your account">
      <List>
        <li>Give true information, and keep your sign-in details private.</li>
        <li>You are responsible for what happens on your account. Tell us right away if you think someone else used it.</li>
        <li>One person per account. Don't pretend to be someone else, a bar, or Bar Tap.</li>
        <li>You can stop using Bar Tap and ask us to delete your account at any time (see the Privacy Policy).</li>
      </List>
    </Section>

    <Section id="free" title="3. Bar Tap is free">
      <P>
        Bar Tap is free for everyone. There are no subscriptions or in-app purchases. If we ever offer something that
        costs money, we will show the price and terms clearly first, and you will never be charged without agreeing.
      </P>
    </Section>

    <Section id="info-accuracy" title="4. Bar information, specials and deals">
      <P>
        Hours, cover charges, specials, events, deals, crowd levels and wait times come from bars, from users, or are
        estimates. They can change without notice and may be wrong. Always check with the bar before you go.
      </P>
      <List>
        <li>
          Deals and vouchers are offered by the bars, not by Bar Tap. The bar decides whether to honor them and may
          set its own rules, limits and end dates. Deals have no cash value unless the bar says otherwise.
        </li>
        <li>Bars set their own entry rules, including ID checks, dress codes and capacity limits.</li>
        <li>A listing on Bar Tap does not mean we endorse a bar.</li>
      </List>
    </Section>

    <Section id="live-video" title="5. Live video">
      <List>
        <li>
          Live video comes from cameras owned and run by participating bars. It is video only, with no sound, and
          Bar Tap does not record it.
        </li>
        <li>
          Watch it for personal use only, to see what a bar is like right now. You may not record, screenshot to
          share, rebroadcast, or sell the video, or use it to track, identify, harass or stalk anyone.
        </li>
        <li>Video can lag, freeze, drop out or show a past moment. It may not match what is happening right now.</li>
      </List>
    </Section>

    <Section id="reviews" title="6. Reviews and other content you post">
      <P>
        You own what you write. By posting a review, reply or other content on Bar Tap, you give us a free,
        worldwide, non-exclusive permission to store, show, copy and share it in Bar Tap and in promoting Bar Tap,
        for as long as it stays on Bar Tap. You promise you have the right to post it.
      </P>
      <P>
        <B>Content rules.</B> Reviews should be honest and based on your own real visit. Do not post anything that:
      </P>
      <List>
        <li>is false, misleading, or a fake review (including reviewing your own bar or a competitor's);</li>
        <li>is hateful, harassing, threatening, or targets people for who they are;</li>
        <li>shares someone's personal information, photos of people without permission, or private details;</li>
        <li>is sexually explicit, violent, or promotes illegal activity, drunk driving, or drinking by anyone under 21;</li>
        <li>is spam, advertising, or was paid for or offered in exchange for a reward;</li>
        <li>copies someone else's work or breaks any law.</li>
      </List>
      <P>
        We may remove content or limit or close accounts that break these rules, at our discretion. We are not
        required to check everything posted, and reviews are the opinions of the people who wrote them, not of Bar
        Tap. To report a review or anything else, contact us at <Contact />.
      </P>
      <P>
        <B>Live chat.</B> You must be signed in to post in a bar's live chat, and the content rules above apply to
        every message. Also: no links, phone numbers or email addresses, and one message every few seconds (slow
        mode). Bar Tap filters some words automatically, which may hide or block a message. Anyone can tap a
        message to report it or block the person who sent it. The bar's owner and the Bar Tap admin may delete
        messages and mute someone in that bar's chat for the night, and we may limit or close accounts that keep
        breaking the rules. Chat clears at the bar's closing time each night, so do not count on a message staying
        up.
      </P>
    </Section>

    <Section id="bar-owners" title="7. Extra terms for bar owners and managers">
      <P>If you manage a bar on Bar Tap, you also agree that:</P>
      <List>
        <li>You are authorized to act for the bar, and the information you post about it is accurate.</li>
        <li>
          You honor the deals and specials you post, or remove them as soon as they end. Your deals are your own offer
          to customers.
        </li>
        <li>
          For any camera you connect: you own or control it; it shows public areas only and never restrooms, changing
          areas or other private spaces; it sends video only, with no audio; you post clear signs telling guests the
          area is on a live camera that streams online; and you follow all laws that apply to your cameras.
        </li>
        <li>You keep your camera stream key private, and you tell us right away if it leaks.</li>
        <li>You reply to reviews professionally, and you do not offer rewards for reviews or post fake ones.</li>
        <li>
          Messages you post in your bar's live chat show with an Owner badge and speak for the bar. You use delete
          and mute fairly, to enforce these Terms, and not to hide honest opinions you dislike.
        </li>
        <li>
          You are responsible for your bar's cameras and content, and you will cover Bar Tap's costs if a claim
          against Bar Tap is caused by your cameras or content.
        </li>
      </List>
      <P>
        We may approve or decline owner requests, and remove a listing, a camera feed or owner access at any time,
        for example if a camera shows a private area or a complaint is received.
      </P>
    </Section>

    <Section id="acceptable-use" title="8. Things you may not do">
      <List>
        <li>Break any law, or use Bar Tap to harm, harass, stalk or spy on anyone.</li>
        <li>Try to get into accounts, data or parts of Bar Tap you are not allowed to use.</li>
        <li>Scrape, copy or collect data from Bar Tap with bots or scripts, or overload the service.</li>
        <li>Interfere with Bar Tap's security, servers or video relay, or spread malware.</li>
        <li>Copy, resell or rebuild Bar Tap or its content without our written permission.</li>
      </List>
    </Section>

    <Section id="drink-responsibly" title="9. Drink responsibly">
      <P>
        Bar Tap helps you find bars; it does not sell or serve alcohol. You are responsible for your own choices.
        Please drink responsibly, never drink and drive, and use a ride service or a sober driver.
      </P>
    </Section>

    <Section id="our-rights" title="10. Bar Tap's name and content">
      <P>
        The Bar Tap name, logo, design and software belong to Bar Tap. Bar names, logos and photos belong to their
        owners. These Terms do not give you any right to use them beyond using Bar Tap normally.
      </P>
    </Section>

    <Section id="changes-to-service" title="11. Changes and ending your use">
      <P>
        Bar Tap is a growing app. We may add, change or remove features, bars or camera feeds, or pause or stop the
        service, at any time. We may suspend or close an account that breaks these Terms or puts others at risk. You
        may stop using Bar Tap whenever you like.
      </P>
    </Section>

    <Section id="no-warranties" title="12. No warranties">
      <P>
        Bar Tap is provided "as is" and "as available." To the fullest extent the law allows, we make no promises
        or warranties of any kind, express or implied, including that Bar Tap will always work, be error-free or
        secure, that video will be live or available, or that any bar information, deal or review is accurate. We
        disclaim the implied warranties of merchantability, fitness for a particular purpose and non-infringement.
      </P>
    </Section>

    <Section id="liability" title="13. Limitation of liability">
      <P>
        To the fullest extent the law allows, Bar Tap and the people who run it are not liable for any indirect,
        incidental, special, consequential or punitive damages, or for lost profits, data or goodwill, arising from
        your use of Bar Tap. We are not responsible for what happens at any bar, for the actions of bars or other
        users, or for content they post. Because Bar Tap is free, our total liability for any claim about Bar Tap is
        limited to one hundred U.S. dollars ($100). Some places do not allow some of these limits, so they apply to
        you only as far as the law allows.
      </P>
    </Section>

    <Section id="indemnity" title="14. Your responsibility to us">
      <P>
        If someone makes a claim against Bar Tap because of content you posted, your misuse of Bar Tap, or your
        breaking these Terms or the law, you agree to cover the reasonable costs and losses that result, including
        reasonable legal fees.
      </P>
    </Section>

    <Section id="governing-law" title="15. Florida law">
      <P>
        These Terms are governed by the laws of the State of Florida and the United States, without regard to
        conflict-of-law rules. Any dispute about Bar Tap will be handled in the state or federal courts located in
        Leon County, Florida, and you and Bar Tap agree to those courts. Before filing anything, please contact us
        so we can try to sort it out informally.
      </P>
    </Section>

    <Section id="general" title="16. Other terms">
      <List>
        <li>
          If we change these Terms, we will post the new version here and update the date at the top. If a change is
          important, we will let you know in the app or by email first. Using Bar Tap after a change means you
          accept it.
        </li>
        <li>If part of these Terms can't be enforced, the rest still applies.</li>
        <li>If we don't enforce a rule right away, we can still enforce it later.</li>
        <li>These Terms and the Privacy Policy are the whole agreement between you and Bar Tap about the app.</li>
        <li>
          Apple and Google are not parties to these Terms and are not responsible for Bar Tap or its content. If you
          got Bar Tap from an app store, that store's own terms also apply.
        </li>
      </List>
    </Section>

    <Section id="contact" title="17. Contact us">
      <P>
        Questions about these Terms, or want to report something? Contact us at <Contact />. Bar Tap is run from{' '}
        {OPERATOR_LOCATION}, USA.
      </P>
    </Section>
  </>
);

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

const PAGES: Record<LegalPageName, { title: string; path: string; Body: React.FC }> = {
  privacy: { title: 'Privacy Policy', path: PRIVACY_PATH, Body: PrivacyPolicy },
  terms: { title: 'Terms of Use', path: TERMS_PATH, Body: TermsOfUse },
};

export const LegalPage: React.FC<{ page: LegalPageName }> = ({ page }) => {
  const { title, Body } = PAGES[page];
  const other = PAGES[page === 'privacy' ? 'terms' : 'privacy'];

  useEffect(() => {
    document.title = `${title} · Bar Tap`;
    // Jump to a section if the link has one, e.g. /privacy#delete-account
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    }
  }, [title]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 text-[15px]">
      <header className="sticky top-0 z-10 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 text-white font-bold">
            <span className="w-7 h-7 rounded-lg bg-copper text-ink font-black text-xs flex items-center justify-center">
              BT
            </span>
            <span>Bar Tap</span>
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href={other.path} className="text-neutral-400 hover:text-white">
              {other.title}
            </a>
            <a
              href="/"
              className="px-3 py-1.5 rounded-lg bg-copper hover:bg-copper-dark text-ink font-semibold transition"
            >
              Open the app
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{title}</h1>
        <p className="mt-2 text-sm text-tan">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className="mt-8 space-y-8">
          <Body />
        </div>
      </main>

      <LegalFooter />
    </div>
  );
};

/** Links to both legal pages, for footers. */
export const LegalLinks: React.FC<{ className?: string; linkClassName?: string }> = ({
  className = 'flex items-center gap-4',
  linkClassName = 'hover:text-white',
}) => (
  <span className={className}>
    <a href={PRIVACY_PATH} className={linkClassName}>
      Privacy Policy
    </a>
    <a href={TERMS_PATH} className={linkClassName}>
      Terms of Use
    </a>
  </span>
);

const LegalFooter: React.FC = () => (
  <footer className="border-t border-neutral-800/80 py-6 text-xs text-neutral-500">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span>
        © {new Date().getFullYear()} {OPERATOR_NAME} · {OPERATOR_LOCATION}
      </span>
      <LegalLinks linkClassName="text-neutral-400 hover:text-white" />
    </div>
  </footer>
);
