# Russell's Mobile Blade Sharpening

Complete Next.js + Firebase booking and owner-management app.

## Run on your Mac

```bash
npm install
npm run dev
```

Open the URL printed in Terminal, usually `http://localhost:3000` or `http://localhost:3001`.

## One-time Firebase setup

### 1. Enable owner sign-in
Firebase Console → **Security** → **Authentication** → **Get started** → **Email/Password** → Enable.

Then open **Users** → **Add user** and create Russell's owner email and password.

### 2. Publish Firestore rules
Firebase Console → **Firestore** → **Rules**. Replace the rules with the contents of `firestore.rules`, then click **Publish**.

These rules let customers create a booking but only a signed-in owner read, edit, or delete appointments.

### 3. Test
- Customer booking: `/book`
- Owner login: `/login`
- Dashboard: `/admin`

## Included
- Mobile-first homepage and services
- Cloud Firestore bookings
- Duplicate-slot protection through deterministic document IDs
- Owner email/password login
- Live appointment dashboard
- Status controls: Pending, Confirmed, Completed, Cancelled
- Payment tracking: Unpaid/Paid and Cash/Cash App/Venmo
- Revenue and customer totals
- Call, text, and Google Maps direction buttons
- Firestore security rules

## Improvement release

This version adds a mobile-friendly owner workflow with Today, Upcoming, Unpaid, Completed, Customers, and All views; customer visit history; paid/unpaid revenue totals; a multi-stop Google Maps route button; one-tap "I'm on my way" and review-request messages; clearer status badges; and updated no-truck homepage artwork.
