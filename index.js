const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
      if(shouldReconnect) startSock();
    } else if(connection === 'open') {
      console.log('opened connection');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if(type === 'notify') {
      for(const msg of messages) {
        if (!msg.key.fromMe && msg.message?.conversation) {
          const reply = `You said: ${msg.message.conversation}`;
          await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
        }
      }
    }
  });
}

startSock();