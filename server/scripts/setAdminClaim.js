/**
 * Grants or revokes the `admin` custom claim on a Firebase Auth user.
 *
 * This is a one-off developer script, deliberately NOT an HTTP route —
 * granting admin access should never be something reachable over the
 * network. Run it locally whenever you need to make someone an admin.
 *
 * Usage (from the server/ directory):
 *   node scripts/setAdminClaim.js user@example.com          # grant
 *   node scripts/setAdminClaim.js user@example.com --revoke # revoke
 *
 * Requires server/serviceAccountKey.json (same file used by index.js).
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "..", "serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: node scripts/setAdminClaim.js <email> [--revoke]");
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(email);

  await admin.auth().setCustomUserClaims(user.uid, {
    admin: revoke ? null : true,
  });

  // Also keep a display-only profile doc in Firestore (name shown in
  // the admin dashboard header). This is NOT what grants access — the
  // custom claim above is — Firestore rules block client writes to
  // this collection entirely.
  if (!revoke) {
    await admin.firestore().collection("admins").doc(user.uid).set(
      {
        email: user.email,
        name: user.displayName || user.email,
      },
      { merge: true },
    );
  }

  console.log(
    revoke
      ? `Revoked admin claim for ${email} (${user.uid}).`
      : `Granted admin claim to ${email} (${user.uid}).`,
  );
  console.log(
    "Note: if this user is already signed in elsewhere, they must sign out and back in (or wait ~1hr for their token to auto-refresh) before the change takes effect.",
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to update admin claim:", err.message);
  process.exit(1);
});
