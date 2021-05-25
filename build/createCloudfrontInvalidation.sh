#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 aws-s3-sync.output"
  exit 1
fi

TMP_FILE=$1

if [ ! -f $TMP_FILE ]; then
  echo "Unable to read file '$TMP_FILE'"
  exit 2
fi

SYNCED_FILES=$(cat synced-files.tmp)
FILES_JSON=$(cat $TMP_FILE | jq -R -s -c 'split("\n")' | jq '[.[] | select(length > 0)]')
FILES_LENGTH=$(cat $TMP_FILE | jq -R -s -c 'split("\n")' | jq '[.[] | select(length > 0)] | length')

JSON="{\"Paths\": {\"Quantity\": $FILES_LENGTH,\"Items\": $FILES_JSON},\"CallerReference\": \"github-action\"}"

echo $JSON >> files.json
