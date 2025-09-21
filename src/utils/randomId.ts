/**
 * Generuje pseudo-náhodné ID vhodné pre identifikátory v aplikácii.
 * Preferuje kryptograficky bezpečné generovanie ak je dostupné,
 * v opačnom prípade fallback na Math.random.
 */
export interface RandomIdOptions {
  /** Počet generovaných znakov bez prefixu. */
  length?: number;
  /** Voliteľný prefix oddelený pomlčkou. */
  prefix?: string;
}

const DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

type MaybeCrypto = {
  getRandomValues?: (array: Uint32Array) => Uint32Array;
};

const createIndexes = (count: number): number[] => {
  const alphabetLength = DEFAULT_ALPHABET.length;
  const cryptoInstance: MaybeCrypto | undefined = (globalThis as typeof globalThis & { crypto?: MaybeCrypto }).crypto;

  if (cryptoInstance && typeof cryptoInstance.getRandomValues === 'function') {
    const values = cryptoInstance.getRandomValues(new Uint32Array(count));
    return Array.from(values, (value) => value % alphabetLength);
  }

  return Array.from({ length: count }, () => Math.floor(Math.random() * alphabetLength));
};

/**
 * Vytvorí identifikátor s voliteľným prefixom.
 */
export const randomId = ({ length = 12, prefix }: RandomIdOptions = {}): string => {
  const indexes = createIndexes(length);
  const id = indexes.map((index) => DEFAULT_ALPHABET[index]).join('');
  return prefix ? `${prefix}-${id}` : id;
};
