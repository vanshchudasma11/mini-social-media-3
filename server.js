const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database
const users = [];
const posts = [];
let userIdCounter = 1;
let postIdCounter = 1;

// Helper to find user
const findUser = (id) => users.find(u => u.id === parseInt(id));

// --- Auth Routes ---

app.post('/api/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    // Check if user exists (case insensitive)
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: 'Username already taken' });
    }

    const newUser = {
        id: userIdCounter++,
        username,
        joinedAt: new Date(),
        followers: [], // array of userIds
        following: []  // array of userIds
    };
    users.push(newUser);
    res.status(201).json(newUser);
});

app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    res.json(user);
});

// --- User Routes ---

app.get('/api/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's posts
    const userPosts = posts.filter(p => p.userId === userId).reverse();

    res.json({
        id: user.id,
        username: user.username,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        joinedAt: user.joinedAt,
        posts: userPosts
    });
});

app.post('/api/users/:id/follow', (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const { currentUserId } = req.body;

    if (!currentUserId) return res.status(400).json({ error: 'Current User ID required' });
    if (targetUserId === currentUserId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const targetUser = findUser(targetUserId);
    const currentUser = findUser(currentUserId);

    if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found' });

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
        // Unfollow
        currentUser.following = currentUser.following.filter(id => id !== targetUserId);
        targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
    } else {
        // Follow
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
    }

    res.json({
        success: true,
        isFollowing: !isFollowing,
        followersCount: targetUser.followers.length
    });
});

// --- Post Routes ---

app.get('/api/posts', (req, res) => {
    // Populate user info for each post
    const populatedPosts = posts.map(post => {
        const user = findUser(post.userId);
        return {
            ...post,
            username: user ? user.username : 'Unknown'
        };
    }).reverse(); // Newest first

    res.json(populatedPosts);
});

app.post('/api/posts', (req, res) => {
    const { userId, content } = req.body;
    if (!userId || !content) return res.status(400).json({ error: 'Missing fields' });

    const user = findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newPost = {
        id: postIdCounter++,
        userId: parseInt(userId),
        content,
        timestamp: new Date(),
        likes: [], // array of userIds
        comments: [] // array of objects { userId, username, text, timestamp }
    };
    posts.push(newPost);

    res.status(201).json({
        ...newPost,
        username: user.username
    });
});

app.post('/api/posts/:id/like', (req, res) => {
    const postId = parseInt(req.params.id);
    const { userId } = req.body;

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
        post.likes.push(userId);
    } else {
        post.likes.splice(likeIndex, 1);
    }

    res.json({ likes: post.likes.length, isLiked: likeIndex === -1 });
});

app.post('/api/posts/:id/comment', (req, res) => {
    const postId = parseInt(req.params.id);
    const { userId, text } = req.body;

    const post = posts.find(p => p.id === postId);
    const user = findUser(userId);

    if (!post || !user) return res.status(404).json({ error: 'Not found' });

    const newComment = {
        id: Date.now(), // simple ID
        userId: parseInt(userId),
        username: user.username,
        text,
        timestamp: new Date()
    };
    post.comments.push(newComment);

    res.status(201).json(newComment);
});

// Fallback for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
