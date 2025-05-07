#!/bin/bash

TUNES_DIR="./assets/tunes"
OUTPUT_FILE="$TUNES_DIR/tunesIndex.ts"

# Start fresh
echo "export const songList = [" > "$OUTPUT_FILE"

# Loop through and sort all mp3 files
find "$TUNES_DIR" -type f -name '*.mp3' | sort | while read -r file; do
  filename=$(basename -- "$file")
  name="${filename%.*}"  # Remove extension

  # Convert -/_ to space, trim, normalize spacing, escape single quotes
  display_name=$(echo "$name" | sed 's/[-_]/ /g' | tr -s ' ' | sed "s/'/\\\'/g")

  echo "  { name: '$display_name', file: require('./$filename') }," >> "$OUTPUT_FILE"
done

# Close array
echo "];" >> "$OUTPUT_FILE"

echo "✅ Rebuilt $OUTPUT_FILE"
