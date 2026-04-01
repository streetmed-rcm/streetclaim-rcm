import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.hpe import _generate_hpe_id

HPE_PATTERN = re.compile(r"^HPE-\d{8}-[A-Z0-9]{6}$")


def test_hpe_id_format():
    hpe_id = _generate_hpe_id()
    assert HPE_PATTERN.match(hpe_id), f"HPE ID format invalid: {hpe_id}"


def test_hpe_id_starts_with_prefix():
    hpe_id = _generate_hpe_id()
    assert hpe_id.startswith("HPE-")


def test_hpe_id_date_part_is_digits():
    hpe_id = _generate_hpe_id()
    parts = hpe_id.split("-")
    assert len(parts) == 3
    assert parts[1].isdigit()
    assert len(parts[1]) == 8


def test_hpe_id_random_part_length():
    hpe_id = _generate_hpe_id()
    parts = hpe_id.split("-")
    assert len(parts[2]) == 6


def test_hpe_id_random_part_is_alphanumeric_uppercase():
    hpe_id = _generate_hpe_id()
    parts = hpe_id.split("-")
    assert parts[2].isupper() or parts[2].isalnum()
    assert re.match(r"^[A-Z0-9]+$", parts[2])


def test_hpe_ids_are_unique():
    ids = {_generate_hpe_id() for _ in range(100)}
    assert len(ids) == 100
