import { NextResponse } from "next/server";
import { serverConfig } from "../../../../lib/config";
import { cities } from "../../../../lib/data/cityCoordinates";
import { opsPolicyDocs } from "../../../../lib/data/opsPolicyDocs";
import { seedMatches } from "../../../../lib/data/seedMatches";
import { getButterbaseAdapter } from "../../../../lib/integrations/butterbase";

function allowed(request: Request) {
  if (serverConfig.NODE_ENV === "development") return true;
  const secret = request.headers.get("x-seed-secret") ?? new URL(request.url).searchParams.get("secret");
  return Boolean(serverConfig.SEED_SECRET && secret === serverConfig.SEED_SECRET);
}

export async function POST(request: Request) {
  if (!allowed(request)) {
    return NextResponse.json({ error: "Seed route disabled. Provide a valid SEED_SECRET." }, { status: 403 });
  }

  try {
    const butterbase = getButterbaseAdapter();
    await butterbase.assertReady();
    await Promise.all(cities.map((city) => butterbase.upsertCity(city)));
    await Promise.all(seedMatches.map((match) => butterbase.upsertMatch(match)));
    await butterbase.createRagCollectionIfMissing();
    for (const doc of opsPolicyDocs) {
      await butterbase.ingestPolicyDocument(doc);
    }
    return NextResponse.json({ ok: true, cities: cities.length, matches: seedMatches.length, policyDocs: opsPolicyDocs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Butterbase seed failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
