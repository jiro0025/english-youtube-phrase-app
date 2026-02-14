#%%
import sqlite3
import pandas as pd
import hashlib

DB_NAME = "phrases.db"

#%%
def init_db():
    """Initialize database with users and phrases tables"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Phrases table with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS phrases (
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
    
    conn.commit()
    conn.close()

#%%
def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

#%%
def create_user(username, password):
    """Create a new user account"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        password_hash = hash_password(password)
        c.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                  (username, password_hash))
        conn.commit()
        return True, "Account created successfully!"
    except sqlite3.IntegrityError:
        return False, "Username already exists."
    finally:
        conn.close()

#%%
def authenticate_user(username, password):
    """Authenticate user and return user_id if successful"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    password_hash = hash_password(password)
    c.execute('SELECT id FROM users WHERE username = ? AND password_hash = ?', 
              (username, password_hash))
    result = c.fetchone()
    conn.close()
    
    if result:
        return True, result[0]  # Returns (success, user_id)
    else:
        return False, None

#%%
def add_phrase(user_id, phrase, meaning, youtube_url, timestamp=0):
    """Add a phrase for a specific user"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        INSERT INTO phrases (user_id, phrase, meaning, youtube_url, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, phrase, meaning, youtube_url, timestamp))
    conn.commit()
    conn.close()

#%%
def get_unlearned_phrases(user_id):
    """Get unlearned phrases for a specific user"""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query(
        "SELECT * FROM phrases WHERE user_id = ? AND is_learned = 0", 
        conn, params=(user_id,))
    conn.close()
    return df

#%%
def get_all_phrases(user_id):
    """Get all phrases for a specific user"""
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query(
        "SELECT * FROM phrases WHERE user_id = ? ORDER BY created_at DESC", 
        conn, params=(user_id,))
    conn.close()
    return df

#%%
def mark_as_learned(phrase_id, user_id):
    """Mark a phrase as learned (with user verification)"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "UPDATE phrases SET is_learned = 1 WHERE id = ? AND user_id = ?", 
        (phrase_id, user_id))
    conn.commit()
    conn.close()

#%%
def import_phrases_from_df(user_id, df):
    """Imports phrases from a pandas DataFrame for a specific user.
    Expected columns: 'phrase', 'meaning'
    """
    conn = sqlite3.connect(DB_NAME)
    # Ensure columns exist in the DataFrame
    if 'phrase' not in df.columns or 'meaning' not in df.columns:
        raise ValueError("CSV must contain 'phrase' and 'meaning' columns.")
    
    # Add user_id and default values
    df['user_id'] = user_id
    if 'youtube_url' not in df.columns:
        df['youtube_url'] = ""
    if 'timestamp' not in df.columns:
        df['timestamp'] = 0
    
    # Use pandas to append to SQL
    df[['user_id', 'phrase', 'meaning', 'youtube_url', 'timestamp']].to_sql(
        'phrases', conn, if_exists='append', index=False)
    conn.close()

#%%
def clear_all_phrases(user_id):
    """Deletes all phrases for a specific user (Use with caution)."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

#%%
def delete_phrase(phrase_id, user_id):
    """Delete a phrase (with user verification)"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases WHERE id = ? AND user_id = ?", (phrase_id, user_id))
    conn.commit()
    conn.close()

#%%
def reset_all_progress(user_id):
    """Resets 'is_learned' to 0 for all phrases of a specific user."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE phrases SET is_learned = 0 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

#%%
def delete_learned_phrases(user_id):
    """Deletes all phrases marked as learned for a specific user."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases WHERE is_learned = 1 AND user_id = ?", (user_id,))
    conn.commit()
    conn.close()
