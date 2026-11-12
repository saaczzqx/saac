const STOP = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "para",
  "pra",
  "com",
  "sem",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "uns",
  "e",
  "ou",
  "the",
  "and",
  "kit",
  "gamer",
  "serie",
  "series",
]);

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function hasTerm(folded: string, term: string): boolean {
  const needle = fold(term);
  if (!needle) return false;
  return ` ${folded} `.includes(` ${needle} `);
}

export function tokensOf(query: string): string[] {
  const parts = fold(query).split(" ").filter(Boolean);
  const kept = parts.filter((part) => {
    if (STOP.has(part)) return false;
    if (part.length >= 3) return true;
    return /\d/.test(part) && /[a-z]/.test(part);
  });
  return kept.length > 0 ? kept : parts.filter((part) => part.length >= 2);
}

export function cleanQuery(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s.+/-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function roundMoney(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return null;
  return Math.round(value * 100) / 100;
}

export function parseBrl(text: string): number | null {
  const match = text.replace(/\s/g, "").match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:\.\d+)?)/);
  if (!match) return null;
  const raw = match[1];
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return roundMoney(Number(normalized));
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  agrave: "à",
  egrave: "è",
  acirc: "â",
  ecirc: "ê",
  ocirc: "ô",
  atilde: "ã",
  otilde: "õ",
  ccedil: "ç",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  Ccedil: "Ç",
  Atilde: "Ã",
  Otilde: "Õ",
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const point = Number.parseInt(code, 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name] ?? entity);
}

export function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
