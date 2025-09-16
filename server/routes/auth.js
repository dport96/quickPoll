const express = require('express');
const router = express.Router();

// In-memory store for active user sessions
// In production, this should be stored in a database or Redis
const activeSessions = new Map();

// Session timeout (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [email, session] of activeSessions.entries()) {
        if (now - session.signedInAt > SESSION_TIMEOUT) {
            activeSessions.delete(email);
            console.log(`🧹 Cleaned up expired session for ${email}`);
        }
    }
}, 60 * 60 * 1000); // Clean up every hour

// POST /api/auth/signin - Sign in user
router.post('/signin', (req, res) => {
    const { email, name } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            error: 'Email is required',
            success: false 
        });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if email is already signed in from another session
    const existingSession = activeSessions.get(normalizedEmail);
    if (existingSession) {
        const now = Date.now();
        const timeSinceSignIn = now - existingSession.signedInAt;
        
        // If session is still active (within timeout)
        if (timeSinceSignIn < SESSION_TIMEOUT) {
            return res.status(409).json({
                error: 'Email already signed in',
                message: 'This email address is already signed in from another session. Please sign out from the other session first or wait for it to expire.',
                success: false,
                existingSession: {
                    signedInAt: existingSession.signedInAt,
                    userAgent: existingSession.userAgent,
                    ip: existingSession.ip
                }
            });
        } else {
            // Session expired, remove it
            activeSessions.delete(normalizedEmail);
        }
    }
    
    // Create new session
    const sessionData = {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        signedInAt: Date.now(),
        userAgent: req.get('User-Agent') || 'Unknown',
        ip: req.ip || req.connection.remoteAddress || 'Unknown'
    };
    
    // Store session
    activeSessions.set(normalizedEmail, sessionData);
    
    // Store in express session as well
    req.session.user = sessionData;
    
    console.log(`✅ User signed in: ${normalizedEmail}`);
    
    res.json({
        success: true,
        user: {
            email: sessionData.email,
            name: sessionData.name,
            signedInAt: sessionData.signedInAt
        }
    });
});

// POST /api/auth/signout - Sign out user
router.post('/signout', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            error: 'Email is required',
            success: false 
        });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Remove from active sessions
    if (activeSessions.has(normalizedEmail)) {
        activeSessions.delete(normalizedEmail);
        console.log(`👋 User signed out: ${normalizedEmail}`);
    }
    
    // Clear express session
    if (req.session.user && req.session.user.email && req.session.user.email.toLowerCase() === normalizedEmail) {
        req.session.destroy();
    }
    
    res.json({
        success: true,
        message: 'Successfully signed out'
    });
});

// GET /api/auth/status - Check authentication status
router.get('/status', (req, res) => {
    const { email } = req.query;
    
    if (!email) {
        return res.status(400).json({ 
            error: 'Email is required',
            success: false 
        });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const session = activeSessions.get(normalizedEmail);
    
    if (session) {
        const now = Date.now();
        const timeSinceSignIn = now - session.signedInAt;
        
        if (timeSinceSignIn < SESSION_TIMEOUT) {
            return res.json({
                success: true,
                isSignedIn: true,
                session: {
                    email: session.email,
                    name: session.name,
                    signedInAt: session.signedInAt,
                    userAgent: session.userAgent,
                    ip: session.ip
                }
            });
        } else {
            // Session expired
            activeSessions.delete(normalizedEmail);
        }
    }
    
    res.json({
        success: true,
        isSignedIn: false
    });
});

// GET /api/auth/sessions - Get all active sessions (for debugging)
router.get('/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.entries()).map(([email, session]) => ({
        email,
        name: session.name,
        signedInAt: session.signedInAt,
        userAgent: session.userAgent,
        ip: session.ip,
        isExpired: (Date.now() - session.signedInAt) > SESSION_TIMEOUT
    }));
    
    res.json({
        success: true,
        sessions,
        totalActive: sessions.filter(s => !s.isExpired).length
    });
});

module.exports = router;
