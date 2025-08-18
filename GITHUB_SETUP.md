# GitHub Token Setup Instructions

To use QuickPoll with GitHub Gist storage, you need to create a GitHub Personal Access Token.

## Step 1: Create a GitHub Personal Access Token

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Profile Picture → Settings → Developer Settings → Personal Access Tokens

2. **Choose Token Type:**
   - **For Beginners:** Click "Tokens (classic)" → "Generate new token (classic)"
   - **For Advanced Users:** You can use "Fine-grained personal access tokens"

3. **Configure the Token:**
   - **Note/Name:** Enter something like "QuickPoll Gist Access"
   - **Expiration:** Choose your preferred expiration (30 days, 90 days, or custom)
   - **Scopes:** Check the **"gist"** scope (this is the only permission needed)

4. **Generate and Copy:**
   - Click "Generate token"
   - **IMPORTANT:** Copy the token immediately - you won't see it again!

## Step 2: Add Token to QuickPoll

1. **Open `github-gist-script.js`**
2. **Find this line:**
   ```javascript
   this.githubToken = 'ghp_EXAMPLE_TOKEN_REPLACE_WITH_YOUR_ACTUAL_GITHUB_TOKEN_HERE_1234567890abcdef';
   ```
3. **Replace with your actual token:**
   ```javascript
   this.githubToken = 'ghp_your_actual_token_here';
   ```

## Example Token Formats

- **Classic Token:** `ghp_1234567890abcdef1234567890abcdef12345678`
- **Fine-grained Token:** `github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz...` (much longer)

## Step 3: Test the Setup

1. **Open your QuickPoll page**
2. **Open browser console (F12)**
3. **Run:** `quickGistTest()`
4. **For full testing:** `testGistStorage()`

## Security Notes

- **Never commit your actual token to version control**
- **Keep your token secure and private**
- **Regenerate if compromised**
- **Use minimal scopes (only "gist" for QuickPoll)**

## Troubleshooting

### 401 Unauthorized Error
- Token is invalid, expired, or missing
- Double-check you copied the complete token
- Ensure the token has "gist" scope

### Token Format Issues
- Classic tokens start with `ghp_` and are ~40 characters
- Fine-grained tokens start with `github_pat_` and are ~93+ characters
- Remove any extra spaces or characters

### Still Having Issues?
1. Try generating a new token
2. Make sure you're using the "gist" scope
3. Check that the token hasn't expired
4. Run `quickGistTest()` to diagnose the issue
