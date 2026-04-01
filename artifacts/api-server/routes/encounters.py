import json
from flask import Blueprint, request, jsonify
from db import get_connection
from code_enricher import enrich_encounter
from mock_athena import submit_encounter

encounters_bp = Blueprint("encounters", __name__)


@encounters_bp.post("")
@encounters_bp.post("/")
def create_encounter():
    body = request.get_json(silent=True) or {}

    raw = {
        "patient_name": body.get("patient_name", ""),
        "dos": body.get("dos", ""),
        "lat": body.get("lat"),
        "lng": body.get("lng"),
        "note": body.get("note", ""),
        "diagnoses": body.get("diagnoses", []),
    }

    enriched = enrich_encounter(raw)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO encounters (patient_name, dos, lat, lng, note, pos_code, diagnoses)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            enriched["patient_name"],
            enriched["dos"],
            enriched["lat"],
            enriched["lng"],
            enriched["note"],
            enriched["pos_code"],
            json.dumps(enriched["diagnoses"]),
        ),
    )
    conn.commit()
    encounter_id = cursor.lastrowid
    conn.close()

    enriched["id"] = encounter_id
    enriched["diagnoses"] = enriched["diagnoses"]

    return jsonify(enriched), 201


@encounters_bp.post("/sync")
def sync_encounters():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM encounters")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        encounter = {
            "id": row["id"],
            "patient_name": row["patient_name"],
            "dos": row["dos"],
            "lat": row["lat"],
            "lng": row["lng"],
            "note": row["note"],
            "pos_code": row["pos_code"],
            "diagnoses": json.loads(row["diagnoses"]) if row["diagnoses"] else [],
        }
        result = submit_encounter(encounter)
        results.append(result)

    return jsonify({"synced": len(results), "results": results})
