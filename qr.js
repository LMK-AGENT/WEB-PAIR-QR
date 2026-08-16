const express = require('express');
const QRCode = require('qrcode');
const path = require('node:path');
const fsPromises = require('node:fs/promises');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { makeid, createBase64Session } = require('./id');

const router = express.Router();
const TEMP_ROOT = path.join(__dirname, 'temp');
const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const active = new Set();

async function cleanup(dir) {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
}

router.get('/', async (req, res) => {
    const id = makeid();
    if (active.size >= 10) {
        return res.status(503).json({ error: 'Pairing service is busy. Try again shortly.' });
    }
    active.add(id);

    const sessionDir = path.join(TEMP_ROOT, id);
    let sock;
    let finished = false;

    const finish = async () => {
        if (finished) return;
        finished = true;
        active.delete(id);
        try { sock?.ws?.close(); } catch {}
        await cleanup(sessionDir);
    };

    try {
        await fsPromises.mkdir(TEMP_ROOT, { recursive: true });
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: log,
            browser: Browsers.macOS('LMK-MD Pairing'),
            markOnlineOnConnect: false,
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        const expiry = setTimeout(() => finish(), 180000);

        sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
            if (qr && !res.headersSent) {
                res.type('png').send(await QRCode.toBuffer(qr, { width: 360, margin: 2 }));
            }

            if (connection === 'open' && !finished) {
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
                    log.info({ id }, 'QR pairing completed');
                } catch (err) {
                    log.error({ err, id }, 'Session generation failed');
                } finally {
                    await finish();
                }
            }

            if (connection === 'close' && !finished) {
                const status = lastDisconnect?.error?.output?.statusCode;
                if (status === DisconnectReason.loggedOut) await finish();
            }
        });
    } catch (err) {
        log.error({ err, id }, 'QR request failed');
        if (!res.headersSent) res.status(500).json({ error: 'QR pairing service is currently unavailable.' });
        await finish();
    }
});

module.exports = router;
