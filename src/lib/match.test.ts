import assert from "node:assert/strict";
import test from "node:test";
import { selectOffers, titleMatches } from "./match";
import { fold, parseBrl, tokensOf } from "./text";
import type { Offer } from "./types";

function offer(partial: Partial<Offer> & Pick<Offer, "title" | "price">): Offer {
  return {
    store: "kabum",
    storeLabel: "KaBuM!",
    id: partial.title,
    listPrice: null,
    url: "https://www.kabum.com.br/produto/1",
    path: null,
    image: null,
    available: true,
    installment: null,
    ...partial,
  };
}

test("folds accents and hyphens", () => {
  assert.equal(fold("Placa-mãe B650M"), "placa mae b650m");
});

test("keeps model tokens and drops filler numbers", () => {
  assert.deepEqual(tokensOf("Ryzen 5 7600"), ["ryzen", "7600"]);
  assert.deepEqual(tokensOf("Core i5-14600KF"), ["core", "i5", "14600kf"]);
});

test("parses Brazilian and dot prices", () => {
  assert.equal(parseBrl("R$ 1.699,99"), 1699.99);
  assert.equal(parseBrl("1699.99"), 1699.99);
});

test("gpu search rejects notebooks and keeps the cheapest card", () => {
  assert.equal(
    titleMatches("Notebook Gamer com GeForce RTX 5070", "RTX 5070", "gpu", false),
    false,
  );
  const selected = selectOffers(
    [
      offer({ title: "Placa de Vídeo NVIDIA GeForce RTX 5070 12GB", price: 4200, id: "a" }),
      offer({ title: "Placa de Vídeo NVIDIA GeForce RTX 5070 12GB OC", price: 3900, id: "b" }),
      offer({ title: "Notebook Gamer RTX 5070", price: 9000, id: "c" }),
      offer({ title: "Suporte para placa de vídeo RTX 5070", price: 80, id: "d" }),
    ],
    "RTX 5070",
    "gpu",
  );
  assert.equal(selected.relaxed, false);
  assert.deepEqual(
    selected.offers.map((item) => item.price),
    [3900, 4200],
  );
});

test("a full PC is not treated as a video card or a memory kit", () => {
  assert.equal(
    titleMatches("PC Gamer com NVIDIA GeForce RTX 5070 e 32GB", "RTX 5070", "gpu", false),
    false,
  );
  assert.equal(
    titleMatches("Kit Upgrade Ryzen 7 7700X + 32GB DDR5", "32GB DDR5", "ram", false),
    false,
  );
  assert.equal(
    titleMatches("Memória DDR5 Kingston, 32GB, 6000MHz", "32GB DDR5", "ram", false),
    true,
  );
});

test("cpu search ignores a cooler that only shares the model number", () => {
  assert.equal(titleMatches("Water Cooler para Ryzen 7600", "Ryzen 7600", "cpu", false), false);
  assert.equal(
    titleMatches("Processador AMD Ryzen 5 7600, 5.1GHz", "Ryzen 5 7600", "cpu", false),
    true,
  );
});
