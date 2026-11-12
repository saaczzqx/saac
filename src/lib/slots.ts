import type { SlotId } from "./types";

export type SlotRule = {
  any?: string[];
  none?: string[];
};

export type SlotDefinition = {
  id: SlotId;
  label: string;
  hint: string;
  rule: SlotRule | null;
};

export const SLOTS: SlotDefinition[] = [
  {
    id: "cpu",
    label: "Processador",
    hint: "Ryzen 5 7600",
    rule: { any: ["processador"], none: ["notebook", "placa mae", "pasta termica"] },
  },
  {
    id: "board",
    label: "Placa-mãe",
    hint: "B650M",
    rule: { any: ["placa mae"], none: ["notebook", "processador"] },
  },
  {
    id: "ram",
    label: "Memória",
    hint: "32GB DDR5",
    rule: {
      any: ["memoria"],
      none: ["placa mae", "processador", "placa de video", "ssd", "fonte", "gabinete"],
    },
  },
  {
    id: "gpu",
    label: "Placa de vídeo",
    hint: "RTX 5060",
    rule: {
      any: ["placa de video", "geforce", "radeon"],
      none: ["notebook", "suporte", "cadeira", "monitor", "processador", "fonte", "gabinete"],
    },
  },
  {
    id: "storage",
    label: "Armazenamento",
    hint: "SSD 1TB NVMe",
    rule: {
      any: ["ssd", "nvme", "hd", "disco"],
      none: ["memoria", "placa mae", "processador", "gabinete", "notebook"],
    },
  },
  {
    id: "psu",
    label: "Fonte",
    hint: "Fonte 650W",
    rule: { any: ["fonte"], none: ["placa", "gabinete", "processador", "notebook"] },
  },
  {
    id: "case",
    label: "Gabinete",
    hint: "Gabinete mid tower",
    rule: { any: ["gabinete"], none: ["fonte", "ssd"] },
  },
  {
    id: "cooler",
    label: "Cooler",
    hint: "Water cooler 240",
    rule: {
      any: ["cooler"],
      none: ["processador", "placa de video", "placa mae", "gabinete", "memoria", "ssd", "pasta"],
    },
  },
  {
    id: "monitor",
    label: "Monitor",
    hint: "Monitor 27 144Hz",
    rule: { any: ["monitor"], none: ["suporte", "cabo", "notebook", "placa"] },
  },
  {
    id: "other",
    label: "Outro",
    hint: "Mouse, teclado, headset",
    rule: null,
  },
];

const SLOT_IDS = new Set(SLOTS.map((slot) => slot.id));

export function parseSlot(value: string | null): SlotId | null {
  if (!value || !SLOT_IDS.has(value as SlotId)) return null;
  return value as SlotId;
}

export function slotById(id: SlotId): SlotDefinition {
  const slot = SLOTS.find((item) => item.id === id);
  if (!slot) throw new Error(`Unknown slot: ${id}`);
  return slot;
}
