import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { requirePhotonConfig } from "../lib/config";

async function main() {
  const to = process.argv[2] ?? process.env.PHOTON_TEST_RECIPIENT;
  if (!to) {
    throw new Error("Provide your phone number: npm run photon:send-test -- +15551234567");
  }

  const config = requirePhotonConfig();
  const app = await Spectrum({
    projectId: config.projectId,
    projectSecret: config.projectSecret,
    providers: [imessage.config()]
  });

  const im = imessage(app);
  const user = await im.user(to);
  const space = await im.space.create(user);

  await space.send(
    "CrowdOps AI is connected through Photon. Reply: Analyze Brazil vs Morocco for my sports bar"
  );

  console.log(`Sent Photon iMessage test to ${to}. Reply in that same iMessage thread.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
