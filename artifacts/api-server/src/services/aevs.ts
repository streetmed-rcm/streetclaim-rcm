import { randomUUID } from "crypto";

export class AevsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AevsNotFoundError";
  }
}

export class AevsTransportError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AevsTransportError";
  }
}

export interface AevsLookupParams {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface AevsLookupResult {
  cin: string;
  managedCarePlan?: string;
  eligibilityStatus: "active" | "inactive" | "pending" | "unknown";
  lookupDate: string;
  isStub?: boolean;
}

export class AevsService {
  private submitterId: string | undefined;
  private receiverId: string | undefined;
  private endpointUrl: string | undefined;

  constructor() {
    this.submitterId = process.env.AEVS_SUBMITTER_ID;
    this.receiverId = process.env.AEVS_RECEIVER_ID;
    this.endpointUrl = process.env.AEVS_ENDPOINT_URL;
  }

  private isConfigured(): boolean {
    return !!(this.submitterId && this.receiverId && this.endpointUrl);
  }

  private buildX12_270(params: AevsLookupParams, controlNumber: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 5).replace(":", "");
    const dob = params.dateOfBirth.replace(/-/g, "");
    const paddedControl = controlNumber.padStart(9, "0");

    const isa = [
      "ISA",
      "00",
      "          ",
      "00",
      "          ",
      "ZZ",
      (this.submitterId ?? "").padEnd(15),
      "ZZ",
      (this.receiverId ?? "").padEnd(15),
      date,
      time,
      "^",
      "00501",
      paddedControl,
      "0",
      "P",
      ":",
    ].join("*");

    const gs = [
      "GS",
      "HS",
      this.submitterId,
      this.receiverId,
      date,
      time,
      "1",
      "X",
      "005010X279A1",
    ].join("*");

    const transactionSegments = [
      ["BHT", "0022", "13", controlNumber, date, time].join("*"),
      ["HL", "1", "", "20", "1"].join("*"),
      ["NM1", "PR", "2", "MEDI-CAL", "", "", "", "", "PI", "MEDI-CAL"].join("*"),
      ["HL", "2", "1", "21", "1"].join("*"),
      ["NM1", "1P", "2", "STREETCLAIM", "", "", "", "", "XX", this.submitterId].join("*"),
      ["HL", "3", "2", "22", "0"].join("*"),
      ["TRN", "1", controlNumber, "9STREETCLM"].join("*"),
      ["NM1", "IL", "1", params.lastName.toUpperCase(), params.firstName.toUpperCase(), "", "", "", "MI", ""].join("*"),
      ["DMG", "D8", dob].join("*"),
      ["EQ", "30"].join("*"),
    ];

    const stControlNum = "0001";
    const st = ["ST", "270", stControlNum, "005010X279A1"].join("*");
    const segmentCount = transactionSegments.length + 2;
    const se = ["SE", String(segmentCount), stControlNum].join("*");

    const ge = ["GE", "1", "1"].join("*");
    const iea = ["IEA", "1", paddedControl].join("*");

    const parts = [isa, gs, st, ...transactionSegments, se, ge, iea];
    return parts.join("~\n") + "~";
  }

  private parse271Response(response: string): AevsLookupResult {
    const segments = response
      .split(/~\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    const hasAaaRejection = segments.some((seg) => seg.startsWith("AAA*"));
    if (hasAaaRejection) {
      throw new AevsNotFoundError(
        "AEVS returned an AAA rejection segment — patient not found or invalid inquiry"
      );
    }

    let cin = "";
    let managedCarePlan: string | undefined;
    let eligibilityStatus: AevsLookupResult["eligibilityStatus"] = "unknown";

    for (let i = 0; i < segments.length; i++) {
      const fields = segments[i].split("*");
      const id = fields[0];

      if (id === "NM1" && fields[1] === "IL") {
        cin = fields[9] ?? "";
      }

      if (id === "EB") {
        const infoType = fields[1] ?? "";
        if (infoType === "1") {
          eligibilityStatus = "active";
        } else if (infoType === "6") {
          eligibilityStatus = "inactive";
        }

        if (!managedCarePlan && fields[13]) {
          managedCarePlan = fields[13];
        }
      }

      if (id === "REF" && (fields[1] === "CE" || fields[1] === "1L" || fields[1] === "17") && !managedCarePlan) {
        const planName = fields[3] ?? fields[2] ?? "";
        if (planName) {
          managedCarePlan = planName;
        }
      }
    }

    if (!cin) {
      throw new AevsNotFoundError("Could not extract CIN from 271 response");
    }

    return {
      cin,
      managedCarePlan,
      eligibilityStatus,
      lookupDate: new Date().toISOString(),
    };
  }

  private buildStubResponse(params: AevsLookupParams): AevsLookupResult {
    const initials = (params.firstName[0] ?? "X") + (params.lastName[0] ?? "X");
    const dobDigits = params.dateOfBirth.replace(/-/g, "").slice(2);
    const cin = `${initials.toUpperCase()}${dobDigits}00001A`;

    return {
      cin,
      managedCarePlan: "L.A. Care Health Plan (Stub)",
      eligibilityStatus: "active",
      lookupDate: new Date().toISOString(),
      isStub: true,
    };
  }

  async lookup(params: AevsLookupParams): Promise<AevsLookupResult> {
    if (!this.isConfigured()) {
      return this.buildStubResponse(params);
    }

    const controlNumber = randomUUID().replace(/-/g, "").slice(0, 9);
    const x12_270 = this.buildX12_270(params, controlNumber);

    let response: Response;
    try {
      response = await fetch(this.endpointUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/edi-x12",
          Accept: "application/edi-x12",
        },
        body: x12_270,
      });
    } catch (err) {
      throw new AevsTransportError(
        `AEVS network error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      throw new AevsTransportError(
        `AEVS endpoint returned HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const responseText = await response.text();
    return this.parse271Response(responseText);
  }
}
