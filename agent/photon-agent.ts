import { handlePhotonMessage } from "../lib/agents/handlePhotonMessage";
import { requirePhotonConfig } from "../lib/config";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.markdown === "string") return record.markdown;
  }
  return "";
}

async function main() {
  const config = requirePhotonConfig();
  const providers = process.env.PHOTON_ENABLE_TERMINAL === "true"
    ? [imessage.config(), terminal.config()]
    : [imessage.config()];

  const app = await Spectrum({
    projectId: config.projectId,
    projectSecret: config.projectSecret,
    providers
  });

  console.log("CrowdOps Photon worker listening", {
    provider: config.provider,
    lineId: config.lineId ?? "not configured",
    terminalDebug: process.env.PHOTON_ENABLE_TERMINAL === "true"
  });

  for await (const [space, message] of app.messages) {
    const text = contentToText(message.content);
    console.log("CrowdOps inbound message", {
      platform: message.platform,
      spaceId: space.id,
      messageId: message.id,
      sender: message.sender?.id,
      hasText: Boolean(text)
    });

    if (!text) {
      console.warn("CrowdOps skipped non-text Photon message", { messageId: message.id, platform: message.platform });
      continue;
    }

    await space.responding(async () => {
      const response = await handlePhotonMessage({
        text,
        sender: message.sender?.id ?? "imessage-operator",
        threadId: space.id,
        externalMessageId: message.id
      });

      await message.reply(response.text);
      console.log("CrowdOps outbound reply sent", { platform: message.platform, spaceId: space.id, messageId: message.id });
    });
  }
}

main().catch((err) => {
  console.error("Photon agent failed", err);
  process.exit(1);
});
