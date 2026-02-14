#%%
import streamlit as st
import database as db
import pandas as pd
from gtts import gTTS
import os
import tempfile
import time

# Initialize DB
db.init_db()

#%%
st.set_page_config(page_title="My English Phrases", page_icon="📖")

#%%
# Session state initialization
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'user_id' not in st.session_state:
    st.session_state.user_id = None
if 'username' not in st.session_state:
    st.session_state.username = None

#%%
def login_page():
    """Display login/signup page"""
    st.title("English Phrase Manager 📖")
    st.write("ログインまたは新規アカウント作成してください")
    
    tab1, tab2 = st.tabs(["ログイン", "新規登録"])
    
    with tab1:
        st.subheader("ログイン")
        with st.form("login_form"):
            username = st.text_input("ユーザー名")
            password = st.text_input("パスワード", type="password")
            submit = st.form_submit_button("ログイン")
            
            if submit:
                if username and password:
                    success, user_id = db.authenticate_user(username, password)
                    if success:
                        st.session_state.logged_in = True
                        st.session_state.user_id = user_id
                        st.session_state.username = username
                        st.success(f"ようこそ、{username}さん！")
                        st.rerun()
                    else:
                        st.error("ユーザー名またはパスワードが間違っています")
                else:
                    st.warning("ユーザー名とパスワードを入力してください")
    
    with tab2:
        st.subheader("新規アカウント作成")
        with st.form("signup_form"):
            new_username = st.text_input("ユーザー名（半角英数字）")
            new_password = st.text_input("パスワード", type="password")
            confirm_password = st.text_input("パスワード（確認）", type="password")
            submit_signup = st.form_submit_button("アカウント作成")
            
            if submit_signup:
                if new_username and new_password and confirm_password:
                    if new_password != confirm_password:
                        st.error("パスワードが一致しません")
                    elif len(new_password) < 4:
                        st.error("パスワードは4文字以上にしてください")
                    else:
                        success, message = db.create_user(new_username, new_password)
                        if success:
                            st.success(message)
                            st.info("ログインタブからログインしてください")
                        else:
                            st.error(message)
                else:
                    st.warning("全ての項目を入力してください")

#%%
def main_app():
    """Main application after login"""
    st.title(f"English Phrase Manager 📖")
    
    # Sidebar with logout
    with st.sidebar:
        st.write(f"👤 ログイン中: **{st.session_state.username}**")
        if st.button("ログアウト"):
            st.session_state.logged_in = False
            st.session_state.user_id = None
            st.session_state.username = None
            st.rerun()
        st.divider()
    
    menu = ["Review Mode", "Radio Mode", "Add Phrase", "Data Import", "All Phrases", "Manage Data"]
    choice = st.sidebar.selectbox("Menu", menu)
    
    user_id = st.session_state.user_id
    
    #%%
    if choice == "Add Phrase":
        st.header("Add New Phrase")
        with st.form("add_form"):
            phrase = st.text_input("English Phrase", placeholder="e.g. piece of cake")
            meaning = st.text_input("Meaning (Japanese)", placeholder="e.g. 朝飯前")
            url = st.text_input("YouTube URL", placeholder="https://youtu.be/...")
            timestamp = st.number_input("Timestamp (seconds)", min_value=0, step=1)
            
            submitted = st.form_submit_button("Add Phrase")
            if submitted:
                if phrase:
                    db.add_phrase(user_id, phrase, meaning, url, timestamp)
                    st.success(f"Added successfully: **{phrase}**")
                else:
                    st.error("Please enter a phrase.")
    
    #%%
    elif choice == "Data Import":
        st.header("Data Import (CSV)")
        st.write("CSVファイルをアップロードしてください（例: No, 英文, 日本語訳）")
        
        uploaded_file = st.file_uploader("Choose a CSV file", type="csv")
        
        if uploaded_file is not None:
            try:
                df = pd.read_csv(uploaded_file)
                st.write("Preview:")
                st.dataframe(df.head())
                
                # Column mapping
                cols = df.columns.tolist()
                phrase_col = st.selectbox("Select 'English Phrase' column", cols, index=1 if len(cols) > 1 else 0)
                meaning_col = st.selectbox("Select 'Japanese Meaning' column", cols, index=2 if len(cols) > 2 else 0)
                
                if st.button("Import Data"):
                    # Rename columns for the DB function
                    import_df = df.rename(columns={phrase_col: 'phrase', meaning_col: 'meaning'})
                    
                    # Optional: clear existing data
                    if st.checkbox("Delete existing data before import?"):
                        db.clear_all_phrases(user_id)
                    
                    db.import_phrases_from_df(user_id, import_df)
                    st.success(f"Successfully imported {len(df)} phrases!")
            except Exception as e:
                st.error(f"Error: {e}")
    
    #%%
    elif choice == "Review Mode":
        st.header("Review Mode (Unlearned)")
        st.caption("Mark phrases as learned to hide them from this list.")
        
        df = db.get_unlearned_phrases(user_id)
        
        if df.empty:
            st.success("🎉 No phrases to review! You've learned everything.")
        else:
            # Display as cards
            for index, row in df.iterrows():
                with st.container():
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.subheader(row['phrase'])
                        st.write(f"**Meaning:** {row['meaning']}")
                        if row['youtube_url']:
                            url = row['youtube_url']
                            if row['timestamp'] > 0:
                                if "youtu.be" in url:
                                    url += f"?t={row['timestamp']}"
                                elif "?" in url:
                                    url += f"&t={row['timestamp']}"
                                else:
                                    url += f"?t={row['timestamp']}"
                            st.markdown(f"[Watch Video]({url})", unsafe_allow_html=True)
                    with col2:
                        st.write("") # Spacer
                        if st.button("✅ Learned", key=f"learn_{row['id']}"):
                            db.mark_as_learned(row['id'], user_id)
                            st.balloons()
                            st.rerun()
                    st.divider()
    
    #%%
    elif choice == "Radio Mode":
        st.header("Radio Mode 📻")
        st.write("未学習のフレーズを再生します（英語×2 → 日本語×1）。完了済みのものは除外されます。")
        
        df = db.get_unlearned_phrases(user_id)
        
        if df.empty:
            st.success("🎉 再生するフレーズがありません！すべて学習済みです。")
        else:
            st.write(f"対象フレーズ数: {len(df)}件")
            if len(df) > 1:
                limit = st.slider("再生する件数（多すぎると生成に時間がかかります）", 1, len(df), min(10, len(df)))
            else:
                limit = 1
            
            if st.button("ラジオ生成スタート"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                try:
                    # Use a subset of data
                    target_df = df.head(limit)
                    
                    # Collect all audio data in memory
                    audio_data = b''
                    
                    for i, (index, row) in enumerate(target_df.iterrows()):
                        status_text.text(f"Generating audio for: {row['phrase']} ({i+1}/{limit})")
                        
                        # 1. English x 2
                        tts_en = gTTS(text=str(row['phrase']), lang='en')
                        t_en = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                        tts_en.save(t_en.name)
                        
                        # Read En data
                        with open(t_en.name, 'rb') as f:
                            en_data = f.read()
                            audio_data += en_data  # 1st
                            audio_data += en_data  # 2nd
                        
                        os.unlink(t_en.name)  # Clean up
                        
                        # 2. Japanese x 1
                        meaning_text = str(row['meaning']) if row['meaning'] else "意味なし"
                        tts_ja = gTTS(text=meaning_text, lang='ja')
                        t_ja = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                        tts_ja.save(t_ja.name)
                        
                        with open(t_ja.name, 'rb') as f:
                            audio_data += f.read()
                        
                        os.unlink(t_ja.name)  # Clean up
                        
                        progress_bar.progress((i + 1) / limit)
                    
                    status_text.text("Generation Complete!")
                    
                    # Use HTML audio tag with base64 for iOS compatibility
                    import base64
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    audio_html = f'''
                    <div style="margin: 20px 0;">
                        <audio controls style="width: 100%;">
                            <source src="data:audio/mp3;base64,{audio_base64}" type="audio/mp3">
                            お使いのブラウザは音声再生に対応していません。
                        </audio>
                    </div>
                    '''
                    st.markdown(audio_html, unsafe_allow_html=True)
                    st.info("↑ 上のプレイヤーの再生ボタンを押してください。")
                    
                except Exception as e:
                    st.error(f"エラーが発生しました: {e}")
    
    #%%
    elif choice == "All Phrases":
        st.header("All Phrases List")
        df = db.get_all_phrases(user_id)
        if not df.empty:
            st.dataframe(df)
        else:
            st.info("No phrases found.")
    
    #%%
    elif choice == "Manage Data":
        st.header("Manage Data ⚙️")
        
        st.subheader("⚠️ Danger Zone")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Reset Learning Progress**")
            st.caption("全てのフレーズを「未学習」に戻します。データは削除されません。")
            if st.button("Reset Progress"):
                db.reset_all_progress(user_id)
                st.success("Reset complete!")
                
        with col2:
            st.write("**Delete ALL Data**")
            st.caption("全てのデータを削除します。この操作は取り消せません。")
            if st.checkbox("I understand the consequences", key="del_all_check"):
                if st.button("Delete ALL Phrases", type="primary"):
                    db.clear_all_phrases(user_id)
                    st.success("All phrases have been deleted.")
                    st.rerun()
    
        st.divider()
        
        st.subheader("Bulk Delete (Learned Only)")
        st.write("学習済みのフレーズのみを削除します。")
        if st.button("Delete Learned Phrases"):
            db.delete_learned_phrases(user_id)
            st.success("Deleted all learned phrases.")
            st.rerun()

#%%
# Main routing
if st.session_state.logged_in:
    main_app()
else:
    login_page()
