POS_OUTREACH_SITE = "27"
ICD10_HOMELESSNESS = "Z59.0"


def enrich_encounter(encounter: dict) -> dict:
    enriched = dict(encounter)

    enriched["pos_code"] = POS_OUTREACH_SITE

    diagnoses = list(enriched.get("diagnoses", []))
    if ICD10_HOMELESSNESS not in diagnoses:
        diagnoses.append(ICD10_HOMELESSNESS)
    enriched["diagnoses"] = diagnoses

    return enriched
