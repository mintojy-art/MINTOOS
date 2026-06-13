const {initializeApp, cert} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });

const db = getFirestore();

function isNearTime(targetHHMM, nowH, nowM) {
  const [th, tm] = targetHHMM.split(':').map(Number);
  const target = th * 60 + tm;
  const now = nowH * 60 + nowM;
  const diff = Math.abs(target - now);
  return diff < 15 || (1440 - diff) < 15;
}

async function main() {
  const now = new Date();
  const nowH = now.getUTCHours();
  const nowM = now.getUTCMinutes();
  console.log(`Running at UTC ${String(nowH).padStart(2,'0')}:${String(nowM).padStart(2,'0')}`);

  const snap = await db.collection('fcm_tokens').get();
  if (snap.empty) { console.log('No FCM tokens found.'); return; }

  const morningTokens = [];
  const eveningTokens = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (!data.token) continue;
    const morningUTC = data.morningUTC || '03:00';
    const eveningUTC = data.eveningUTC || '16:00';
    if (isNearTime(morningUTC, nowH, nowM)) morningTokens.push(data.token);
    else if (isNearTime(eveningUTC, nowH, nowM)) eveningTokens.push(data.token);
  }

  console.log(`Morning: ${morningTokens.length} device(s) | Evening: ${eveningTokens.length} device(s)`);

  async function send(tokens, title, body) {
    if (!tokens.length) return;
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { fcmOptions: { link: 'https://mintojy-art.github.io/MINTOOS/?screen=SIGNAL' } }
    });
    console.log(`"${title}" → success: ${res.successCount}, failed: ${res.failureCount}`);
    const deletes = res.responses.map((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('not-registered') || code.includes('invalid-registration')) {
          const docId = snap.docs.find(d => d.data().token === tokens[i])?.id;
          if (docId) return db.collection('fcm_tokens').doc(docId).delete();
        }
      }
    }).filter(Boolean);
    if (deletes.length) await Promise.all(deletes);
  }

  await send(morningTokens, '☀️ Good morning!', 'Time to set your three signals. What moves the needle today?');
  await send(eveningTokens, '☾ Signal check-in', 'Have you completed your signals today? Finish strong before you rest.');
}

main().catch(e => { console.error(e); process.exit(1); });
