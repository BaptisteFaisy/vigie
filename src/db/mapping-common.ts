/**
 * Helpers de lecture/écriture partagés par la couche de mapping (`src/db`).
 *
 * Un seul endroit pour les conversions scalaires : date, énumération, booléen,
 * nombre, JSON. Règle du SPEC §23 (robustesse) : une lecture ne lève jamais —
 * chaque conversion a une valeur de repli documentée, parce qu'une seule
 * colonne corrompue ne doit pas vider un écran.
 *
 * Fichier gelé (utilitaire) : les énumérations applicatives vivent dans
 * `src/types.ts` / `src/defaults.ts`, pas ici.
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */

/* --------------------------------------------------------------- scalaires */

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Une chaîne, ou `fallback` si la colonne n'en est pas une. */
export function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Un nombre fini, sinon 0. Les `DECIMAL` reviennent en `string`. */
export function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Un nombre lu en base : accepte un `number` ou une chaîne numérique. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Un nombre nullable : chaîne numérique ou `number`, sinon `null`. */
export function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Sérialise une colonne JSON ; une valeur insériable devient `'null'`. */
export function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    return 'null';
  }
}

/** Lit une colonne JSON ; `accept` refuse une charge utile mal formée. */
export function parseJson<T>(
  raw: unknown,
  fallback: T,
  accept: (value: unknown) => boolean = () => true,
): T {
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return accept(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Forge rend un `BOOLEAN` en 0/1 ; un pilote peut rendre un vrai booléen. */
export function fromSqlBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return fallback;
}

export function toSqlBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/** Un booléen nullable (suivi de décision) : `null` tant qu'inconnu. */
export function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return null;
}

/** Valide une colonne d'énumération ; l'inconnu prend la valeur de repli. */
export function parseEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Une énumération nullable : la valeur si elle est connue, sinon `null`. */
export function parseEnumOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Une liste de chaînes : tout ce qui n'en est pas une est jeté. */
export function parseStringList(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}

/** Une liste JSON d'objets : chaque entrée est validée, les autres jetées. */
export function parseObjectList(raw: unknown): Record<string, unknown>[] {
  const source = Array.isArray(raw) ? raw : parseJson<unknown>(raw, []);
  return asArray(source).filter(isObject);
}

/** Une chaîne non vide devient `null` (colonnes « raison », « note »). */
export function emptyToNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/* -------------------------------------------------------------------- dates */

/** ISO-8601 → `YYYY-MM-DD HH:MM:SS.fff`, le format d'insertion documenté. */
export function toSqlTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').slice(0, 23);
}

function padFraction(time: string): string {
  const [clock, fraction = ''] = time.split('.');
  return `${clock}.${(fraction + '000').slice(0, 3)}`;
}

/** `YYYY-MM-DD HH:MM:SS[.fff]` → ISO-8601 UTC ; `''` quand c'est illisible. */
export function fromSqlTimestamp(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)/.exec(value);
  if (!match) return '';
  return `${match[1]}T${padFraction(match[2])}Z`;
}

/** Vers la base : une date absente s'écrit `''` (jamais d'exception). */
export function toTimestamp(value: string): string {
  return toSqlTimestamp(value) ?? '';
}

/** Vers le domaine : `''` si la colonne est vide. */
export function fromTimestamp(value: unknown): string {
  return fromSqlTimestamp(value);
}
