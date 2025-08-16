#!/usr/bin/env python3
"""
Browsecomp Dataset Loader
Handles downloading and decrypting the Browsecomp benchmark dataset
"""

import base64
import hashlib
import pandas as pd
from typing import List, Dict, Optional


DATASET_URL = "https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv"


def derive_key(password: str, length: int) -> bytes:
    """Derive a fixed-length key from the password using SHA256."""
    hasher = hashlib.sha256()
    hasher.update(password.encode())
    key = hasher.digest()
    return key * (length // len(key)) + key[: length % len(key)]


def decrypt(ciphertext_b64: str, password: str) -> str:
    """Decrypt base64-encoded ciphertext with XOR."""
    encrypted = base64.b64decode(ciphertext_b64)
    key = derive_key(password, len(encrypted))
    decrypted = bytes(a ^ b for a, b in zip(encrypted, key))
    return decrypted.decode()


class BrowsecompDataset:
    def __init__(self, password: Optional[str] = None):
        """
        Initialize the Browsecomp dataset loader.
        
        Args:
            password: Decryption password for the dataset. If None, will try
                     to read from BROWSECOMP_PASSWORD environment variable.
        """
        self.password = password
        if not self.password:
            import os
            self.password = os.environ.get('BROWSECOMP_PASSWORD', '')
        
        self.dataset = None
        
    def load_dataset(self) -> pd.DataFrame:
        """Load and decrypt the Browsecomp dataset."""
        print("Loading Browsecomp dataset...")
        
        try:
            # Download the dataset
            df = pd.read_csv(DATASET_URL)
            print(f"Downloaded {len(df)} encrypted questions")
            
            # Add index column for reference
            df = df.reset_index(drop=True)
            df['question_id'] = df.index + 1
            
            # Check for canary field in dataset (automatic password)
            canary_password = None
            if 'canary' in df.columns and len(df) > 0:
                canary_password = df.iloc[0]['canary']
                print(f"Found canary password in dataset")
            
            # Use provided password or canary from dataset
            decryption_password = self.password or canary_password
            
            if decryption_password:
                print("Decrypting questions...")
                decrypted_rows = []
                
                for idx, row in df.iterrows():
                    try:
                        # Use the canary from the row or the provided password
                        row_canary = row.get('canary', decryption_password)
                        
                        # Decrypt the problem and answer columns
                        row_dict = row.to_dict()
                        
                        if 'problem' in row and pd.notna(row['problem']):
                            row_dict['problem_decrypted'] = decrypt(row['problem'], row_canary)
                            row_dict['problem_encrypted'] = row['problem']
                        else:
                            row_dict['problem_decrypted'] = "[No problem field]"
                        
                        if 'answer' in row and pd.notna(row['answer']):
                            row_dict['answer_decrypted'] = decrypt(row['answer'], row_canary)
                            row_dict['answer_encrypted'] = row['answer']
                        else:
                            row_dict['answer_decrypted'] = ""
                            
                        decrypted_rows.append(row_dict)
                            
                    except Exception as e:
                        print(f"Error decrypting row {idx}: {e}")
                        row_dict = row.to_dict()
                        row_dict['problem_decrypted'] = f"[Decryption failed: {str(e)}]"
                        row_dict['answer_decrypted'] = ""
                        decrypted_rows.append(row_dict)
                
                df = pd.DataFrame(decrypted_rows)
                print(f"Successfully decrypted {len(df)} questions")
            else:
                print("Warning: No password provided and no canary found, questions remain encrypted")
                df['problem_decrypted'] = df.get('problem', '')
                df['answer_decrypted'] = df.get('answer', '')
            
            # Normalize column names for consistency
            df = self._normalize_columns(df)
            
            # Add difficulty level (all Browsecomp questions are considered level 1)
            df['task'] = 1
            
            self.dataset = df
            return df
            
        except Exception as e:
            print(f"Error loading dataset: {e}")
            raise
    
    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize column names to match expected format."""
        # Map Browsecomp columns to standard format
        column_mapping = {
            'problem_decrypted': 'question',
            'problem': 'question_encrypted',
            'answer_decrypted': 'true_answer',
            'answer': 'true_answer_encrypted',
            'question_id': 'question_id'
        }
        
        # Apply renaming
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns:
                df = df.rename(columns={old_col: new_col})
        
        # Ensure required columns exist
        if 'question' not in df.columns:
            if 'problem_decrypted' in df.columns:
                df['question'] = df['problem_decrypted']
            else:
                raise ValueError("No question column found in dataset")
        
        if 'true_answer' not in df.columns:
            if 'answer_decrypted' in df.columns:
                df['true_answer'] = df['answer_decrypted']
            elif 'answer' in df.columns:
                df['true_answer'] = df['answer']
            else:
                print("Warning: No answer column found, setting empty answers")
                df['true_answer'] = ''
        
        return df
    
    def get_questions(self, 
                     indices: Optional[List[int]] = None,
                     limit: Optional[int] = None) -> pd.DataFrame:
        """
        Get specific questions from the dataset.
        
        Args:
            indices: List of question numbers (1-based) to retrieve
            limit: Maximum number of questions to return
            
        Returns:
            DataFrame with selected questions
        """
        if self.dataset is None:
            self.load_dataset()
        
        df = self.dataset.copy()
        
        # Filter by specific indices if provided
        if indices:
            # Convert to 0-based indexing
            zero_based_indices = [i - 1 for i in indices if i > 0]
            valid_indices = [i for i in zero_based_indices if i < len(df)]
            
            if not valid_indices:
                print(f"No valid question indices found. Available range: 1-{len(df)}")
                return pd.DataFrame()
            
            df = df.iloc[valid_indices]
        
        # Apply limit if specified
        if limit and not indices:
            df = df.head(limit)
        
        return df
    
    def list_questions(self, limit: int = 20) -> None:
        """Display available questions."""
        if self.dataset is None:
            self.load_dataset()
        
        print(f"\nAvailable Browsecomp questions (showing first {limit}):")
        print("=" * 80)
        
        for idx in range(min(limit, len(self.dataset))):
            row = self.dataset.iloc[idx]
            question = row.get('question', row.get('problem_decrypted', '[Encrypted]'))
            
            # Truncate long questions
            if isinstance(question, str):
                question_preview = question[:60] + "..." if len(question) > 60 else question
            else:
                question_preview = "[No question text]"
                
            print(f"#{idx + 1:3d} {question_preview}")
        
        if len(self.dataset) > limit:
            print(f"\n... and {len(self.dataset) - limit} more questions")
        
        print(f"\nTotal: {len(self.dataset)} questions")
        
        # Check if questions are actually decrypted
        if len(self.dataset) > 0:
            first_question = self.dataset.iloc[0].get('question', '')
            if not first_question or first_question.startswith('['):
                print("⚠️  Questions are encrypted. Set BROWSECOMP_PASSWORD to decrypt.")
            else:
                print("✓ Questions are decrypted and ready to use")


def test_dataset_loading():
    """Test the dataset loading functionality."""
    dataset = BrowsecompDataset()
    
    try:
        df = dataset.load_dataset()
        print(f"\n✓ Loaded {len(df)} questions")
        print(f"Columns: {list(df.columns)}")
        
        # Show first question
        if len(df) > 0:
            first = df.iloc[0]
            print(f"\nFirst question (truncated):")
            question_text = str(first.get('question', ''))
            print(f"  Question: {question_text[:100]}...")
            print(f"  Answer: {first.get('true_answer', 'N/A')}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    return True


if __name__ == "__main__":
    test_dataset_loading()