import json

def deduplicate_by_description(data):
    seen_descriptions = set()
    deduped = []
    duplicates_removed = 0
    
    for entry in data:
        desc = entry.get("description", "").strip()
        if desc and desc not in seen_descriptions:
            deduped.append(entry)
            seen_descriptions.add(desc)
        else:
            duplicates_removed += 1  # Increment the count for duplicates removed
    
    return deduped, duplicates_removed

with open("sympy_functions.json") as f:
    data = json.load(f)

# Call the deduplication function
deduped_data, duplicates_removed = deduplicate_by_description(data)

# Save the deduplicated data back to a new file
with open("functions_data_deduped.json", "w") as f:
    json.dump(deduped_data, f, indent=2)

# Print how many were deleted
print(f"Number of duplicates removed: {duplicates_removed}")


