# QuickPoll URL Token Usage

## Overview

QuickPoll now supports passing GitHub Personal Access Tokens via URL query parameters, enabling seamless poll sharing and viewing without requiring each user to set up their own token.

## How It Works

### For Poll Creators

1. **Set up your GitHub token** (one-time setup):
   ```javascript
   app.setGitHubToken("your_github_personal_access_token")
   ```

2. **Create a poll** - The system automatically:
   - Stores the poll and votes in a private GitHub Gist
   - Generates sharing URLs that include your token
   - Uses the Gist ID as the poll identifier

3. **Share the generated URLs** - Recipients can:
   - Vote without any setup
   - View results immediately
   - Access the poll using your token (read-only for voting)

### URL Format

```
https://yoursite.com/index.html?mode=vote&id=GIST_ID&token=YOUR_TOKEN
https://yoursite.com/index.html?mode=results&id=GIST_ID&token=YOUR_TOKEN
```

### For Poll Participants

- **No setup required** - Just click the shared link
- **Automatic token loading** - Token is extracted from URL and stored in session
- **Secure handling** - Token is removed from URL after loading
- **Vote and view** - Full functionality without personal GitHub setup

## Security Features

### Token Handling
- ✅ **URL cleaning**: Token removed from browser URL after loading
- ✅ **Session storage**: Token stored only in browser session (not persistent)
- ✅ **Private gists**: All polls stored as private GitHub Gists
- ✅ **Read-only access**: Participants can only read/vote, not modify polls

### Best Practices
- 🔐 **Use tokens with minimal permissions**: Only "gist" scope required
- 🕐 **Set token expiration**: Use GitHub's token expiration features
- 🔄 **Rotate tokens regularly**: Generate new tokens periodically
- 👥 **Share responsibly**: Only share poll URLs with intended participants

## Technical Details

### Token Sources (Priority Order)
1. **URL parameter**: `?token=your_token` or `?github_token=your_token`
2. **Session storage**: Previously set via `app.setGitHubToken()`
3. **Local storage**: Fallback for older sessions

### Gist Structure
Each poll creates a private gist with:
- `poll-data.json`: Poll configuration and options
- `votes.json`: All votes and voter information
- `metadata.json`: Creation timestamp and versioning

### API Integration
- **GitHub API**: All data stored via GitHub Gist API
- **Real-time updates**: Votes immediately saved to gist
- **Conflict handling**: Proper merge handling for concurrent votes

## Usage Examples

### Creating a Poll with Token
```javascript
### Creating a Poll with Token

```javascript
// Set token first (supports both classic and fine-grained tokens)
app.setGitHubToken("ghp_your_classic_token_here");
// OR
app.setGitHubToken("github_pat_11XXXXX_your_fine_grained_token_here");

// Create poll normally - URLs will include token automatically
// Generated URLs:
// Vote: https://site.com/?mode=vote&id=abc123&token=your_token_here  
// Results: https://site.com/?mode=results&id=abc123&token=your_token_here
```
```

### Direct URL Access
```html
<!-- Participants can access directly -->
<a href="https://site.com/?mode=vote&id=gist_id&token=your_token">
    Vote on My Poll
</a>
```

### Manual Token Setting
```javascript
// If needed, participants can also set tokens manually
app.setGitHubToken("shared_token_here");
```

## Troubleshooting

### Common Issues

**Token not working**:
- Check token has "gist" scope
- Verify token hasn't expired
- Ensure token is correctly formatted:
  - Classic: starts with `ghp_` (40 chars total)
  - Fine-grained: starts with `github_pat_` (93+ chars total)

**Poll not loading**:
- Verify Gist ID is correct
- Check if gist is private (requires token)
- Ensure internet connection is stable

**URL too long**:
- GitHub tokens are ~40 characters
- Consider using URL shorteners for sharing
- QR codes work well for mobile sharing

### Error Messages

- `GitHub token not set`: Use `app.setGitHubToken("token")`
- `Poll Not Found`: Check gist ID and token validity
- `Network error`: Check internet connection and GitHub API status

## Migration Notes

### From Previous Versions
- Old localStorage-based polls still work
- GitHub storage is now the default
- URLs generated include tokens automatically
- Session-based token storage for security

### Compatibility
- ✅ **All browsers**: Modern browser support required
- ✅ **Mobile friendly**: Responsive design maintained  
- ✅ **Offline**: Basic functionality (cached polls only)
- ✅ **Sharing**: Works with all URL sharing methods
