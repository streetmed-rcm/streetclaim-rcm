import random
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from db import get_connection

hpe_bp = Blueprint("hpe", __name__)


def _generate_hpe_id() -> str:
    date_part = datetime.utcnow().strftime("%Y%m%d")
    chars = string.ascii_uppercase + string.digits
    random_part = "".join(random.choices(chars, k=6))
    return f"HPE-{date_part}-{random_part}"


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "patient_name": row["patient_name"],
        "dob": row["dob"],
        "gender": row["gender"],
        "issued_at": row["issued_at"],
        "expires_at": row["expires_at"],
    }


@hpe_bp.post("/apply")
def apply_hpe():
    body = request.get_json(silent=True) or {}

    patient_name = body.get("patient_name", "").strip()
    dob = body.get("dob", "").strip()
    gender = body.get("gender", "").strip()

    if not patient_name or not dob or not gender:
        return jsonify({"error": "patient_name, dob, and gender are required"}), 400

    hpe_id = _generate_hpe_id()
    issued_at = datetime.utcnow()
    expires_at = issued_at + timedelta(days=45)

    issued_str = issued_at.isoformat()
    expires_str = expires_at.isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO hpe_records (id, patient_name, dob, gender, issued_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (hpe_id, patient_name, dob, gender, issued_str, expires_str),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {
            "id": hpe_id,
            "patient_name": patient_name,
            "dob": dob,
            "gender": gender,
            "issued_at": issued_str,
            "expires_at": expires_str,
        }
    ), 201


@hpe_bp.get("/<hpe_id>")
def get_hpe(hpe_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hpe_records WHERE id = ?", (hpe_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({"error": "HPE record not found"}), 404

    return jsonify(_row_to_dict(row))
