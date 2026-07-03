import json
import sys
from pathlib import Path

REQ_INC_FIELDS = ['id','title','lat','lng']

p = Path(__file__).resolve().parent.parent / 'approved_incidents.json'
if not p.exists():
    print('approved_incidents.json not found at', p)
    sys.exit(2)

data = json.loads(p.read_text(encoding='utf8'))
errors = []
if not isinstance(data, list):
    errors.append('Root is not a list')
else:
    for i, inc in enumerate(data):
        prefix = f'[{i}] '
        if not isinstance(inc, dict):
            errors.append(prefix + 'incident is not an object')
            continue
        for f in REQ_INC_FIELDS:
            if f not in inc:
                errors.append(prefix + f"missing field '{f}'")
        # coord types
        if 'lat' in inc and not isinstance(inc['lat'], (int, float)):
            errors.append(prefix + "lat not numeric")
        if 'lng' in inc and not isinstance(inc['lng'], (int, float)):
            errors.append(prefix + "lng not numeric")
        # materials
        mats = inc.get('materials')
        if mats is None:
            continue
        if not isinstance(mats, list):
            errors.append(prefix + 'materials is not a list')
            continue
        for j, m in enumerate(mats):
            mp = f"{prefix}materials[{j}] "
            if not isinstance(m, dict):
                errors.append(mp + 'not object')
                continue
            if 'type' not in m:
                errors.append(mp + "missing 'type'")
            if 'url' not in m and 'file' not in m:
                errors.append(mp + "missing 'url' or 'file'")

if errors:
    print('Validation FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)

print('Validation OK')
