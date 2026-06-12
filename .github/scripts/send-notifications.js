const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA))
});

const db = admin.firestore();

async function main() {
  const hour = new Date().getUTCHours();
  const isMorning = hour >= 2 && hour <= 4; // 03:00 UTC = 8:30 AM IST

  const title = isMorning ? '☀️ Good morning!' : '☾ Signal check-in';
  const body  = isMorning
    ? 'Time to set your three signals. What moves the needle today?'
    : 'Have you completed your signals today? Finish strong before you rest.';

  const snap = await db.collection('fcm_tokens').get();
  if (snap.empty) { console.log('No FCM tokens found.'); return; }

  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  console.log(`Sending to ${tokens.length} device(s)...`);

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: { link: 'https://mintojy-art.github.io/MINTOOS/?screen=SIGNAL' }
    }
  });

  console.log(`Success: ${res.successCount}  Failed: ${res.failureCount}`);

  // Remove stale tokens
  const deletes = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('not-registered') || code.includes('invalid-registration')) {
        deletes.push(db.collection('fcm_tokens').doc(snap.docs[i].id).delete());
      }
    }
  });
  await Promise.all(deletes);
}

main().catch(e => { console.error(e); process.exit(1); });
