/**
 * Hashes a password with SHA-256 using the browser's built-in Web Crypto API.
 * The raw password never leaves the browser — only the hash is sent to the server.
 */
export async function hashPassword(plain) {
  const encoded = new TextEncoder().encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
