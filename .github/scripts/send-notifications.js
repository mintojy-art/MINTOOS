const {initializeApp, cert} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });

const db = getFirestore();

function currentISTMinutes() {
    const now = new Date();
    return (now.getUTCHours() * 60 + now.getUTCMinutes() + 5 * 60 + 30) % (24 * 60);
}

function parseHHMM(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

async function main() {
    const configDoc = await db.collection('config').doc('notifications').get();
    const config = configDoc.exists ? configDoc.data() : {};
    const morningIST = config.morningIST || '08:30';
    const eveningIST = config.eveningIST || '21:30';

    const now = currentISTMinutes();
    const morningTarget = parseHHMM(morningIST);
    const eveningTarget = parseHHMM(eveningIST);
    const WINDOW = 14; // minutes — cron fires every 15 min

    const isMorning = Math.abs(now - morningTarget) <= WINDOW;
    const isEvening = Math.abs(now - eveningTarget) <= WINDOW;

    const nowStr = `${Math.floor(now/60).toString().padStart(2,'0')}:${(now%60).toString().padStart(2,'0')}`;
    console.log(`IST: ${nowStr} | morning: ${morningIST} | evening: ${eveningIST} | match: ${isMorning ? 'morning' : isEvening ? 'evening' : 'none'}`);

    if (!isMorning && !isEvening) { console.log('Outside window — skipping.'); return; }

    const title = isMorning ? '☀️ Good morning!' : '☾ Signal check-in';
    const body  = isMorning
        ? 'Time to set your three signals. What moves the needle today?'
        : 'Have you completed your signals today? Finish strong before you rest.';

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
