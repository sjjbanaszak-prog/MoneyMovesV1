/**
 * upgrade-user.js
 * Sets a user's plan field in Firestore using the Firebase REST API.
 *
 * Usage:
 *   node scripts/upgrade-user.js <uid> [plan]
 *
 * Examples:
 *   node scripts/upgrade-user.js abc123uid premium
 *   node scripts/upgrade-user.js abc123uid free
 *
 * To find a user's UID:
 *   Firebase Console → Authentication → Users → copy the UID column
 *
 * Requires: REACT_APP_FIREBASE_API_KEY and REACT_APP_FIREBASE_PROJECT_ID in .env
 *
 * NOTE: This uses an unauthenticated Firestore PATCH. It only works while
 * Firestore rules allow writes to users/{uid} without enforcing ownership.
 * Before tightening rules, switch to firebase-admin SDK + service account.
 */

require('dotenv').config();
const https = require('https');

const API_KEY    = process.env.REACT_APP_FIREBASE_API_KEY;
const PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const UID        = process.argv[2];
const PLAN       = process.argv[3] || 'premium';

if (!API_KEY || !PROJECT_ID) {
  console.error('Missing REACT_APP_FIREBASE_API_KEY or REACT_APP_FIREBASE_PROJECT_ID in .env');
  process.exit(1);
}
if (!UID) {
  console.error('Usage: node scripts/upgrade-user.js <uid> [plan]');
  console.error('Find the UID in Firebase Console → Authentication → Users');
  process.exit(1);
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function updatePlan(uid, plan) {
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}` +
               `?updateMask.fieldPaths=plan&updateMask.fieldPaths=planActivatedAt&key=${API_KEY}`;
  const now = new Date().toISOString();

  const res = await request({
    hostname: 'firestore.googleapis.com',
    path,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  }, {
    fields: {
      plan:            { stringValue: plan },
      planActivatedAt: { stringValue: now },
    },
  });

  if (res.status !== 200) {
    throw new Error(`Firestore PATCH failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

(async () => {
  try {
    console.log(`Updating user ${UID} → plan: "${PLAN}"...`);
    await updatePlan(UID, PLAN);
    console.log(`Done. User ${UID} is now on the "${PLAN}" plan.`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
