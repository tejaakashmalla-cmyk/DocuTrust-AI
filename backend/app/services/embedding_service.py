"""
app/services/embedding_service.py
---------------------------------
SentenceTransformer embedding service.
"""

from sentence_transformers import SentenceTransformer


class EmbeddingService:

    def __init__(self):
        print("Loading embedding model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded.")

    def embed_text(self, text: str):
        return self.model.encode(
            text,
            normalize_embeddings=True,
        ).tolist()

    def embed_batch(self, texts):
        return self.model.encode(
            texts,
            normalize_embeddings=True,
        ).tolist()

    def embed_query(self, query: str):
        return self.model.encode(
            query,
            normalize_embeddings=True,
        ).tolist()


embedding_service = EmbeddingService()