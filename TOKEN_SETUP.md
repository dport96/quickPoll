# GitHub Token Setup for QuickPoll

## 🔑 Required Setup

Before using QuickPoll, you need to replace the example token with your actual GitHub Personal Access Token.

### 1. Get Your GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "QuickPoll Storage" 
4. Select the **"gist"** scope only
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 2. Update the Code

In `github-gist-script.js`, replace the example token:

```javascript
// REPLACE THIS LINE:
this.githubToken = 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// WITH YOUR ACTUAL TOKEN:
this.githubToken = 'ghp_your_actual_token_here';
```

### 3. Security Note

⚠️ **Important**: Never commit your actual token to a public repository. 

For production use, consider:
- Using environment variables
- Implementing user token input via UI
- Using GitHub Apps instead of personal tokens

## ✅ Verification

After setting your token, QuickPoll will:
- Create private GitHub Gists for each poll
- Store all vote data persistently 
- Enable real-time vote sharing across devices
- Show "🔗 GitHub Connected" in the interface
