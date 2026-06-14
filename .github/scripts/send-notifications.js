const {initializeApp, cert} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });

const db = getFirestore();

async function main() {
  const utcHour = new Date().getUTCHours();
  const isMorning = utcHour >= 2 && utcHour <= 5;   // 03:00 UTC = 8:30 AM IST
  const isEvening = utcHour >= 15 && utcHour <= 18; // 16:00 UTC = 9:30 PM IST

  const title = isMorning ? '☀️ Good morning!' : '☾ Signal check-in';
  const body  = isMorning
    ? 'Time to set your three signals. What moves the needle today?'
    : 'Have you completed your signals today? Finish strong before you rest.';

  console.log(`UTC hour: ${utcHour} | Run type: ${isMorning ? 'morning' : isEvening ? 'evening' : 'unknown'}`);

  const snap = await db.collection('fcm_tokens').get();
  if (snap.empty) { console.log('No FCM tokens found.'); return; }

  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  console.log(`Sending to ${tokens.length} device(s)...`);

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: { fcmOptions: { link: 'https://mintojy-art.github.io/MINTOOS/?screen=SIGNAL' } }
  });

  console.log(`Success: ${res.successCount} | Failed: ${res.failureCount}`);

  const deletes = res.responses.map((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('not-registered') || code.includes('invalid-registration')) {
        const docId = snap.docs.find(d => d.data().token === tokens[i])?.id;
        if (docId) return db.collection('fcm_tokens').doc(docId).delete();
      }
    }
  }).filter(Boolean);

  if (deletes.length) { await Promise.all(deletes); console.log(`Removed ${deletes.length} stale token(s).`); }
}

main().catch(e => { console.error(e); process.exit(1); });
