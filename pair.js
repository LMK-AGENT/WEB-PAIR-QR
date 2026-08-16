const express = require('express');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { makeid, normalizePhoneNumber, createBase64Session } = require('./id');

const router = express.Router();
const TEMP_ROOT = path.join(__dirname, 'temp');
const log = pino({ level: process.env.LOG_LEVEL || 'info' });

const active = new Map();
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function allowed(ip) {
    const now = Date.now();
    const old = attempts.get(ip) || [];
    const fresh = old.filter(t => now - t < WINDOW_MS);
    if (fresh.length >= MAX_ATTEMPTS) {
        attempts.set(ip, fresh);
        return false;
    }
    fresh.push(now);
    attempts.set(ip, fresh);
    return true;
}

async function cleanup(dir) {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
}

function publicError(err) {
    const message = String(err?.message || 'Pairing failed');
    if (/invalid phone|phone number/i.test(message)) return message;
    return 'Pairing service could not complete the request. Please try again.';
}

router.get('/', async (req, res) => {
    if (!allowed(req.ip)) {
        return res.status(429).json({ error: 'Too many pairing attempts. Try again later.' });
    }

    let number;
    try {
        number = normalizePhoneNumber(req.query.number);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    const id = makeid();
    const sessionDir = path.join(TEMP_ROOT, id);
    active.set(id, sessionDir);

    let sock;
    let finished = false;
    let reconnectTimer;

    const finish = async () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        active.delete(id);
        if (sock) {
            try { sock.ws?.close(); } catch {}
        }
        await cleanup(sessionDir);
    };

    try {
        await fsPromises.mkdir(TEMP_ROOT, { recursive: true });
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, log)
            },
            printQRInTerminal: false,
            logger: log,
            browser: Browsers.macOS('LMK-MD Pairing'),
            markOnlineOnConnect: false,
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        const code = await sock.requestPairingCode(number);
        if (!res.headersSent) {
            res.json({ ok: true, code, id, expiresIn: 180 });
        }

        const expiry = setTimeout(() => finish(), 180000);

        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (connection === 'open' && !finished) {
                finished = true;
                clearTimeout(expiry);
                try {
                    await new Promise(r => setTimeout(r, 2500));
                    const session = await createBase64Session(sessionDir);
                    await sock.sendMessage(sock.user.id, {
                        text:
`╔════════════════════◇
║ 『 LMK-MD SESSION 』
╠════════════════════◇
║ ✔ WhatsApp: Connected
║ ✔ Session: Generated
║ ✔ Format: Base64
╚════════════════════◇

Keep your SESSION_ID private.

${session}`
                    });
                    log.info({ id }, 'Pairing completed');
                } catch (err) {
                    log.error({ err, id }, 'Session generation failed');
                } finally {
                    await finish();
                }
            }

            if (connection === 'close' && !finished) {
                const status = lastDisconnect?.error?.output?.statusCode;
                if (status === DisconnectReason.loggedOut) {
                    if (!res.headersSent) res.status(401).json({ error: 'WhatsApp logged out the pairing session. Try again.' });
                    finished = true;
                    await finish();
                }
            }
        });
    } catch (err) {
        log.error({ err, id }, 'Pairing request failed');
        if (!res.headersSent) res.status(500).json({ error: publicError(err) });
        await finish();
    }
});

module.exports = router;
