export class VendorIntegrationError extends Error {
  vendor:
    | "Butterbase"
    | "Evermind"
    | "Nebius"
    | "Photon"
    | "OpenMeteo"
    | "GDELT"
    | "GTFS";

  constructor(vendor: VendorIntegrationError["vendor"], message: string) {
    super(`${vendor}: ${message}`);
    this.vendor = vendor;
  }
}
