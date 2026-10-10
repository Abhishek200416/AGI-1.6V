"""
scripts/prepare_gpqa_diamond_clean.py
Prepares and validates the official GPQA Diamond Clean 1.2.2 dataset (189 questions)
from the licensed 198-question GPQA Diamond dataset and adamallcock/gpqa-diamond-clean overlay.
"""

import os
import sys
import csv
import json
import hashlib
import urllib.request

DEST_DIR = r"D:\AGI_Evaluation\AGI_1_5_FULL_BENCHMARKS\datasets\gpqa_diamond_clean"
INTEGRITY_DIR = r"D:\AGI_Evaluation\AGI_1_5_FULL_BENCHMARKS\integrity"
SOURCE_CSV = r"D:\AGI_Evaluation\REAL_WORLD_COMPARISON\datasets\gpqa\dataset\gpqa_diamond.csv"

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    os.makedirs(DEST_DIR, exist_ok=True)
    os.makedirs(INTEGRITY_DIR, exist_ok=True)
    
    print(f"[PREPARE] Copying source GPQA Diamond dataset from {SOURCE_CSV}...")
    dest_src_csv = os.path.join(DEST_DIR, "source_gpqa_diamond.csv")
    with open(SOURCE_CSV, "rb") as f_in, open(dest_src_csv, "wb") as f_out:
        f_out.write(f_in.read())
        
    src_sha = sha256_file(dest_src_csv)
    print(f"[PREPARE] Source CSV SHA-256: {src_sha}")
    
    # Download official overlay files
    base_raw = "https://raw.githubusercontent.com/adamallcock/gpqa-diamond-clean/master"
    for fname, sub in [("exclusions.jsonl", "data"), ("manifest.json", "data"), ("build.py", "scripts"), ("verify.py", "scripts")]:
        url = f"{base_raw}/{sub}/{fname}"
        out_path = os.path.join(DEST_DIR, fname)
        print(f"[PREPARE] Fetching {url} -> {out_path}...")
        req = urllib.request.Request(url, headers={"User-Agent": "AGI-1.5-Benchmark-Engine"})
        content = urllib.request.urlopen(req, timeout=15).read()
        with open(out_path, "wb") as f_out:
            f_out.write(content)
            
    # Load exclusions
    excl_path = os.path.join(DEST_DIR, "exclusions.jsonl")
    exclusions = set()
    with open(excl_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                item = json.loads(line)
                exclusions.add(item["id"])
                
    print(f"[PREPARE] Loaded {len(exclusions)} exclusion IDs from overlay: {exclusions}")
    
    # Process source CSV to create cleaned dataset
    rows_in = []
    with open(dest_src_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows_in.append(r)
            
    print(f"[PREPARE] Source total rows: {len(rows_in)}")
    if len(rows_in) != 198:
        raise ValueError(f"Expected 198 source rows in Diamond split, found {len(rows_in)}")
        
    cleaned_rows = []
    excluded_rows = []
    for r in rows_in:
        rec_id = r.get("Record ID")
        if not rec_id:
            raise ValueError(f"Missing Record ID in row: {r}")
        if rec_id in exclusions:
            excluded_rows.append(r)
        else:
            cleaned_rows.append(r)
            
    print(f"[PREPARE] Retained cleaned rows: {len(cleaned_rows)}")
    print(f"[PREPARE] Excluded rows: {len(excluded_rows)}")
    
    if len(excluded_rows) != 9:
        raise ValueError(f"Expected exactly 9 excluded rows, got {len(excluded_rows)}")
    if len(cleaned_rows) != 189:
        raise ValueError(f"Expected exactly 189 cleaned rows, got {len(cleaned_rows)}")
        
    # Check uniqueness
    cleaned_ids = [r["Record ID"] for r in cleaned_rows]
    if len(set(cleaned_ids)) != 189:
        raise ValueError("Duplicate Record ID detected in cleaned set!")
        
    # Save cleaned.jsonl
    cleaned_jsonl = os.path.join(DEST_DIR, "cleaned.jsonl")
    with open(cleaned_jsonl, "w", encoding="utf-8") as f:
        for r in cleaned_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    # Save cleaned.csv
    cleaned_csv = os.path.join(DEST_DIR, "cleaned.csv")
    with open(cleaned_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(cleaned_rows[0].keys()))
        writer.writeheader()
        writer.writerows(cleaned_rows)
        
    # Generate verification manifest
    manifest_info = {
        "dataset_name": "gpqa-diamond-clean",
        "clean_overlay_version": "1.2.2",
        "upstream_repository": "https://github.com/adamallcock/gpqa-diamond-clean",
        "original_dataset": "https://github.com/idavidrein/gpqa",
        "source_csv_sha256": src_sha,
        "cleaned_jsonl_sha256": sha256_file(cleaned_jsonl),
        "cleaned_csv_sha256": sha256_file(cleaned_csv),
        "total_source_items": 198,
        "total_excluded_items": 9,
        "total_cleaned_items": 189,
        "excluded_record_ids": sorted(list(exclusions)),
        "subdomain_breakdown": {}
    }
    
    for r in cleaned_rows:
        dom = r.get("High-level domain") or r.get("Subdomain", "Unknown")
        manifest_info["subdomain_breakdown"][dom] = manifest_info["subdomain_breakdown"].get(dom, 0) + 1
        
    out_manifest = os.path.join(DEST_DIR, "dataset_manifest.json")
    with open(out_manifest, "w", encoding="utf-8") as f:
        json.dump(manifest_info, f, indent=2)
        
    shutil_dest = os.path.join(INTEGRITY_DIR, "gpqa_diamond_clean_dataset_manifest.json")
    with open(shutil_dest, "w", encoding="utf-8") as f:
        json.dump(manifest_info, f, indent=2)
        
    print(f"[PREPARE] Successfully built GPQA Diamond Clean 1.2.2!")
    print(f"[PREPARE] Manifest saved to {out_manifest} and {shutil_dest}")
    print(f"[PREPARE] Domain breakdown: {manifest_info['subdomain_breakdown']}")

if __name__ == "__main__":
    main()
