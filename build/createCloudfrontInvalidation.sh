#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 aws-s3-sync.output"
  exit 2
fi

TMP_FILE=$1

if [ ! -f $TMP_FILE ]; then
  echo "Unable to read file '$TMP_FILE'"
  exit 2
fi

# Account for /index.html files as well, (e.g. /index.html => /)
grep -E "index.html$" $TMP_FILE | sed -E "s/index.html//" >> $TMP_FILE

FILES_JSON=$(cat $TMP_FILE | jq -Rs 'split("\n")' | jq -rcS '[.[] | select(length > 0) | gsub("^\\s+|\\s+$";"")]')
FILES_LENGTH=$(cat $TMP_FILE| jq -Rs 'split("\n")' | jq -rcS '[.[] | select(length > 0) | gsub("^\\s+|\\s+$";"")] | length')

JSON="{\"Paths\": {\"Quantity\": $FILES_LENGTH,\"Items\": $FILES_JSON},\"CallerReference\": \"github-action-$GITHUB_RUN_ID-$GITHUB_RUN_NUMBER\"}"

echo $JSON > files.json
