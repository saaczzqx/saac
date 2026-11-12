export type StoreId = "kabum" | "terabyte";

export type SlotId =
  | "cpu"
  | "board"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "case"
  | "cooler"
  | "monitor"
  | "other";

export type Offer = {
  store: StoreId;
  storeLabel: string;
  id: string;
  title: string;
  price: number;
  listPrice: number | null;
  url: string;
  path: string | null;
  image: string | null;
  available: boolean;
  installment: string | null;
};

export type StoreReport = {
  id: StoreId;
  label: string;
  ok: boolean;
  message: string | null;
  matched: number;
};

export type SearchResponse = {
  query: string;
  slot: SlotId;
  relaxed: boolean;
  offers: Offer[];
  stores: StoreReport[];
  fetchedAt: string;
};

export type RefreshRequestItem = {
  store: StoreId;
  id: string;
  path?: string | null;
};

export type RefreshResponse = {
  offers: Offer[];
  missing: RefreshRequestItem[];
  fetchedAt: string;
};
