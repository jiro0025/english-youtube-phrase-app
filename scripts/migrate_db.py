"""
Database migration script to add user support to existing database
"""
import sqlite3
import os

DB_NAME = "phrases.db"

def migrate_database():
    """Migrate existing database to support multi-user"""
    
    if not os.path.exists(DB_NAME):
        print("No existing database found. Run the app to create a new one.")
        return
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Check if users table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not c.fetchone():
        print("Creating users table...")
        c.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create a default user for existing data
        import hashlib
        default_password = hashlib.sha256("password123".encode()).hexdigest()
        c.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                  ('default_user', default_password))
        default_user_id = c.lastrowid
        print(f"Created default user (username: 'default_user', password: 'password123')")
    else:
        # Get the first user ID
        c.execute('SELECT id FROM users LIMIT 1')
        result = c.fetchone()
        if result:
            default_user_id = result[0]
        else:
            print("Error: Users table exists but no users found!")
            conn.close()
            return
    
    # Check if user_id column exists in phrases table
    c.execute("PRAGMA table_info(phrases)")
    columns = [column[1] for column in c.fetchall()]
    
    if 'user_id' not in columns:
        print("Adding user_id column to phrases table...")
        
        # SQLite doesn't support adding foreign keys to existing tables easily
        # So we need to recreate the table
        
        # 1. Rename old table
        c.execute('ALTER TABLE phrases RENAME TO phrases_old')
        
        # 2. Create new table with user_id
        c.execute('''
            CREATE TABLE phrases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                phrase TEXT NOT NULL,
                meaning TEXT,
                youtube_url TEXT,
                timestamp INTEGER,
                is_learned BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # 3. Copy data from old table to new table (assign to default user)
        c.execute(f'''
            INSERT INTO phrases (id, user_id, phrase, meaning, youtube_url, timestamp, is_learned, created_at)
            SELECT id, {default_user_id}, phrase, meaning, youtube_url, timestamp, is_learned, created_at
            FROM phrases_old
        ''')
        
        # 4. Drop old table
        c.execute('DROP TABLE phrases_old')
        
        print(f"Migration complete! All existing phrases assigned to user ID {default_user_id}")
    else:
        print("Database already has user_id column. No migration needed.")
    
    conn.commit()
    conn.close()
    print("\n✅ Migration successful!")
    print("You can now log in with:")
    print("  Username: default_user")
    print("  Password: password123")

if __name__ == "__main__":
    migrate_database()
