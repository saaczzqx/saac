const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
};

export async function fetchStore(url: string, accept: string, allowedHost: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(9000),
    headers: { ...BROWSER_HEADERS, accept },
  });
  const finalHost = new URL(response.url).hostname;
  if (finalHost !== allowedHost && !finalHost.endsWith(`.${allowedHost}`)) {
    throw new Error(`Resposta inesperada de ${finalHost}`);
  }
  if (!response.ok) {
    throw new Error(`A loja respondeu ${response.status}`);
  }
  return response.text();
}
