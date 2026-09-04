# Emmaus V2 — competition setup

## 1. Firebase
The existing `firebase-config.js` is kept from the original project. Firebase continues to power:
- Prayer requests
- Prayer Wall
- “I'm praying” counts
- Admin login and moderation

Before the competition, verify your Firestore Security Rules. Do NOT use public `allow read, write: if true;` rules.

## 2. Contact form
The new Contact page uses EmailJS because GitHub Pages does not provide a server-side form handler.

1. Create an EmailJS account.
2. Connect the Gmail address that should receive Emmaus messages.
3. Create an email template using these variables:
   - `{{name}}`
   - `{{email}}`
   - `{{message}}`
4. Open `emailjs-config.js`.
5. Replace:
   - `YOUR_EMAILJS_PUBLIC_KEY`
   - `YOUR_EMAILJS_SERVICE_ID`
   - `YOUR_EMAILJS_TEMPLATE_ID`

The public key is safe to expose in browser code. Never put a private/secret key in the website.

## 3. Test before judging
Test:
- Submit a prayer request.
- Confirm it appears on the Prayer Wall.
- Click “I'm praying” and refresh.
- Try each category filter.
- Sign in to `admin.html`.
- Edit and delete a request.
- Send a Contact message.
- Test the navigation on a phone.
- Test the site in Chrome, Edge, Firefox, and Safari if possible.

## 4. Competition note
`admin.html` is intentionally excluded from the public navigation and has `noindex,nofollow`. It is a management page, not part of the visitor experience.
