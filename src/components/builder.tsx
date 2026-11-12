"use client";

import { SLOTS } from "@/lib/slots";
import type { Offer, SearchResponse, SlotId, StoreId } from "@/lib/types";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SavedPick = {
  query: string;
  offer: Offer;
  checkedAt: string;
};

type Suggestion = {
  offer: Offer;
  savings: number;
};

const STORAGE_KEY = "montapc.v1";
const AUTO_KEY = "montapc.auto";
const LINK_HOSTS = new Set([
  "www.kabum.com.br",
  "kabum.com.br",
  "www.terabyteshop.com.br",
  "terabyteshop.com.br",
]);
const IMAGE_HOSTS = new Set([
  "images.kabum.com.br",
  "images2.kabum.com.br",
  "images3.kabum.com.br",
  "images4.kabum.com.br",
  "img.terabyteshop.com.br",
  "www.terabyteshop.com.br",
]);

function hostUrl(value: string, hosts: Set<string>): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !hosts.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWhen(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function loadPicks(): Record<string, SavedPick> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, SavedPick>;
  } catch {
    return {};
  }
}

function sameOffer(left: Offer, right: Offer): boolean {
  return left.store === right.store && left.id === right.id;
}

function discount(offer: Offer): number | null {
  if (!offer.listPrice || offer.listPrice <= offer.price) return null;
  return Math.round((1 - offer.price / offer.listPrice) * 100);
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function Builder() {
  const [ready, setReady] = useState(false);
  const [picks, setPicks] = useState<Record<string, SavedPick>>({});
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | null>>({});
  const [active, setActive] = useState<SlotId>("cpu");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refreshAll = useCallback(async (source: Record<string, SavedPick>) => {
    const entries = Object.entries(source);
    if (entries.length === 0) {
      setStatus("A montagem ainda está vazia.");
      return;
    }
    setRefreshing(true);
    setStatus("Conferindo os preços de novo…");
    const nextPicks = { ...source };
    const nextSuggestions: Record<string, Suggestion | null> = {};
    try {
      for (let index = 0; index < entries.length; index += 2) {
        const batch = entries.slice(index, index + 2);
        await Promise.all(
          batch.map(async ([slot, pick]) => {
            const response = await fetch(
              `/api/search?q=${encodeURIComponent(pick.query)}&slot=${slot}&fresh=1`,
            );
            if (!response.ok) return;
            const body = await readJson<SearchResponse>(response);
            const same = body.offers.find((offer) => sameOffer(offer, pick.offer));
            let current = pick.offer;
            let checkedAt = pick.checkedAt;
            if (same) {
              current = same;
              checkedAt = body.fetchedAt;
            } else {
              const refreshed = await fetch("/api/refresh", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  items: [{ store: pick.offer.store, id: pick.offer.id, path: pick.offer.path }],
                }),
              });
              if (refreshed.ok) {
                const update = await readJson<{ offers: Offer[]; fetchedAt: string }>(refreshed);
                const freshOffer = update.offers[0];
                if (freshOffer && sameOffer(freshOffer, pick.offer)) {
                  current = freshOffer;
                  checkedAt = update.fetchedAt;
                }
              }
            }
            nextPicks[slot] = { query: pick.query, offer: current, checkedAt };
            const cheapest = body.offers.find((offer) => offer.available);
            if (cheapest && cheapest.price < current.price - 0.5 && !sameOffer(cheapest, current)) {
              nextSuggestions[slot] = { offer: cheapest, savings: current.price - cheapest.price };
            } else {
              nextSuggestions[slot] = null;
            }
          }),
        );
      }
      setPicks(nextPicks);
      setSuggestions((current) => ({ ...current, ...nextSuggestions }));
      setStatus("Preços conferidos na KaBuM! e na Terabyte.");
    } catch {
      setPicks(nextPicks);
      setStatus("Não consegui conferir todas as peças. Os últimos preços continuam na montagem.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const saved = loadPicks();
    setPicks(saved);
    setReady(true);
    const savedCpu = saved.cpu;
    if (savedCpu) setQuery(savedCpu.query);
    const last = Number(sessionStorage.getItem(AUTO_KEY) || 0);
    if (Object.keys(saved).length > 0 && Date.now() - last > 10 * 60 * 1000) {
      sessionStorage.setItem(AUTO_KEY, String(Date.now()));
      void refreshAll(saved);
    }
  }, [refreshAll]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  }, [picks, ready]);

  const chosen = useMemo(
    () => SLOTS.map((slot) => picks[slot.id]).filter((pick): pick is SavedPick => Boolean(pick)),
    [picks],
  );
  const total = chosen.reduce((sum, pick) => sum + (pick.offer.available ? pick.offer.price : 0), 0);
  const missingStock = chosen.filter((pick) => !pick.offer.available).length;
  const activeSlot = SLOTS.find((slot) => slot.id === active) ?? SLOTS[0]!;
  const activePick = picks[active];
  const best = result?.offers.find((offer) => offer.available) ?? null;

  function selectSlot(slot: SlotId) {
    setActive(slot);
    setQuery(picks[slot]?.query ?? "");
    setResult(null);
    setError(null);
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setError("Digite pelo menos 2 letras do modelo.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&slot=${active}&fresh=1`,
      );
      const body = await readJson<SearchResponse>(response);
      if (!response.ok) throw new Error(body.error || "Não consegui buscar agora.");
      setResult(body);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Não consegui buscar agora.");
    } finally {
      setLoading(false);
    }
  }

  function useOffer(offer: Offer) {
    setPicks((current) => ({
      ...current,
      [active]: {
        query: result?.query || query.trim(),
        offer,
        checkedAt: new Date().toISOString(),
      },
    }));
    setSuggestions((current) => ({ ...current, [active]: null }));
    setStatus(null);
  }

  function removePick(slot: SlotId) {
    setPicks((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    setSuggestions((current) => ({ ...current, [slot]: null }));
  }

  function acceptSuggestion(slot: SlotId) {
    const suggestion = suggestions[slot];
    const pick = picks[slot];
    if (!suggestion || !pick) return;
    setPicks((current) => ({
      ...current,
      [slot]: { query: pick.query, offer: suggestion.offer, checkedAt: new Date().toISOString() },
    }));
    setSuggestions((current) => ({ ...current, [slot]: null }));
  }

  function clearAll() {
    setPicks({});
    setSuggestions({});
    setStatus("Montagem limpa neste navegador.");
  }

  const storeSummary = (store: StoreId) => {
    const offers = result?.offers.filter((offer) => offer.store === store && offer.available) ?? [];
    const lowest = offers[0];
    return lowest ? formatMoney(lowest.price) : "sem oferta";
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <p className="eyebrow">Peças à vista</p>
          <h1>Monta PC</h1>
          <p className="lede">
            Busca o menor preço do modelo na KaBuM! e na Terabyte e soma a montagem.
          </p>
        </div>
        <div className="total-block">
          <p className="total-label">Total à vista</p>
          <p className="total">{chosen.length > 0 ? formatMoney(total) : "—"}</p>
          <p className="meta">
            {chosen.length === 0
              ? "Nenhuma peça escolhida"
              : `${chosen.length} de ${SLOTS.length} peças`}
            {missingStock > 0 ? ` · ${missingStock} sem estoque, fora da soma` : ""}
          </p>
          <div className="actions">
            <button className="ghost" type="button" onClick={() => void refreshAll(picks)} disabled={refreshing}>
              {refreshing ? "Conferindo…" : "Atualizar preços"}
            </button>
            {chosen.length > 0 ? (
              <button className="ghost" type="button" onClick={clearAll}>
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <p className="status" role="status">
        {status}
      </p>

      <main className="layout">
        <section className="slots" aria-label="Montagem">
          {SLOTS.map((slot, index) => {
            const pick = picks[slot.id];
            const suggestion = suggestions[slot.id];
            return (
              <div className="slot-row" key={slot.id}>
                <button
                  className={slot.id === active ? "slot is-active" : "slot"}
                  type="button"
                  aria-pressed={slot.id === active}
                  onClick={() => selectSlot(slot.id)}
                >
                  <span className="slot-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <p className="slot-label">{slot.label}</p>
                    {pick ? (
                      <>
                        <p className="slot-title">{pick.offer.title}</p>
                        <p className="slot-price">
                          {pick.offer.available ? formatMoney(pick.offer.price) : "Sem estoque"} · {pick.offer.storeLabel} · {formatWhen(pick.checkedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="slot-empty">Escolher {slot.label.toLocaleLowerCase("pt-BR")}</p>
                    )}
                  </span>
                </button>
                {pick ? (
                  <button className="text-button" type="button" onClick={() => removePick(slot.id)}>
                    Tirar
                  </button>
                ) : null}
                {suggestion ? (
                  <div className="suggestion">
                    <p>
                      Achei {suggestion.offer.title} por {formatMoney(suggestion.offer.price)} na {suggestion.offer.storeLabel}. São {formatMoney(suggestion.savings)} a menos.
                    </p>
                    <button className="ghost" type="button" onClick={() => acceptSuggestion(slot.id)}>
                      Trocar por esta
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="panel">
          <div className="search">
            <h2>Buscar {activeSlot.label.toLocaleLowerCase("pt-BR")}</h2>
            <form onSubmit={(event) => void search(event)}>
              <label htmlFor="part-query">Modelo da peça</label>
              <input
                id="part-query"
                type="search"
                value={query}
                placeholder={activeSlot.hint}
                onChange={(event) => setQuery(event.target.value)}
                enterKeyHint="search"
              />
              <button className="primary" type="submit" disabled={loading}>
                {loading ? "Buscando…" : "Buscar menor preço"}
              </button>
            </form>
            <p className="note">
              O preço é o valor à vista, no Pix ou no boleto, quando a loja informa esse valor. O frete fica de fora.
            </p>
            {error ? <p className="error">{error}</p> : null}
          </div>

          <div className="results" aria-live="polite">
            {!result && !loading ? (
              <div className="empty-results">
                <strong>Digite o modelo e compare as duas lojas.</strong>
                <p>Exemplo para esta peça: {activeSlot.hint}. A oferta mais barata em estoque fica marcada.</p>
              </div>
            ) : null}
            {loading ? (
              <div className="empty-results">
                <strong>Consultando a KaBuM! e a Terabyte…</strong>
              </div>
            ) : null}
            {result && !loading ? (
              <>
                <div className="results-head">
                  <div>
                    <strong>{result.offers.length === 0 ? "Nenhuma oferta" : `${result.offers.length} ofertas`}</strong>
                    <p>
                      {result.relaxed
                        ? "Não achei essa categoria com o nome digitado. Mostrando o que o nome combina."
                        : `Menor preço para “${result.query}”.`}
                    </p>
                  </div>
                  <div className="store-line">
                    {result.stores.map((store) => (
                      <span className="chip" key={store.id}>
                        {store.label}: {store.ok ? storeSummary(store.id) : store.message}
                      </span>
                    ))}
                  </div>
                </div>
                {result.offers.length === 0 ? (
                  <div className="empty-results">
                    <p>Tente o nome comercial da peça, como “RTX 5060” ou “B650M”.</p>
                  </div>
                ) : (
                  result.offers.map((offer) => {
                    const link = hostUrl(offer.url, LINK_HOSTS);
                    const image = offer.image ? hostUrl(offer.image, IMAGE_HOSTS) : null;
                    const percent = discount(offer);
                    const isBest = best ? sameOffer(offer, best) : false;
                    const selected = activePick ? sameOffer(activePick.offer, offer) : false;
                    return (
                      <article className={isBest ? "offer is-best" : "offer"} key={`${offer.store}-${offer.id}`}>
                        {image ? <img src={image} alt="" /> : <span />}
                        <div>
                          <h3>{offer.title}</h3>
                          <p className="offer-meta">
                            {offer.storeLabel}
                            {isBest ? " · menor preço" : ""}
                            {offer.available ? "" : " · sem estoque"}
                            {percent ? ` · -${percent}%` : ""}
                          </p>
                          {offer.installment ? <p className="installment">{offer.installment}</p> : null}
                        </div>
                        <div className="price-col">
                          {offer.listPrice ? <p className="was">{formatMoney(offer.listPrice)}</p> : null}
                          <p className="price">{formatMoney(offer.price)}</p>
                          <div className="offer-actions">
                            {selected ? <span className="chosen">Na montagem</span> : null}
                            <button className="primary" type="button" onClick={() => useOffer(offer)} disabled={!offer.available && !selected}>
                              {selected ? "Manter" : "Usar esta"}
                            </button>
                            {link ? (
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                Ver na loja
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </>
            ) : null}
          </div>
        </section>
      </main>
      <p className="foot">
        A Pichau bloqueia consulta automática, então a conta usa KaBuM! e Terabyte. Confira o valor final na loja antes de pagar: estoque e Pix mudam o dia inteiro. A montagem fica salva só neste navegador.
      </p>
    </div>
  );
}
