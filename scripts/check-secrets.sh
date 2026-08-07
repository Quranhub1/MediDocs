#!/bin/bash
# Pre-commit hook to prevent accidentally committing secrets
# Install: ln -s ../../scripts/check-secrets.sh .git/hooks/pre-commit

set -e

# Patterns that suggest a secret was committed
PATTERNS=(
  "AIzaSy"
  "sk_test_"
  "pk_test_"
  "Bearer "
  "api_key.*=.*['\"][^'\"]{20,}['\"]"
  "password.*=.*['\"][^'\"]{8,}['\"]"
  "secret.*=.*['\"][^'\"]{8,}['\"]"
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  if git diff --cached --name-only | grep -E '\.(js|ts|json|md|env|yaml|yml)$' | xargs grep -nE "$pattern" 2>/dev/null; then
    echo "ERROR: Potential secret detected matching pattern: $pattern"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo "Commit blocked: review the detected matches above and remove any secrets."
  exit 1
fi

exit 0
