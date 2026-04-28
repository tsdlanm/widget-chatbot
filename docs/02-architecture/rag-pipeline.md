# RAG Pipeline

Dokumen ini memetakan alur RAG dari ingestion sampai answer generation pada `packages/backend/convex/knowledge.ts` dan `packages/backend/convex/messages.ts`.

## 1) Ingestion Pipeline (Admin-triggered)

```mermaid
flowchart TD
    A[Admin input URL di dashboard] --> B[knowledge.searchAndEmbed action]
    B --> C[Call Firecrawl /v2/crawl]
    C --> D[Polling status crawl]
    D --> E[Extract markdown per halaman]
    E --> F[chunkText per ~1000 tokens]
    F --> G[Batch chunks: 4 per batch]
    G --> H[Delay 8 detik antar batch]
    H --> I[Gemini embedContent model gemini-embedding-001]
    I --> J[knowledgeData.saveKnowledge internalMutation]
    J --> K[(knowledge table + vector index)]
```

```mermaid
flowchart TD
    A[Admin upload file di dashboard] --> B[knowledgeFiles.generateUploadUrl mutation]
    B --> C[Client upload file ke Convex storage]
    C --> D[knowledge.processUploadedFile action]
    D --> E{Jenis file}
    E -->|PDF| F[pdf-parse extract text]
    E -->|DOCX| G[mammoth extract raw text]
    E -->|Text-like| H[Baca blob.text langsung]
    F --> I[normalize + chunkText]
    G --> I
    H --> I
    I --> J[Gemini embedContent model gemini-embedding-001]
    J --> K[knowledgeData.saveKnowledge internalMutation]
    K --> L[(knowledge table + vector index)]
    D --> M[(knowledgeFiles table status processing/ready/failed)]
```

### Catatan Implementasi

- Crawl depth dibatasi (`maxDiscoveryDepth: 1`) untuk menghindari ledakan jumlah halaman.
- Chunking berbasis paragraf agar konteks tetap natural.
- Batch + delay dipakai untuk menahan risiko rate-limit embedding API.
- Source file dan source website masuk ke vector index `knowledge` yang sama agar retrieval tetap konsisten.
- File teks sederhana seperti `txt`, `md`, `csv`, `tsv`, `json`, `log`, `html`, `xml`, `yaml`, `ini`, `conf`, `env` dibaca tanpa library parsing tambahan.
- PDF diekstrak lokal dengan `pdf-parse`.
- DOCX diekstrak lokal dengan `mammoth`.
- Gemini hanya dipakai untuk embedding, bukan untuk ekstraksi isi file.

## 2) Retrieval + Generation Pipeline (Per Message)

```mermaid
flowchart TD
    A[Widget kirim pesan] --> B[messages.prepareSend]
    B --> C[Validate conversation + chatbot active]
    C --> D[Check rate limit 50 per 1 jam]
    D --> E[Save user message]
    E --> F[messages.send action]

    F --> G[Build context-aware embedding text]
    G --> H[Gemini embedContent]
    H --> I[ctx.vectorSearch knowledge.by_embedding filter chatbotId limit 5]

    I --> J{Top score}
    J -->|> 0.7| K[Ambil chunks score >= 0.5]
    J -->|0.5 - 0.7| L[Ambil 1 chunk teratas]
    J -->|< 0.5| M[Tanpa chunk]

    K --> N[Compose ragSystemPrompt]
    L --> N
    M --> N

    N --> O{aiModel}
    O -->|groq| P[Groq llama-3.3-70b-versatile]
    O -->|deepseek| Q[DO Inference deepseek-r1-distill-llama-70b]

    P --> R[sanitizeAssistantResponse]
    Q --> R

    R --> S[messages.saveResponse]
    S --> T[(messages + chatbot stats + conversation stats)]
    T --> U[Return response ke widget]
```

## 3) Retrieval Decision Logic

Algoritma seleksi context saat vector search:

1. Ambil top result score.
2. Jika `score > 0.7`: aktifkan RAG penuh (beberapa chunk).
3. Jika `0.5 <= score <= 0.7`: context tipis (hanya chunk teratas).
4. Jika `< 0.5`: jangan inject context agar jawaban tetap natural.

Tujuan: menekan hallucination context dan mencegah prompt dipenuhi dokumen yang tidak relevan.

## 4) Defensive Prompting Strategy

Prompt gabungan menggunakan pola:

- system prompt asli chatbot
- instruksi eksplisit "gunakan knowledge hanya jika relevan"
- daftar sumber `Source (url)` berisi chunk

Dampak:

- greeting/small talk tidak dipaksa menjawab dari knowledge
- pertanyaan faktual terkait dokumen tetap bisa ditopang sumber

## 5) Failure Behavior

Jika RAG gagal (embedding atau vector search error):

- pipeline tidak memblokir chat
- sistem fallback ke LLM tanpa custom knowledge
- error dicatat dengan warning log

Ini menjaga chat tetap tersedia walaupun pipeline knowledge sedang bermasalah.

## 6) Modul yang Terlibat

- `packages/backend/convex/knowledge.ts`
- `packages/backend/convex/knowledgeData.ts`
- `packages/backend/convex/knowledgeFiles.ts`
- `packages/backend/convex/messages.ts`
- `packages/backend/convex/schema.ts` (vector index `knowledge.by_embedding`)
