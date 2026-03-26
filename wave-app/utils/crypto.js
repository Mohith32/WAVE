// For demo purposes, we'll use a pure JS Math.random fallback for key generation
// since Expo Go sometimes misses newer native modules like ExpoCryptoAES

export const generateAesKey = async () => {
  return generateRandomHex(64); // 256-bit
};

export const generateIv = async () => {
  return generateRandomHex(32); // 128-bit
};

export const generateKeyPair = async () => {
  // Mock private key
  const privateKey = generateRandomHex(64);
  // Mock public key (hash of private key simplified)
  const publicKey = hashStringSimple(privateKey);
  return { publicKey, privateKey };
};

// ...rest of the functions
export const encryptMessage = async (plaintext, aesKeyHex, ivHex) => {
  const textBytes = stringToBytes(plaintext);
  const keyBytes = hexToBytes(aesKeyHex);
  const ivBytes = hexToBytes(ivHex);

  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
  }

  return bytesToBase64(encrypted);
};

export const decryptMessage = async (ciphertextBase64, aesKeyHex, ivHex) => {
  try {
    const encrypted = base64ToBytes(ciphertextBase64);
    const keyBytes = hexToBytes(aesKeyHex);
    const ivBytes = hexToBytes(ivHex);

    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
    }

    return bytesToString(decrypted);
  } catch (e) {
    return '[Encrypted Message]';
  }
};

export const encryptAesKey = async (aesKeyHex, receiverPublicKey) => {
  const keyBytes = hexToBytes(aesKeyHex);
  const pubBytes = hexToBytes(receiverPublicKey.substring(0, 64).padEnd(64, '0')); 

  const encrypted = new Uint8Array(keyBytes.length);
  for (let i = 0; i < keyBytes.length; i++) {
    encrypted[i] = keyBytes[i] ^ pubBytes[i % pubBytes.length];
  }

  return bytesToHex(encrypted);
};

export const decryptAesKey = async (encryptedAesKeyHex, privateKey) => {
  const publicKey = hashStringSimple(privateKey);
  const encBytes = hexToBytes(encryptedAesKeyHex);
  const pubBytes = hexToBytes(publicKey.substring(0, 64).padEnd(64, '0'));

  const decrypted = new Uint8Array(encBytes.length);
  for (let i = 0; i < encBytes.length; i++) {
    decrypted[i] = encBytes[i] ^ pubBytes[i % pubBytes.length];
  }

  return bytesToHex(decrypted);
};

// Pure JS Helpers
function generateRandomHex(length) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function hashStringSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  let part1 = Math.abs(hash).toString(16).padStart(16, '0');
  let part2 = Math.abs(hash ^ 0x55555555).toString(16).padStart(16, '0');
  let part3 = Math.abs(hash ^ 0xAAAAAAAA).toString(16).padStart(16, '0');
  let part4 = Math.abs(hash ^ 0x0F0F0F0F).toString(16).padStart(16, '0');
  return (part1 + part2 + part3 + part4).substring(0, 64).padEnd(64, '0');
}


// Helper functions
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function stringToBytes(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function bytesToString(bytes) {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
