import uuid
import random

_RNG = random.Random(42)


def submit_encounter(encounter: dict) -> dict:
    roll = _RNG.random()
    if roll < 0.90:
        return {
            "status": "accepted",
            "athena_id": str(uuid.uuid4()),
            "encounter_id": encounter.get("id"),
        }
    else:
        return {
            "status": "scrub_failure",
            "error_code": 422,
            "message": "Claim failed scrubbing: missing required field",
            "encounter_id": encounter.get("id"),
        }
