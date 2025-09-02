#!/bin/bash
# Test script for gh CLI authentication

GH_PATH="/c/Program Files/GitHub CLI/gh.exe"

echo "Testing GitHub CLI authentication..."
echo ""

# Check if authenticated
if "$GH_PATH" auth status 2>&1 | grep -q "Logged in"; then
    echo "✅ Already authenticated!"
    "$GH_PATH" auth status
else
    echo "❌ Not authenticated yet."
    echo ""
    echo "Run this command to authenticate:"
    echo '"'$GH_PATH'" auth login'
    echo ""
    echo "Then run this script again to verify."
fi