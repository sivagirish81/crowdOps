import { NextResponse } from "next/server";
import { moveBrazilMoroccoToDemoWindow } from "../../../../lib/integrations/butterbase";

export async function POST() {
  try {
    const match = await moveBrazilMoroccoToDemoWindow();
    return NextResponse.json({ match });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo match update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
