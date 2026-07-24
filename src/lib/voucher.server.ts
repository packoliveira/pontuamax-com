import { randomBytes } from "crypto";

// Geração criptográfica de códigos de voucher/gift-card.
// Usa randomBytes (CSPRNG) em vez de Math.random para evitar códigos previsíveis
// que representam produto/dinheiro. Server-only.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1

export function gerarVoucher() {
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `QSF-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}