#%%
import streamlit as st
import pandas as pd
import hashlib
from supabase import create_client

#%%
@st.cache_resource
def get_supabase_client():
    """Initialize and return Supabase client (cached)"""
    url = st.secrets["supabase"]["url"]
    key = st.secrets["supabase"]["key"]
    return create_client(url, key)

#%%
def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

#%%
def create_user(username, password):
    """Create a new user account"""
    supabase = get_supabase_client()
    try:
        password_hash = hash_password(password)
        result = supabase.table("users").insert({
            "username": username,
            "password_hash": password_hash
        }).execute()
        return True, "Account created successfully!"
    except Exception as e:
        if "duplicate key" in str(e) or "unique" in str(e).lower():
            return False, "Username already exists."
        return False, f"Error: {e}"

#%%
def authenticate_user(username, password):
    """Authenticate user and return user_id if successful"""
    supabase = get_supabase_client()
    password_hash = hash_password(password)
    result = supabase.table("users").select("id").eq(
        "username", username
    ).eq(
        "password_hash", password_hash
    ).execute()
    
    if result.data:
        return True, result.data[0]["id"]
    else:
        return False, None

#%%
def add_phrase(user_id, phrase, meaning, youtube_url, timestamp=0):
    """Add a phrase for a specific user"""
    supabase = get_supabase_client()
    supabase.table("phrases").insert({
        "user_id": user_id,
        "phrase": phrase,
        "meaning": meaning,
        "youtube_url": youtube_url or "",
        "timestamp": timestamp
    }).execute()

#%%
def get_unlearned_phrases(user_id):
    """Get unlearned phrases for a specific user"""
    supabase = get_supabase_client()
    result = supabase.table("phrases").select("*").eq(
        "user_id", user_id
    ).eq(
        "is_learned", False
    ).execute()
    
    df = pd.DataFrame(result.data) if result.data else pd.DataFrame()
    return df

#%%
def get_all_phrases(user_id):
    """Get all phrases for a specific user"""
    supabase = get_supabase_client()
    result = supabase.table("phrases").select("*").eq(
        "user_id", user_id
    ).order(
        "created_at", desc=True
    ).execute()
    
    df = pd.DataFrame(result.data) if result.data else pd.DataFrame()
    return df

#%%
def mark_as_learned(phrase_id, user_id):
    """Mark a phrase as learned (with user verification)"""
    supabase = get_supabase_client()
    supabase.table("phrases").update(
        {"is_learned": True}
    ).eq(
        "id", phrase_id
    ).eq(
        "user_id", user_id
    ).execute()

#%%
def import_phrases_from_df(user_id, df):
    """Imports phrases from a pandas DataFrame for a specific user.
    Expected columns: 'phrase', 'meaning'
    """
    if 'phrase' not in df.columns or 'meaning' not in df.columns:
        raise ValueError("CSV must contain 'phrase' and 'meaning' columns.")
    
    supabase = get_supabase_client()
    
    records = []
    for _, row in df.iterrows():
        record = {
            "user_id": user_id,
            "phrase": str(row["phrase"]) if pd.notna(row["phrase"]) else "",
            "meaning": str(row["meaning"]) if pd.notna(row["meaning"]) else "",
            "youtube_url": str(row.get("youtube_url", "")) if pd.notna(row.get("youtube_url", "")) else "",
            "timestamp": int(row.get("timestamp", 0)) if pd.notna(row.get("timestamp", 0)) else 0,
        }
        records.append(record)
    
    # Supabase supports batch insert
    if records:
        supabase.table("phrases").insert(records).execute()

#%%
def clear_all_phrases(user_id):
    """Deletes all phrases for a specific user (Use with caution)."""
    supabase = get_supabase_client()
    supabase.table("phrases").delete().eq("user_id", user_id).execute()

#%%
def delete_phrase(phrase_id, user_id):
    """Delete a phrase (with user verification)"""
    supabase = get_supabase_client()
    supabase.table("phrases").delete().eq(
        "id", phrase_id
    ).eq(
        "user_id", user_id
    ).execute()

#%%
def reset_all_progress(user_id):
    """Resets 'is_learned' to False for all phrases of a specific user."""
    supabase = get_supabase_client()
    supabase.table("phrases").update(
        {"is_learned": False}
    ).eq(
        "user_id", user_id
    ).execute()

#%%
def delete_learned_phrases(user_id):
    """Deletes all phrases marked as learned for a specific user."""
    supabase = get_supabase_client()
    supabase.table("phrases").delete().eq(
        "is_learned", True
    ).eq(
        "user_id", user_id
    ).execute()
