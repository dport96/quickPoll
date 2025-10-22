#!/bin/bash

# Script to delete all issues from a GitHub repository
# WARNING: This action is irreversible!

# Configuration
GITHUB_TOKEN="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"
REPO_OWNER="dport96"
REPO_NAME="quickPoll"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}GitHub Issues Deletion Script${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""
echo -e "${RED}WARNING: This will delete ALL issues in ${REPO_OWNER}/${REPO_NAME}${NC}"
echo -e "${RED}This action CANNOT be undone!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${GREEN}Aborted. No issues were deleted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Fetching all issues...${NC}"

# Fetch all issues (open and closed)
page=1
all_issues=()

while true; do
    echo -e "Fetching page $page..."
    
    # Get issues from current page
    response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues?state=all&per_page=100&page=$page")
    
    # Check if response is an error
    if echo "$response" | grep -q "message"; then
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}Error: $error_msg${NC}"
        exit 1
    fi
    
    # Parse issue numbers from response
    issue_numbers=$(echo "$response" | grep -o '"number":[0-9]*' | cut -d':' -f2)
    
    # Break if no more issues
    if [ -z "$issue_numbers" ]; then
        break
    fi
    
    # Add to array
    all_issues+=($issue_numbers)
    
    # Check if we got less than 100 results (last page)
    count=$(echo "$issue_numbers" | wc -l | xargs)
    if [ "$count" -lt 100 ]; then
        break
    fi
    
    page=$((page + 1))
done

# Count total issues
total_issues=${#all_issues[@]}

if [ $total_issues -eq 0 ]; then
    echo -e "${GREEN}No issues found. Nothing to delete.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Found $total_issues issue(s) to delete${NC}"
echo ""
read -p "Proceed with deletion? (type 'DELETE' to confirm): " final_confirmation

if [ "$final_confirmation" != "DELETE" ]; then
    echo -e "${GREEN}Aborted. No issues were deleted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting issues...${NC}"
echo ""

# Counter for deleted issues
deleted_count=0
failed_count=0

# Delete each issue
for issue_number in "${all_issues[@]}"; do
    echo -n "Deleting issue #$issue_number... "
    
    # GitHub doesn't allow deleting issues via API, so we'll close them instead
    # To truly delete, you need to use GitHub's web interface or GraphQL API
    response=$(curl -s -w "%{http_code}" -X PATCH \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d '{"state":"closed"}' \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$issue_number")
    
    http_code="${response: -3}"
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✓ Closed${NC}"
        deleted_count=$((deleted_count + 1))
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        failed_count=$((failed_count + 1))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

echo ""
echo -e "${YELLOW}================================${NC}"
echo -e "${GREEN}Successfully closed: $deleted_count issue(s)${NC}"
if [ $failed_count -gt 0 ]; then
    echo -e "${RED}Failed to close: $failed_count issue(s)${NC}"
fi
echo -e "${YELLOW}================================${NC}"
echo ""
echo -e "${YELLOW}Note: GitHub API doesn't support deleting issues.${NC}"
echo -e "${YELLOW}Issues have been closed instead.${NC}"
echo -e "${YELLOW}To permanently delete issues, visit:${NC}"
echo -e "https://github.com/$REPO_OWNER/$REPO_NAME/issues"
echo -e "${YELLOW}and manually delete each closed issue.${NC}"
