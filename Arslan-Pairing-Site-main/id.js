const { Storage } = require('megajs');
const fs = require('fs');

function makeid(length = 8) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// MEGA upload only — no fallback
async function uploadSessionToMega(filePath, fileName) {
    const MEGA_EMAIL = process.env.MEGA_EMAIL;
    const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

    if (!MEGA_EMAIL || !MEGA_PASSWORD) {
        throw new Error('MEGA credentials not set in env vars');
    }

    const storage = new Storage({
        email: MEGA_EMAIL,
        password: MEGA_PASSWORD
    });

    await storage.ready;
    const fileBuffer = fs.readFileSync(filePath);
    const file = await storage.upload(fileName, fileBuffer).complete;
    const megaUrl = await file.link();
    const megaFileId = megaUrl.replace('https://mega.nz/file/', '');

    return `LMK-MD~${megaFileId}`;
}

module.exports = {
    makeid,
    uploadSessionToMega
};
