// State
let currentUser = null;
let currentProfileId = null;

const API_BASE = 'http://localhost:3001/api';

// --- Initialization ---

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('mini_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showAppView();
    }
});

// --- Auth Functions ---

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

async function login() {
    const username = document.getElementById('login-username').value;
    if (!username) return alert('Please enter a username');

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();

        if (res.ok) {
            currentUser = data;
            localStorage.setItem('mini_user', JSON.stringify(currentUser));
            showAppView();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Login failed');
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    if (!username) return alert('Please enter a username');

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Registration successful! Please log in.');
            showLogin();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Registration failed');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('mini_user');
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('login-username').value = '';
}

// --- Navigation & Views ---

function showAppView() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    loadFeed();
}

function loadFeed() {
    document.getElementById('feed-section').classList.remove('hidden');
    document.getElementById('profile-section').classList.add('hidden');
    fetchPosts();
}

function loadMyProfile() {
    loadProfile(currentUser.id);
}

async function loadProfile(userId) {
    currentProfileId = userId;
    document.getElementById('feed-section').classList.add('hidden');
    document.getElementById('profile-section').classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE}/users/${userId}`);
        const user = await res.json();

        if (res.ok) {
            document.getElementById('profile-username').textContent = user.username;
            document.getElementById('profile-posts-count').textContent = user.posts.length;
            document.getElementById('profile-followers').textContent = user.followersCount;
            document.getElementById('profile-following').textContent = user.followingCount;

            const followBtn = document.getElementById('follow-btn');
            if (currentUser.id === user.id) {
                followBtn.style.display = 'none';
            } else {
                followBtn.style.display = 'block';
                // Check if following (this logic would ideally come from backend but we can check mostly client side or assume backend state usually)
                // Actually our GET /users/:id doesn't say if I follow them. 
                // Let's just default to "Follow/Unfollow" state handling requires an extra check.
                // For this simple app, we can do a check.
                // Or better: update backend specific endpoint to return "isFollowing" boolean.
                // I'll leave the button text generic or update it optimistically.
                followBtn.textContent = 'Follow/Unfollow';
            }

            const container = document.getElementById('profile-posts-container');
            container.innerHTML = '';
            user.posts.forEach(post => {
                // Manually inject username as it might be missing in user.posts array relative to global feed format
                post.username = user.username;
                container.appendChild(createPostElement(post));
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Features ---

async function fetchPosts() {
    try {
        const res = await fetch(`${API_BASE}/posts`);
        const posts = await res.json();
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        posts.forEach(post => {
            container.appendChild(createPostElement(post));
        });
    } catch (err) {
        console.error(err);
    }
}

async function createPost() {
    const content = document.getElementById('post-content').value;
    if (!content) return;

    try {
        const res = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, content })
        });

        if (res.ok) {
            document.getElementById('post-content').value = '';
            loadFeed();
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleLike(postId, btn) {
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        const data = await res.json();

        if (res.ok) {
            btn.innerHTML = data.isLiked ? '❤️ ' + data.likes : '🤍 ' + data.likes;
            if (data.isLiked) btn.classList.add('liked');
            else btn.classList.remove('liked');
        }
    } catch (err) {
        console.error(err);
    }
}

function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    section.classList.toggle('open');
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value;
    if (!text) return;

    try {
        const res = await fetch(`${API_BASE}/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, text })
        });
        const comment = await res.json();

        if (res.ok) {
            input.value = '';
            const list = document.getElementById(`comments-list-${postId}`);
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            commentEl.innerHTML = `<strong>${comment.username}</strong>: ${comment.text}`;
            list.appendChild(commentEl);
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleFollow() {
    if (!currentProfileId) return;

    try {
        const res = await fetch(`${API_BASE}/users/${currentProfileId}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: currentUser.id })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('profile-followers').textContent = data.followersCount;
            // Ideally update button text here
            const btn = document.getElementById('follow-btn');
            btn.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
        }
    } catch (err) {
        console.error(err);
    }
}

// --- UI Helpers ---

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';

    const isLiked = post.likes.includes(currentUser.id);

    // Comments HTML
    const commentsHtml = post.comments.map(c =>
        `<div class="comment"><strong>${c.username}</strong>: ${c.text}</div>`
    ).join('');

    div.innerHTML = `
        <div class="post-header">
            <span class="username" onclick="loadProfile(${post.userId})">@${post.username}</span>
            <span class="timestamp">${new Date(post.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id}, this)">
                ${isLiked ? '❤️' : '🤍'} ${post.likes.length}
            </button>
            <button class="action-btn" onclick="toggleComments(${post.id})">
                💬 Comment
            </button>
        </div>
        
        <div id="comments-${post.id}" class="comments-section">
            <div id="comments-list-${post.id}">
                ${commentsHtml}
            </div>
            <div class="add-comment-box">
                <input type="text" id="comment-input-${post.id}" placeholder="Write a comment...">
                <button onclick="addComment(${post.id})">Post</button>
            </div>
        </div>
    `;
    return div;
}
