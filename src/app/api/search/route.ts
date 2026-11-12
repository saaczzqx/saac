import { allowRequest } from "@/lib/limit";
import { searchOffers } from "@/lib/search";
import { parseSlot } from "@/lib/slots";
import { cleanQuery } from "@/lib/text";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!allowRequest()) {
    return NextResponse.json(
      { error: "Muitas buscas seguidas. Espere um instante e tente de novo." },
      { status: 429 },
    );
  }

  const query = cleanQuery(request.nextUrl.searchParams.get("q") ?? "");
  const slot = parseSlot(request.nextUrl.searchParams.get("slot"));
  if (!slot || query.length < 2) {
    return NextResponse.json(
      { error: "Escolha a peça e digite pelo menos 2 letras do modelo." },
      { status: 400 },
    );
  }

  const fresh = request.nextUrl.searchParams.get("fresh") === "1";
  const body = await searchOffers(query, slot, fresh);
  return NextResponse.json(body);
}
