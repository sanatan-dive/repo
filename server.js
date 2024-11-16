const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./initDb'); // Import the database

const app = express();
const SECRET_KEY = 'your_secret_key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to authenticate requests
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'Access denied. No token provided.' });

    try {
        // Remove the "Bearer " prefix from the token if present
        const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;

        const decoded = jwt.verify(tokenWithoutBearer, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

// Routes

// User registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        (err) => {
            if (err) return res.status(400).json({ message: 'Username already exists.' });
            res.status(201).json({ message: 'User registered successfully!' });
        }
    );
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ token });
    });
});

// Create a new blog post
app.post('/posts', authenticate, (req, res) => {
    const { title, content } = req.body;
    db.run(
        'INSERT INTO posts (userId, title, content) VALUES (?, ?, ?)',
        [req.user.id, title, content],
        function (err) {
            if (err) return res.status(400).json({ message: 'Error creating post.' });
            res.status(201).json({ id: this.lastID, title, content, likes: 0 });
        }
    );
});

// Fetch all blog posts with author info and comments
app.get('/posts', (req, res) => {
    db.all(
        `SELECT posts.*, users.username AS author,
                GROUP_CONCAT(comments.content) AS comments
         FROM posts 
         JOIN users ON posts.userId = users.id
         LEFT JOIN comments ON posts.id = comments.postId
         GROUP BY posts.id
         ORDER BY posts.id DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(400).json({ message: 'Error fetching posts.' });

            // Map through the posts and prepare the comments
            const posts = rows.map(post => {
                const comments = post.comments ? post.comments.split(',') : [];
                return { ...post, comments };
            });

            res.status(200).json(posts);
        }
    );
});

// Add a comment to a post
app.post('/posts/:id/comments', authenticate, (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    db.run(
        'INSERT INTO comments (postId, userId, content) VALUES (?, ?, ?)',
        [id, req.user.id, content],
        function (err) {
            if (err) return res.status(400).json({ message: 'Error adding comment.' });

            // Send back the new comment
            const newComment = { content };
            res.status(201).json(newComment);
        }
    );
});

// Like a post (One like per user)
app.post('/posts/:id/like', authenticate, (req, res) => {
    const { id } = req.params;

    // Check if the user has already liked the post
    db.get('SELECT * FROM likes WHERE userId = ? AND postId = ?', [req.user.id, id], (err, row) => {
        if (err) return res.status(400).json({ message: 'Error checking like status.' });

        if (row) {
            // User has already liked this post
            return res.status(400).json({ message: 'You have already liked this post.' });
        }

        // If not, add a new like record
        db.run('INSERT INTO likes (userId, postId) VALUES (?, ?)', [req.user.id, id], (err) => {
            if (err) return res.status(400).json({ message: 'Error liking post.' });

            // Increment the likes count for the post
            db.run('UPDATE posts SET likes = likes + 1 WHERE id = ?', [id], (err) => {
                if (err) return res.status(400).json({ message: 'Error updating likes count.' });

                // Return the updated like count
                db.get('SELECT likes FROM posts WHERE id = ?', [id], (err, row) => {
                    if (err) return res.status(400).json({ message: 'Error fetching like count.' });
                    res.status(200).json({ message: 'Post liked!', likes: row.likes });
                });
            });
        });
    });
});

// Check if the user has already liked the post
app.get('/posts/:id/liked', authenticate, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM likes WHERE userId = ? AND postId = ?', [req.user.id, id], (err, row) => {
        if (err) return res.status(400).json({ message: 'Error checking like status.' });
        res.status(200).json({ liked: !!row });
    });
});

// Delete a blog post (Only the author can delete their own post)
app.delete('/posts/:id', authenticate, (req, res) => {
    const { id } = req.params;

    // Check if the post belongs to the authenticated user
    db.get('SELECT * FROM posts WHERE id = ? AND userId = ?', [id, req.user.id], (err, post) => {
        if (err || !post) {
            return res.status(403).json({ message: 'You can only delete your own posts.' });
        }

        // Delete the post
        db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
            if (err) {
                return res.status(400).json({ message: 'Error deleting post.' });
            }
            res.status(200).json({ message: 'Post deleted successfully!' });
        });
    });
});

// Server setup
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
