"""Build index.json: ZIP3 file -> bbox [minLon,minLat,maxLon,maxLat]. Run on a fresh checkout of iandees/usps-collection-boxes.
Usage: python3 build_index.py <path-to-repo>/data"""
import json, sys, pathlib
out = {}
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.ndjson")):
    xs, ys = [], []
    for line in f.open():
        if line.strip():
            x, y = json.loads(line)["geometry"]["coordinates"]
            if x and y: xs.append(x); ys.append(y)
    if xs:
        out[f.stem] = [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)]
json.dump(out, open("public/index.json", "w"), separators=(",", ":"))
print(len(out), "files indexed")
