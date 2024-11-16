const apiUrl = 'http://localhost:3000';
let token = getTokenFromCookies();

// Function to decode the JWT token
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload);
        return JSON.parse(decodedPayload);
    } catch (error) {
        return null;
    }
}

// Function to check if the token is expired
function isTokenExpired(token) {
    const decodedToken = decodeToken(token);
    if (!decodedToken) return true;

    const exp = decodedToken.exp;
    const now = Math.floor(Date.now() / 1000);
    return exp < now; // Check if the expiration time is before the current time
}

// Show or hide sections
function showHomePage() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('blogApp').style.display = 'none';
}

function showBlogPage() {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('blogApp').style.display = 'block';
    fetchPosts();
}

// Logout the user
function logout() {
    // Remove token from cookies
    document.cookie = "token=;expires=Thu, 01 Jan 1970 00:00:00 GMT"; // Clear token cookie
    
    // Hide the blog app and show login page
    document.getElementById('blogApp').style.display = 'none';
    document.getElementById('homePage').style.display = 'block';
    
    alert('Session expired. Please log in again.');
    window.location.reload();
}

// Check if user is authenticated
function checkAuth() {
    const token = getTokenFromCookies();
    if (token && !isTokenExpired(token)) {
        document.getElementById('homePage').style.display = 'none';
        document.getElementById('blogApp').style.display = 'block';
        fetchPosts();
    } else {
        logout();
    }
}

// Get token from cookies
function getTokenFromCookies() {
    const name = 'token=';
    const decodedCookies = decodeURIComponent(document.cookie);
    const ca = decodedCookies.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return '';
}

// Register new user
async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in both fields.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            alert('Registered successfully!');
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Registration failed.');
        }
    } catch (error) {
        alert('Error registering user. Please try again.');
        console.error(error);
    }
}

// Login user
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in both fields.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            document.cookie = `token=${token};path=/`;  // Store token as cookie
            alert('Logged in successfully!');
            window.location.reload();
        } else {
            alert(data.message || 'Login failed.');
        }
    } catch (error) {
        alert('Error logging in. Please try again.');
        console.error(error);
    }
}

// Create a post
async function createPost() {
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;

    if (!title || !content) {
        alert('Please fill in both title and content.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title, content }),
        });

        if (response.ok) {
            alert('Blog post created successfully!');
            fetchPosts();
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to create post.');
        }
    } catch (error) {
        alert('Error creating post. Please try again.');
        console.error('Error in createPost:', error);
    }
}

// Fetch posts from the server
async function fetchPosts() {
    const token = getTokenFromCookies();
    if (isTokenExpired(token)) {
        logout();  // Logout if the token is expired
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            logout();  // Token is invalid, log the user out
            return;
        }

        const posts = await response.json();
        const postList = document.getElementById('postList');
        postList.innerHTML = '';

        if (posts.length === 0) {
            document.getElementById('noPosts').style.display = 'block';
        } else {
            document.getElementById('noPosts').style.display = 'none';
        }

        posts.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.classList.add('post');
            postDiv.innerHTML = `
                <h4>${post.title}</h4>
                <p><strong>Author:</strong> ${post.author}</p>
                <p>${post.content}</p>
                <button onclick="likePost(${post.id})">Like</button>
                <h5>Comments</h5>
                <textarea id="comment_${post.id}" placeholder="Add a comment"></textarea>
                <button onclick="addComment(${post.id})">Comment</button>
                <div id="comments_${post.id}" class="comments-list">
                    ${post.comments.map(comment => `<p>${comment.content}</p>`).join('')}
                </div>
            `;
            postList.appendChild(postDiv);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        alert('Error fetching posts. Please try again.');
    }
}

// Add comment to post
async function addComment(postId) {
    const content = document.getElementById(`comment_${postId}`).value;
    if (!content) {
        alert('Please add a comment.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });

        if (response.ok) {
            alert('Comment added!');
            fetchPosts();  // Refresh posts with new comments
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to add comment.');
        }
    } catch (error) {
        alert('Error adding comment. Please try again.');
        console.error(error);
    }
}

// Like post
async function likePost(postId) {
    try {
        const response = await fetch(`${apiUrl}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            alert('Liked post!');
            fetchPosts();  // Refresh posts with updated like count
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to like post.');
        }
    } catch (error) {
        alert('Error liking post. Please try again.');
        console.error(error);
    }
}

checkAuth(); // Check authentication status on page load
