# GitHub Gist Integration for QuickPoll

This version of QuickPoll uses GitHub Gists to store poll data and votes, providing persistent storage that works with GitHub Pages hosting.

## 🚀 Features

- **Persistent Storage**: Votes are stored in GitHub Gists, not just browser localStorage
- **Real-time Sharing**: Multiple users can vote and see results immediately
- **Automatic Fallback**: If GitHub is unavailable, falls back to localStorage
- **Private Gists**: Poll data is stored in private gists for security
- **Cross-device Access**: Access your polls from any device

## 📋 Setup Instructions

### 1. Get a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "QuickPoll Storage"
4. Set expiration as needed (or "No expiration" for permanent use)
5. **Important**: Check the "gist" scope only
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

### 2. Configure QuickPoll

1. Open `index-github.html` in your browser
2. Click the "📁 Local Storage" indicator in the top-right
3. Paste your GitHub token in the setup modal
4. Click "Save & Enable"
5. The indicator should change to "🔗 GitHub Connected"

### 3. Deploy to GitHub Pages

1. Upload all files to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Use `index-github.html` as your main page, or rename it to `index.html`

## 🔧 How It Works

### Poll Creation
```javascript
// When you create a poll, it creates a GitHub Gist with 3 files:
{
  "poll-data.json": {/* poll configuration */},
  "votes.json": {/* all votes */},
  "metadata.json": {/* creation info */}
}
```

### Voting Process
1. User visits voting link
2. App tries to load poll from GitHub Gist
3. If successful, shows current vote counts
4. When user votes, updates the gist
5. Falls back to localStorage if GitHub is unavailable

### Data Structure

**poll-data.json**:
```json
{
  "id": "unique-poll-id",
  "title": "Poll Title",
  "description": "Optional description",
  "type": "simple|rating|ranking",
  "requireAuth": true,
  "validEmails": ["user1@example.com"],
  "options": ["Option 1", "Option 2"],
  "created": "2025-01-17T12:00:00.000Z",
  "createdBy": "creator@example.com",
  "gistId": "github-gist-id",
  "gistUrl": "https://gist.github.com/..."
}
```

**votes.json**:
```json
{
  "voter1@example.com": {
    "vote": "Option 1",
    "timestamp": "2025-01-17T12:05:00.000Z",
    "voter": {
      "email": "voter1@example.com",
      "name": "John Doe"
    }
  }
}
```

## 🔒 Security & Privacy

- **Private Gists**: All polls are stored as private gists
- **Token Security**: Your GitHub token is stored locally in browser
- **Access Control**: Only poll creators can view results (authenticated polls)
- **Email Validation**: Supports email restrictions for voting

## 📊 Benefits Over localStorage

| Feature | localStorage | GitHub Gists |
|---------|-------------|--------------|
| **Persistence** | Browser only | Cross-device |
| **Sharing** | URL parameters | Real-time sync |
| **Backup** | None | GitHub's infrastructure |
| **Collaboration** | Limited | Multiple voters |
| **Data Loss Risk** | High | Very low |
| **Storage Limit** | ~5-10MB | 100MB per gist |

## 🛠️ Usage Examples

### Basic Poll with GitHub Storage
1. Configure GitHub token
2. Create poll normally
3. Share voting link
4. Votes automatically sync to GitHub

### Authenticated Poll
1. Sign in with email
2. Create authenticated poll
3. Only you can view results
4. Voters' emails are validated

### Anonymous Poll
1. Create anonymous poll
2. Anyone can vote multiple times
3. Results visible to all
4. No authentication required

## 🔧 API Rate Limits

GitHub API limits:
- **Authenticated requests**: 5,000 per hour
- **Creating gists**: No specific limit
- **Updating gists**: No specific limit

For typical usage, you won't hit these limits.

## 🚨 Troubleshooting

### "GitHub storage failed" message
- Check your internet connection
- Verify your GitHub token is correct
- Ensure token has "gist" scope
- App will fallback to localStorage automatically

### Can't see votes from other devices
- Ensure GitHub integration is enabled
- Check that the same poll ID is being used
- Verify token permissions

### Token expired
- GitHub tokens can expire
- Generate a new token following setup instructions
- Update in the GitHub setup modal

## 🔄 Migration from localStorage

If you have existing polls in localStorage:
1. Enable GitHub integration
2. Existing polls remain in localStorage
3. New polls will use GitHub storage
4. No automatic migration (manual export/import needed)

## 📝 Development Notes

### File Structure
```
quickPoll/
├── index-github.html          # Main page with GitHub integration
├── github-gist-script.js      # GitHub API integration
├── email-auth-script.js       # Base application (unchanged)
├── email-auth-styles.css      # Styles including GitHub UI
└── styles.css                 # Base styles
```

### Extending the Integration
The `QuickPollGitHubApp` class extends `QuickPollEmailApp` and adds:
- GitHub API methods
- Automatic fallback logic
- Token management UI
- Gist creation/updating

### Custom Configuration
You can modify the GitHub username/repo in `github-gist-script.js`:
```javascript
this.githubOwner = 'your-username';
this.githubRepo = 'your-repo-name';
```

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify GitHub token has correct permissions
3. Test with a simple poll first
4. Check GitHub API status if problems persist

## 🎉 Success!

You now have a fully functional polling app with persistent GitHub storage that works perfectly with GitHub Pages hosting!
