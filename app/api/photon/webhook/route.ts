import { NextResponse } from "next/server";
import { handlePhotonMessage } from "../../../../lib/agents/handlePhotonMessage";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "worker",
    instructions: "Run npm run dev:photon to start the Photon Spectrum iMessage worker."
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      sender?: string;
      threadId?: string;
      externalMessageId?: string;
    };
    if (!body.text || !body.sender || !body.threadId) {
      return NextResponse.json({ error: "text, sender, and threadId are required." }, { status: 400 });
    }
    const result = await handlePhotonMessage({
      text: body.text,
      sender: body.sender,
      threadId: body.threadId,
      externalMessageId: body.externalMessageId
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photon webhook handling failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
