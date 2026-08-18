import { verifyNewBanmaoBox } from "@/lib/banmaobox/verifyNewCollection";
import { verificationHttpResponse } from "@/lib/banmaobox/verificationHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return verificationHttpResponse(request, verifyNewBanmaoBox);
}
