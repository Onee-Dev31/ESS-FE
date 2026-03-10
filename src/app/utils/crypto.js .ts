import * as CryptoJS from 'crypto-js';

const SECRET_KEY = 'ONEE_ESS_2026_SECRET_KEY';

export function encryptValue(value: string): string {
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
}

export function decryptValue(cipherText: string): string {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}