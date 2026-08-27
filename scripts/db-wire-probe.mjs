#!/usr/bin/env node
/** Raw Postgres wire check — no credentials logged. */
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(repoRoot, '.env'), 'utf8');
const line = envText.split(/\n/).find((l) => l.startsWith('DATABASE_URL='));
if (!line) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const url = new URL(line.slice('DATABASE_URL='.length).trim());
const host = url.hostname;
const port = Number(url.port || 5432);

const readSome = (socket, ms = 5000) =>
  new Promise((resolvePromise) => {
    let data = Buffer.alloc(0);
    const done = (value) => {
      clearTimeout(timer);
      socket.removeAllListeners();
      resolvePromise(value);
    };
    const timer = setTimeout(() => done({ data, timedOut: true }), ms);
    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      if (data.length >= 1) done({ data, timedOut: false });
    });
    socket.on('error', (err) => done({ error: err.message }));
    socket.on('end', () => done({ data, ended: true }));
  });

console.log(`Probing ${host}:${port} ...`);

const plain = net.connect({ host, port, timeout: 10000 });
plain.on('timeout', () => {
  console.error('Plain TCP: timeout');
  plain.destroy();
});
plain.on('connect', async () => {
  console.log('Plain TCP: connected');
  const first = await readSome(plain, 3000);
  if (first.error) console.log('Plain read error:', first.error);
  else if (first.data.length === 0) {
    console.log('Plain read: no bytes (proxy open, Postgres likely not responding)');
  } else {
    console.log('Plain read bytes:', first.data.length, 'first byte:', first.data[0]);
  }
  plain.destroy();

  // Postgres SSLRequest: length 8, code 80877103
  const sslReq = Buffer.alloc(8);
  sslReq.writeInt32BE(8, 0);
  sslReq.writeInt32BE(80877103, 4);

  await new Promise((r) => setTimeout(r, 500));

  const sslSocket = net.connect({ host, port, timeout: 10000 });
  sslSocket.on('connect', async () => {
    sslSocket.write(sslReq);
    const sslResp = await readSome(sslSocket, 5000);
    if (sslResp.data.length === 0) {
      console.log('SSLRequest: no response (database backend probably down/sleeping)');
      sslSocket.destroy();
      process.exit(4);
    }
    const byte = sslResp.data[0];
    console.log('SSLRequest response byte:', byte, byte === 83 ? '(S = SSL allowed)' : byte === 78 ? '(N = SSL not allowed)' : '(unexpected)');

    if (byte === 83) {
      const secure = tls.connect({ socket: sslSocket, servername: host, rejectUnauthorized: false });
      secure.on('secureConnect', () => {
        console.log('TLS handshake: OK');
        secure.end();
        process.exit(0);
      });
      secure.on('error', (err) => {
        console.error('TLS handshake failed:', err.message);
        process.exit(5);
      });
    } else {
      sslSocket.destroy();
      process.exit(0);
    }
  });
  sslSocket.on('error', (err) => {
    console.error('SSL probe connect error:', err.message);
    process.exit(3);
  });
});
plain.on('error', (err) => {
  console.error('Plain TCP failed:', err.message);
  process.exit(2);
});
