const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const { makeid, uploadSessionToMega, createBase64Session } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
	default: Arslan_Tech,
	useMultiFileAuthState,
	jidNormalizedUser,
	Browsers,
	delay,
	makeInMemoryStore,
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
	if (!fs.existsSync(FilePath)) return false;
	fs.rmSync(FilePath, {
		recursive: true,
		force: true
	})
};

const {
	readFile
} = require("node:fs/promises")
router.get('/', async (req, res) => {
	const id = makeid();
	async function Arslan_MD_QR_CODE() {
		const {
			state,
			saveCreds
		} = await useMultiFileAuthState('./temp/' + id)
		try {
			let Qr_Code_By_Arslan_Tech = Arslan_Tech({
				auth: state,
				printQRInTerminal: false,
				logger: pino({
					level: "silent"
				}),
				browser: Browsers.macOS("Desktop"),
			});

			Qr_Code_By_Arslan_Tech.ev.on('creds.update', saveCreds)
			Qr_Code_By_Arslan_Tech.ev.on("connection.update", async (s) => {
				const {
					connection,
					lastDisconnect,
					qr
				} = s;
				if (qr) await res.end(await QRCode.toBuffer(qr));
				if (connection == "open") {
					await delay(5000);
				    
				    const credsPath = __dirname + `/temp/${id}/creds.json`;
				    let sessionText = await uploadSessionToMega(credsPath, `creds-${id}.json`);
				    
				    let session = await Qr_Code_By_Arslan_Tech.sendMessage(Qr_Code_By_Arslan_Tech.user.id, { text: sessionText });
	
				    let Arslan_MD_TEXT = `
╔════════════════════◇
║ 『 SESSION CONNECTED 』
║ ⚡ LMK-AGENT002-MD ⚡
║ 🔷 OFFICIAL INSTANCE 🔷
╚════════════════════╝

╔════════════════════◇
║ 『 SYSTEM STATUS 』
║ ✔ Connection: Stable
║ ✔ Bot: Online & Active
║ ✔ Mode: Fully Operational
╚════════════════════╝

╔════════════════════◇
║ 『 DEPLOYMENT INFO 』
║ • Set your SESSION_ID in Heroku
║ • Keep it secure, don't leak it
╚════════════════════╝

╔════════════════════◇
║ 『 CONNECT & SUPPORT 』
║ ▶ YouTube:
║ youtube.com/@lmkagent
║
║ ▶ Owner:
║ http://wa.me//0604707015
║
║ ▶ GitHub Repo:
║ https://github.com/LMK360/LMK-AGENT002-MD-BOT-
║
║ ▶ WhatsApp Channel:
║ https://whatsapp.com/channel/0029Vb7LwaM7dmeTaTNO6Y2u
╚════════════════════╝

╔════════════════════◇
║ 『 POWERED BY 』
║ ⚡ LMK-AGENT002-MD ⚡
║ Automation • Control • Precision
╚════════════════════╝

✨ Stay connected. Stay ahead.

⭐ Don't forget to star the repo.
______________________________`;
	 await Qr_Code_By_Arslan_Tech.sendMessage(Qr_Code_By_Arslan_Tech.user.id,{text:Arslan_MD_TEXT},{quoted:session})



					await delay(100);
					await Qr_Code_By_Arslan_Tech.ws.close();
					return await removeFile("temp/" + id);
				} else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
					await delay(10000);
					Arslan_MD_QR_CODE();
				}
			});
		} catch (err) {
			if (!res.headersSent) {
				await res.json({
					code: "Service is Currently Unavailable"
				});
			}
			console.log(err);
			await removeFile("temp/" + id);
		}
	}
	return await Arslan_MD_QR_CODE()
});
module.exports = router
