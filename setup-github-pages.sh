#!/bin/bash

# QuickPoll GitHub Pages Setup Script
# This script helps set up the GitHub Pages version of QuickPoll

echo "🚀 QuickPoll GitHub Pages Setup"
echo "================================"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    echo "Please run this script from the root of your quickPoll repository"
    exit 1
fi

echo "📝 Step 1: Configuration"
echo "------------------------"
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your repository name [quickPoll]: " GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-quickPoll}

echo ""
echo "✏️  Updating config.js..."

# Update config.js
cat > config.js << EOF
/**
 * QuickPoll Configuration for GitHub Pages
 * Update these values for your repository
 */

window.GITHUB_CONFIG = {
    // Your GitHub username
    owner: '${GITHUB_USER}',
    
    // Your repository name
    repo: '${GITHUB_REPO}',
    
    // App version
    version: '3.0.0-github-pages',
    
    // Enable debug mode
    debug: true
};

console.log('📝 QuickPoll GitHub Pages - Configuration loaded:', window.GITHUB_CONFIG);
EOF

echo "✅ Config updated!"
echo ""

echo "📄 Step 2: Switching to GitHub Pages version"
echo "---------------------------------------------"

# Backup original index.html if it exists and is different
if [ -f "index.html" ] && [ ! -f "index-server.html.backup" ]; then
    echo "💾 Backing up original index.html to index-server.html.backup..."
    cp index.html index-server.html.backup
fi

# Copy GitHub Pages version to index.html
if [ -f "index-github.html" ]; then
    echo "📋 Copying index-github.html to index.html..."
    cp index-github.html index.html
    echo "✅ index.html updated!"
else
    echo "❌ Error: index-github.html not found"
    exit 1
fi

echo ""
echo "🔧 Step 3: Repository Settings"
echo "-------------------------------"
echo ""
echo "Please make sure:"
echo "  1. Issues are enabled in your repository"
echo "  2. GitHub Pages is configured to deploy from 'main' branch"
echo ""
echo "To enable GitHub Pages:"
echo "  1. Go to: https://github.com/${GITHUB_USER}/${GITHUB_REPO}/settings/pages"
echo "  2. Under 'Source', select 'Deploy from a branch'"
echo "  3. Select 'main' branch and '/ (root)' folder"
echo "  4. Click 'Save'"
echo ""

read -p "Press Enter once you've configured GitHub Pages..."

echo ""
echo "📦 Step 4: Commit and Push"
echo "--------------------------"
echo ""
read -p "Do you want to commit these changes and push to GitHub? (y/n): " COMMIT_CHOICE

if [ "$COMMIT_CHOICE" = "y" ] || [ "$COMMIT_CHOICE" = "Y" ]; then
    echo "💾 Committing changes..."
    git add config.js index.html index-github.html
    git commit -m "Setup GitHub Pages version of QuickPoll"
    
    echo "⬆️  Pushing to GitHub..."
    git push origin main
    
    echo "✅ Changes pushed!"
else
    echo "ℹ️  Skipping commit. You can commit manually later with:"
    echo "   git add config.js index.html"
    echo "   git commit -m 'Setup GitHub Pages version'"
    echo "   git push origin main"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your GitHub Pages site will be available at:"
echo "  https://${GITHUB_USER}.github.io/${GITHUB_REPO}/"
echo ""
echo "⏳ Note: It may take a few minutes for GitHub Pages to deploy your site."
echo ""
echo "📚 Next Steps:"
echo "  1. Visit your GitHub Pages URL"
echo "  2. Click 'Sign in with GitHub'"
echo "  3. Create a Personal Access Token:"
echo "     - Go to: https://github.com/settings/tokens"
echo "     - Click 'Generate new token (classic)'"
echo "     - Name it 'QuickPoll'"
echo "     - Select 'public_repo' scope"
echo "     - Generate and copy the token"
echo "  4. Paste your token when prompted"
echo "  5. Create your first poll!"
echo ""
echo "📖 For more information, see README_GITHUB_PAGES.md"
echo ""
