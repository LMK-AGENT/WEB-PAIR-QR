const express = require('express');
const path = require('node:path');
const pairRouter = require('./pair');
const qrRouter = require('./qr');

const app = express();
const PORT = Number(process.env.PORT || 10000);

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'LMK-MD pairing',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.use('/qr', qrRouter);
app.use('/code', pairRouter);
app.get('/pair', (_req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'main.html')));

app.use((err, _req, res, _next) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`LMK-MD pairing service listening on port ${PORT}`);
});

function shutdown(signal) {
    console.log(`${signal}: shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
