#%%
import sqlite3
import pandas as pd

DB_NAME = "phrases.db"

#%%
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS phrases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phrase TEXT NOT NULL,
            meaning TEXT,
            youtube_url TEXT,
            timestamp INTEGER,
            is_learned BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

#%%
def add_phrase(phrase, meaning, youtube_url, timestamp=0):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        INSERT INTO phrases (phrase, meaning, youtube_url, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (phrase, meaning, youtube_url, timestamp))
    conn.commit()
    conn.close()

#%%
def get_unlearned_phrases():
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("SELECT * FROM phrases WHERE is_learned = 0", conn)
    conn.close()
    return df

#%%
def get_all_phrases():
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("SELECT * FROM phrases ORDER BY created_at DESC", conn)
    conn.close()
    return df

#%%
def mark_as_learned(phrase_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE phrases SET is_learned = 1 WHERE id = ?", (phrase_id,))
    conn.commit()
    conn.close()

#%%
def import_phrases_from_df(df):
    """Imports phrases from a pandas DataFrame.
    Expected columns: 'phrase', 'meaning'
    """
    conn = sqlite3.connect(DB_NAME)
    # Ensure columns exist in the DataFrame
    if 'phrase' not in df.columns or 'meaning' not in df.columns:
        raise ValueError("CSV must contain 'phrase' and 'meaning' columns.")
    
    # Add timestamps and default values if missing
    if 'youtube_url' not in df.columns:
        df['youtube_url'] = ""
    if 'timestamp' not in df.columns:
        df['timestamp'] = 0
    
    # Use pandas to append to SQL
    df[['phrase', 'meaning', 'youtube_url', 'timestamp']].to_sql('phrases', conn, if_exists='append', index=False)
    conn.close()

#%%
def clear_all_phrases():
    """Deletes all phrases from the database (Use with caution)."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases")
    conn.commit()
    conn.close()

#%%
def delete_phrase(phrase_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases WHERE id = ?", (phrase_id,))
    conn.commit()
    conn.close()

#%%
def reset_all_progress():
    """Resets 'is_learned' to 0 for all phrases."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE phrases SET is_learned = 0")
    conn.commit()
    conn.close()

#%%
def delete_learned_phrases():
    """Deletes all phrases marked as learned."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM phrases WHERE is_learned = 1")
    conn.commit()
    conn.close()
