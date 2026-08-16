const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function makeid(length = 12) {
    return crypto.randomBytes(Math.ceil(length * 0.75))
        .toString('base64url')
        .slice(0, length);
}

function normalizePhoneNumber(value) {
    const number = String(value ?? '').replace(/\D/g, '');
    if (!/^\d{7,15}$/.test(number)) {
        throw new Error('Invalid phone number. Use country code and digits only, for example 27821234567.');
    }
    return number;
}

// Base64 session format:
// LMK-MD~ + base64url(JSON({ v: 1, files: { relativePath: base64(file) } }))
// This packages the complete multi-file Baileys auth state, not only creds.json.
async function createBase64Session(sessionDir) {
    const files = {};
    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            const rel = path.relative(sessionDir, full).replaceAll(path.sep, '/');
            if (entry.isDirectory()) {
                await walk(full);
            } else if (entry.isFile()) {
                files[rel] = (await fs.readFile(full)).toString('base64');
            }
        }
    }

    await walk(sessionDir);
    if (!files['creds.json']) throw new Error('Authentication did not produce creds.json.');

    const payload = JSON.stringify({ v: 1, files });
    return `LMK-MD~${Buffer.from(payload, 'utf8').toString('base64url')}`;
}

function validateBase64Session(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId.startsWith('LMK-MD~')) {
        throw new Error('Invalid session format. Expected LMK-MD~...');
    }
    const encoded = sessionId.slice('LMK-MD~'.length);
    if (!encoded || encoded.length > 2_000_000) {
        throw new Error('Invalid or oversized session.');
    }
    JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return true;
}

module.exports = { makeid, normalizePhoneNumber, createBase64Session, validateBase64Session };
