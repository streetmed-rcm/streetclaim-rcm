import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from code_enricher import enrich_encounter, POS_OUTREACH_SITE, ICD10_HOMELESSNESS


def test_pos_27_always_set():
    encounter = {"note": "Patient seen in the field", "diagnoses": []}
    result = enrich_encounter(encounter)
    assert result["pos_code"] == POS_OUTREACH_SITE


def test_z59_0_appended_when_missing():
    encounter = {"note": "Clinical note", "diagnoses": ["J45.20"]}
    result = enrich_encounter(encounter)
    assert ICD10_HOMELESSNESS in result["diagnoses"]


def test_z59_0_not_duplicated_when_present():
    encounter = {"note": "Clinical note", "diagnoses": [ICD10_HOMELESSNESS]}
    result = enrich_encounter(encounter)
    assert result["diagnoses"].count(ICD10_HOMELESSNESS) == 1


def test_empty_diagnoses_gets_z59_0():
    encounter = {"note": "Note", "diagnoses": []}
    result = enrich_encounter(encounter)
    assert ICD10_HOMELESSNESS in result["diagnoses"]


def test_original_diagnoses_preserved():
    encounter = {"note": "Note", "diagnoses": ["J45.20", "E11.9"]}
    result = enrich_encounter(encounter)
    assert "J45.20" in result["diagnoses"]
    assert "E11.9" in result["diagnoses"]
    assert ICD10_HOMELESSNESS in result["diagnoses"]


def test_enrich_does_not_mutate_original():
    original_diagnoses = ["J45.20"]
    encounter = {"note": "Note", "diagnoses": original_diagnoses}
    enrich_encounter(encounter)
    assert ICD10_HOMELESSNESS not in original_diagnoses
