import { normalizeGameAction } from "@/lib/game-actions";
import { readGameState, updateGameState } from "@/lib/server-game-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  return Response.json(await readGameState(), { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  try {
    const action = normalizeGameAction(await request.json());
    if (!action) {
      return Response.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
    }
    const state = await updateGameState(action);
    return Response.json(state, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to update game state", error);
    return Response.json({ message: "게임 상태를 저장하지 못했습니다." }, { status: 500 });
  }
}
