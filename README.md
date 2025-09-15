# Deplpoyed at
http://128.171.195.8:3001/

ssh "Dan Port"

# QuickPoll - Professional Real-time Voting Application 🚀

QuickPoll is a professional web-based application that enables you to create ranking, rating, and poll voting contests with real-time results. Your audience can participate live on their mobile phones, tablets, and desktops with instant vote updates across all devices.

## 🎯 Key Features

- **Three Types of Polls:**
  - **Simple Polls**: Multiple choice or Yes/No questions
  - **Rating Polls**: Rate items on a 1-5 star scale
  - **Ranking Polls**: Drag and drop to rank items in order of preference

- **🔥 Real-time Everything**: Live vote updates, instant notifications, synchronized results
- **📱 Mobile Optimized**: Touch-friendly interface, responsive design
- **🛡️ Professional Grade**: Server-side storage, data validation, rate limiting
- **⚡ Zero Setup**: No databases, no installation, just start the server
- **🌐 Session-Based**: In-memory storage with automatic cleanup

## 🚀 Quick Start

### Server Setup

```bash
# Clone the repository
git clone https://github.com/dport96/quickPoll.git
cd quickPoll

# Install dependencies
cd server
npm install

# Start the server
npm run dev
```

The application will be available at `http://localhost:3001`

## ⚙️ Configuration for External Access

### Local Network Access

To allow others on your local network to access the polls, you can either use the automated script or configure manually:

#### Option 1: Automated Configuration (Recommended)

```bash
# Run the configuration script
./configure-external-access.sh
```

This script will automatically:
- Detect your IP address
- Update server configuration files
- Provide the shareable URL

#### Option 2: Manual Configuration

1. **Find your IP address**:
   ```bash
   # On Windows
   ipconfig
   
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update environment configuration**:
   ```bash
   # Edit server/.env file
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://YOUR_IP_ADDRESS:3001  # e.g., http://192.168.1.100:3001
   ```

3. **Update frontend API URL**:
   ```javascript
   // Edit server-client-script.js line 7
   this.apiUrl = 'http://YOUR_IP_ADDRESS:3001/api';  // e.g., http://192.168.1.100:3001/api
   
   // Edit server-client-script.js line 38
   this.socket = io('http://YOUR_IP_ADDRESS:3001');  // e.g., http://192.168.1.100:3001
   ```

4. **Restart the server**:
   ```bash
   cd server
   npm start
   ```

5. **Share the URL**: `http://YOUR_IP_ADDRESS:3001`

### Production Deployment

For internet-wide access, deploy to a cloud service and update configuration:

```bash
# Example for production deployment
PORT=80
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

Then update the frontend URLs to match your domain:
```javascript
this.apiUrl = 'https://your-domain.com/api';
this.socket = io('https://your-domain.com');
```

### Security Considerations

- **Rate Limiting**: Configured by default (15 requests per minute)
- **CORS**: Update `CORS_ORIGIN` to match your domain
- **HTTPS**: Recommended for production deployments
- **Firewall**: Ensure port 3001 (or your chosen port) is accessible

### Creating a Poll

1. Open the application in your web browser
2. Click "Create New Poll" on the homepage
3. Configure your poll:
   - Enter poll title and description
   - Choose poll type (Simple, Rating, or Ranking)
   - Add your options (minimum 2 required)
4. Click "Create Poll"
5. Share the generated voting link with your audience
6. Monitor results in real-time on the results page

### Voting Experience

1. Open the voting link on any device
2. Cast your vote:
   - **Simple Poll**: Select your preferred option(s)
   - **Rating Poll**: Rate each option with 1-5 stars
   - **Ranking Poll**: Drag to reorder options by preference
3. Submit your vote
4. See real-time results immediately

## 🏗️ Architecture

```text
Frontend ↔ REST API ↔ In-Memory Storage ↔ Socket.IO Real-time
```

### Technology Stack

- **Backend**: Node.js + Express.js
- **Storage**: In-memory sessions with automatic cleanup
- **Real-time**: Socket.IO for live updates
- **Frontend**: Modern JavaScript with WebSocket integration
- **Security**: Rate limiting, input validation, session management

## 📁 Project Structure

```text
quickPoll/
├── server/                  # Server-side application
│   ├── server.js           # Express.js server
│   ├── package.json        # Node.js dependencies
│   ├── storage/            # In-memory data store
│   └── routes/             # API endpoints
├── index-server.html       # Main application interface
├── server-client-script.js # Frontend logic with real-time updates
├── styles.css             # Application styling
└── README.md              # Documentation
```

## 🗄️ Data Management

### In-Memory Storage

- **Session-Based**: Data tied to user sessions for poll ownership
- **Real-time Synchronization**: Socket.IO keeps all clients updated
- **Data Validation**: Server-side validation prevents invalid votes
- **Automatic Cleanup**: Old sessions and expired polls removed automatically

### API Endpoints

- `POST /api/polls` - Create new polls
- `GET /api/polls/:id` - Retrieve poll data
- `POST /api/polls/:id/vote` - Submit votes
- `DELETE /api/polls/:id` - Close polls
- `WebSocket` - Real-time updates

## 🔧 Development Setup

### Prerequisites

- Node.js (v16 or higher)
- Git

### Manual Setup

```bash
# Install dependencies
cd server
npm install

# Start development server
npm run dev
```

### Environment Configuration

Create `server/.env` file:

```bash
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_session_secret
RATE_LIMIT_MAX=100
```

## 📊 Poll Types Explained

### Simple Polls

- Single or multiple choice questions
- Real-time vote counts and percentages
- Example: "What's your favorite programming language?"

### Rating Polls

- Rate multiple items on a 1-5 star scale
- Live average ratings and distribution
- Example: "Rate these new features"

### Ranking Polls

- Drag and drop to rank items in order of preference
- Weighted scoring with live position tracking
- Example: "Rank these priorities for our roadmap"

## ✨ Key Features

### Real-time Updates

- Live vote counting across all connected devices
- Instant result synchronization
- Real-time notifications for new votes

### Professional Interface

- Mobile-first responsive design
- Touch-optimized drag and drop
- Clean, intuitive user experience

### Enterprise Ready

- Scalable in-memory architecture
- Rate limiting and security features
- Professional error handling and logging

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/dport96/quickPoll.git
   cd quickPoll
   ```

2. **Install dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Start the server**

   ```bash
   npm run dev
   ```

4. **Open your browser** to `http://localhost:3001` and start creating polls!

## 🔗 Additional Resources

- **Server Documentation**: See `README_SERVER.md` for detailed server setup and deployment
- **API Documentation**: Available at `/api/docs` when server is running

## 📄 License

This project is open source and available under the MIT License.
