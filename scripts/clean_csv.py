"""
CSVファイルから [1] や [1, 3] などの参照番号を削除するスクリプト
Usage: python scripts/clean_csv.py
"""
import pandas as pd
import re
import os

INPUT_FILE = "examples/_英語の脳を作る・シャドーイング練習530 – 中級編 - シート1.csv"
OUTPUT_FILE = "examples/_英語の脳を作る・シャドーイング練習530 – 中級編 - シート1_cleaned.csv"

def clean_text(text):
    """[1] や [1, 3] などの参照番号を削除する"""
    if pd.isna(text):
        return text
    # [数字] や [数字, 数字] などのパターンを削除
    cleaned = re.sub(r'\s*\[\d+(?:,\s*\d+)*\]\s*', '', str(text))
    return cleaned.strip()

def main():
    print(f"読み込み中: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    
    print(f"処理前の行数: {len(df)}")
    print("処理前のサンプル:")
    print(df.head(3).to_string())
    print()
    
    # 全列に対してクリーニングを適用
    for col in df.columns:
        df[col] = df[col].apply(clean_text)
    
    # 保存
    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    
    print(f"処理後のサンプル:")
    print(df.head(3).to_string())
    print()
    print(f"✅ 完了！保存先: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
