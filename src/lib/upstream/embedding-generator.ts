/**
 * Embedding Generation Utilities
 * Handles text chunking and embedding generation for RAG
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ChunkOptions {
  chunkSize: number
  chunkOverlap: number
  separator: string
}

export interface TextChunk {
  text: string
  embedding?: number[]
  metadata: {
    chunkIndex: number
    totalChunks: number
    sourceFile: string
  }
}

// ============================================================================
// TEXT CHUNKING
// ============================================================================

/**
 * Split text into chunks with overlap
 * Uses semantic splitting based on paragraphs/sections
 */
export function chunkText(text: string, options: ChunkOptions): string[] {
  const { chunkSize, chunkOverlap, separator } = options

  // Split by separator (usually paragraphs)
  const segments = text.split(separator).filter(s => s.trim().length > 0)

  const chunks: string[] = []
  let currentChunk = ''

  for (const segment of segments) {
    const segmentText = segment.trim()

    // If adding this segment would exceed chunk size
    if (
      (currentChunk + separator + segmentText).length > chunkSize &&
      currentChunk
    ) {
      // Save current chunk
      chunks.push(currentChunk.trim())

      // Start new chunk with overlap
      // Keep last N characters for context
      if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
        currentChunk =
          currentChunk.slice(-chunkOverlap) + separator + segmentText
      } else {
        currentChunk = segmentText
      }
    } else {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += separator + segmentText
      } else {
        currentChunk = segmentText
      }
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // Handle case where no chunks were created (text too short)
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim())
  }

  return chunks
}

/**
 * Create chunks with metadata
 */
export function createChunksWithMetadata(
  text: string,
  options: ChunkOptions,
  sourceFile: string
): Omit<TextChunk, 'embedding'>[] {
  const chunks = chunkText(text, options)

  return chunks.map((chunk, index) => ({
    text: chunk,
    metadata: {
      chunkIndex: index,
      totalChunks: chunks.length,
      sourceFile,
    },
  }))
}

// ============================================================================
// EMBEDDING GENERATION (Azure OpenAI)
// ============================================================================

/**
 * Generate embedding for a single text using Azure OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey =
    process.env.AZURE_OPENAI_EMBEDDING_API_KEY ||
    process.env.AZURE_OPENAI_API_KEY
  const endpoint =
    process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT ||
    process.env.AZURE_OPENAI_ENDPOINT
  const apiVersion =
    process.env.AZURE_OPENAI_EMBEDDING_API_VERSION || '2023-05-15'
  const deployment =
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small'

  if (!apiKey || !endpoint) {
    console.warn(
      'Azure OpenAI credentials not configured, returning mock embedding'
    )
    // Return mock embedding for development
    return Array(1536)
      .fill(0)
      .map(() => Math.random())
  }

  try {
    // Azure OpenAI API endpoint format
    const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
        model: deployment,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Azure OpenAI API error:', error)
      throw new Error(`Embedding generation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    // Return mock embedding on error (for development)
    return Array(1536)
      .fill(0)
      .map(() => Math.random())
  }
}

/**
 * Generate embeddings for multiple chunks in batch
 */
export async function generateEmbeddingsForChunks(
  chunks: Omit<TextChunk, 'embedding'>[]
): Promise<TextChunk[]> {
  const results: TextChunk[] = []

  // Process in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    const embeddingPromises = batch.map(async chunk => {
      const embedding = await generateEmbedding(chunk.text)
      return {
        ...chunk,
        embedding,
      }
    })

    const batchResults = await Promise.all(embeddingPromises)
    results.push(...batchResults)

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

// ============================================================================
// VECTOR SIMILARITY
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) {
    return 0
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Find most similar chunks to a query embedding
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: TextChunk[],
  topK: number = 5,
  threshold: number = 0.7
): Array<TextChunk & { similarity: number }> {
  const results = chunks
    .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
    .map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding!),
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  return results
}

// ============================================================================
// SEARCH HELPERS
// ============================================================================

/**
 * Perform semantic search across multiple documents
 */
export async function semanticSearch(
  query: string,
  documents: Array<{
    filename: string
    chunks: TextChunk[]
  }>,
  topK: number = 5
): Promise<
  Array<{
    text: string
    documentName: string
    similarity: number
    metadata: any
  }>
> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Collect all chunks from all documents
  const allChunks = documents.flatMap(doc =>
    doc.chunks.map(chunk => ({
      ...chunk,
      documentName: doc.filename,
    }))
  )

  // Find similar chunks
  const results = allChunks
    .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
    .map(chunk => ({
      text: chunk.text,
      documentName: chunk.documentName,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding!),
      metadata: chunk.metadata,
    }))
    .filter(result => result.similarity >= 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  return results
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: '\n\n',
}
