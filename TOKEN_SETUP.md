# GitHub Token Setup for QuickPoll

## 🔑 Required Setup

Before using QuickPoll, you need to replace the example token with your actual GitHub Personal Access Token.

# QuickPoll GitHub Token Setup

**IMPORTANT: Never commit actual GitHub tokens to your repository!**

## Why This Approach?

GitHub automatically revokes Personal Access Tokens when they detect them in public repositories. This is a security feature to prevent token leaks.

## How to Set Up Your Token

### Method 1: Browser Console (Recommended for Development)

1. **Generate a GitHub Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Add note: "QuickPoll Gist Access"
   - Select scope: **"gist"** (only this permission needed)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Set Token in Browser:**
   - Open your QuickPoll page
   - Open browser console (F12)
   - Run: `app.setGitHubToken("your_actual_token_here")`
   - You should see: "✅ GitHub token set successfully"

3. **Verify Setup:**
   - Run: `quickGistTest()` in console
   - Should show "✅ Token format looks valid"
   - Run: `testGistStorage()` for full testing

### Method 2: Environment Variables (For Production)

For production deployments, use environment variables or secure token management systems instead of hardcoding tokens.

## Token Storage

- **SessionStorage**: Token stored in browser session (cleared when browser closes)
- **No Repository Storage**: Token never committed to git
- **Secure**: Only stored locally in your browser

## Available Commands

In browser console:

```javascript
// Set your token
app.setGitHubToken("your_token_here")

// Check token status
app.isTokenValid()

// Clear token
app.clearGitHubToken()

// Quick test
quickGistTest()

// Full test
testGistStorage()
```

## Troubleshooting

### Token Expired/Revoked
- GitHub automatically revokes tokens found in repositories
- Generate a new token and set it again
- Never commit actual tokens to git

### 401 Unauthorized
- Token not set: `app.setGitHubToken("your_token")`
- Token invalid: Generate new token with "gist" scope
- Token expired: Generate new token

### UI Shows "GitHub Token Required"
- Click the warning to see setup instructions
- Set token using console commands above

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use minimal scopes** (only "gist" for QuickPoll)
3. **Regenerate tokens** if compromised
4. **Use sessionStorage** for temporary storage
5. **Consider token expiration** and renewal

## File Structure

- `github-gist-script.js` - Safe to commit (no actual tokens)
- `TOKEN_SETUP.md` - Setup instructions (safe to commit)
- Your actual tokens - **NEVER commit these!**