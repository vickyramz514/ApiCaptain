import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { OpenApiError } from '../types/errors.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
]);

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
};

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
  if (normalized.startsWith('fe80')) return true; // link-local
  if (normalized.startsWith('ff')) return true; // multicast
  // IPv4-mapped
  if (normalized.includes('.')) {
    const mapped = normalized.split(':').pop();
    if (mapped && isPrivateIpv4(mapped)) return true;
  }
  return false;
};

export const isBlockedIpAddress = (ip: string): boolean => {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
};

export const assertSafePublicUrl = async (rawUrl: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new OpenApiError('INVALID_URL', 'Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OpenApiError('INVALID_URL', 'Only http and https URLs are allowed');
  }

  if (url.username || url.password) {
    throw new OpenApiError('SSRF_BLOCKED', 'URLs with credentials are not allowed');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new OpenApiError('SSRF_BLOCKED', 'URL target is not allowed');
  }

  if (isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new OpenApiError('SSRF_BLOCKED', 'URL target is not allowed');
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new OpenApiError('URL_FETCH_FAILED', 'Unable to resolve host');
  }

  if (!addresses.length) {
    throw new OpenApiError('URL_FETCH_FAILED', 'Unable to resolve host');
  }

  for (const entry of addresses) {
    if (isBlockedIpAddress(entry.address)) {
      throw new OpenApiError('SSRF_BLOCKED', 'URL target is not allowed');
    }
  }

  return url;
};

export const isSafePublicUrl = async (rawUrl: string): Promise<boolean> => {
  try {
    await assertSafePublicUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
};
