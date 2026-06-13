import "dotenv/config";
import { z } from "zod";
import { VendorIntegrationError } from "./errors";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("CrowdOps AI"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  BUTTERBASE_BASE_URL: optionalUrl,
  BUTTERBASE_APP_ID: optionalString,
  BUTTERBASE_SERVICE_KEY: optionalString,
  BUTTERBASE_RAG_COLLECTION: z.string().default("crowdops-policies"),
  EVERMIND_BASE_URL: optionalUrl,
  EVERMIND_API_KEY: optionalString,
  EVERMIND_USER_ID: z.string().default("crowdops-demo-user"),
  NEBIUS_API_KEY: optionalString,
  NEBIUS_BASE_URL: z.string().url().default("https://api.tokenfactory.nebius.com/v1/"),
  NEBIUS_MODEL: optionalString,
  PHOTON_PROJECT_ID: optionalString,
  PHOTON_PROJECT_SECRET: optionalString,
  PHOTON_LINE_ID: optionalString,
  PHOTON_PROVIDER: z.string().default("imessage"),
  GTFS_ALERTS_URL: optionalUrl,
  SEED_SECRET: optionalString,
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});

export const serverConfig = serverEnvSchema.parse(process.env);

export function getSafePublicConfig() {
  return {
    appName: serverConfig.NEXT_PUBLIC_APP_NAME,
    appBaseUrl: serverConfig.APP_BASE_URL,
    photonProvider: serverConfig.PHOTON_PROVIDER
  };
}

function requireEnv(vendor: "Butterbase" | "Evermind" | "Nebius" | "Photon", keys: (keyof typeof serverConfig)[]) {
  const missing = keys.filter((key) => !serverConfig[key]);
  if (missing.length > 0) {
    throw new VendorIntegrationError(vendor, `Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function requireButterbaseConfig() {
  requireEnv("Butterbase", ["BUTTERBASE_BASE_URL", "BUTTERBASE_APP_ID", "BUTTERBASE_SERVICE_KEY"]);
  return {
    baseUrl: serverConfig.BUTTERBASE_BASE_URL!,
    appId: serverConfig.BUTTERBASE_APP_ID!,
    serviceKey: serverConfig.BUTTERBASE_SERVICE_KEY!,
    ragCollection: serverConfig.BUTTERBASE_RAG_COLLECTION
  };
}

export function requireEvermindConfig() {
  requireEnv("Evermind", ["EVERMIND_BASE_URL", "EVERMIND_API_KEY", "EVERMIND_USER_ID"]);
  return {
    baseUrl: serverConfig.EVERMIND_BASE_URL!,
    apiKey: serverConfig.EVERMIND_API_KEY!,
    userId: serverConfig.EVERMIND_USER_ID
  };
}

export function requireNebiusConfig() {
  requireEnv("Nebius", ["NEBIUS_API_KEY", "NEBIUS_BASE_URL", "NEBIUS_MODEL"]);
  return {
    apiKey: serverConfig.NEBIUS_API_KEY!,
    baseUrl: serverConfig.NEBIUS_BASE_URL,
    model: serverConfig.NEBIUS_MODEL!
  };
}

export function requirePhotonConfig() {
  requireEnv("Photon", ["PHOTON_PROJECT_ID", "PHOTON_PROJECT_SECRET"]);
  return {
    projectId: serverConfig.PHOTON_PROJECT_ID!,
    projectSecret: serverConfig.PHOTON_PROJECT_SECRET!,
    lineId: serverConfig.PHOTON_LINE_ID,
    provider: serverConfig.PHOTON_PROVIDER
  };
}
