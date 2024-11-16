const sqlite3 = require('sqlite3').verbose();

// Open the SQLite database (it will be created if it doesn't exist)
const db = new sqlite3.Database('./blog.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create tables if they do not already exist
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `);

    // Posts table
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            FOREIGN KEY (userId) REFERENCES users (id)
        );
    `);

    // Comments table
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            postId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY (postId) REFERENCES posts (id),
            FOREIGN KEY (userId) REFERENCES users (id)
        );
    `);

    // Likes table
    db.run(`
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            postId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            FOREIGN KEY (postId) REFERENCES posts (id),
            FOREIGN KEY (userId) REFERENCES users (id)
        );
    `);
});

module.exports = db;
