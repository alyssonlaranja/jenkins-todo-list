/**
 * Unit Tests for Client File Processor
 *
 * Tests file type detection and validation functions.
 * Focus on .md and .txt files that may have inconsistent MIME types in browsers.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  ACCEPTED_FILE_EXTENSIONS,
  DOCUMENT_FILE_EXTENSIONS,
  isExtractableDocumentByExtension,
  isSupportedFile,
  isTextFileByExtension,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_TEXT_TYPES,
  TEXT_FILE_EXTENSIONS,
} from '@/lib/upstream/client-file-processor'

// ============================================================================
// HELPER: Create mock File object
// ============================================================================

function createMockFile(name: string, type: string, size: number = 1024): File {
  const blob = new Blob(['test content'], { type })
  return new File([blob], name, { type })
}

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Client File Processor Constants', () => {
  describe('SUPPORTED_TEXT_TYPES', () => {
    it('should include text/plain', () => {
      expect(SUPPORTED_TEXT_TYPES).toContain('text/plain')
    })

    it('should include text/markdown', () => {
      expect(SUPPORTED_TEXT_TYPES).toContain('text/markdown')
    })

    it('should include text/csv', () => {
      expect(SUPPORTED_TEXT_TYPES).toContain('text/csv')
    })

    it('should include application/json', () => {
      expect(SUPPORTED_TEXT_TYPES).toContain('application/json')
    })
  })

  describe('SUPPORTED_DOCUMENT_TYPES', () => {
    it('should include application/pdf', () => {
      expect(SUPPORTED_DOCUMENT_TYPES).toContain('application/pdf')
    })

    it('should include DOCX MIME type', () => {
      expect(SUPPORTED_DOCUMENT_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    })

    it('should include PPTX MIME type', () => {
      expect(SUPPORTED_DOCUMENT_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    })

    it('should include XLSX MIME type', () => {
      expect(SUPPORTED_DOCUMENT_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    })
  })

  describe('TEXT_FILE_EXTENSIONS', () => {
    it('should include .md extension', () => {
      expect(TEXT_FILE_EXTENSIONS).toContain('.md')
    })

    it('should include .txt extension', () => {
      expect(TEXT_FILE_EXTENSIONS).toContain('.txt')
    })

    it('should include .json extension', () => {
      expect(TEXT_FILE_EXTENSIONS).toContain('.json')
    })

    it('should include .csv extension', () => {
      expect(TEXT_FILE_EXTENSIONS).toContain('.csv')
    })
  })

  describe('DOCUMENT_FILE_EXTENSIONS', () => {
    it('should include .pdf extension', () => {
      expect(DOCUMENT_FILE_EXTENSIONS).toContain('.pdf')
    })

    it('should include .docx extension', () => {
      expect(DOCUMENT_FILE_EXTENSIONS).toContain('.docx')
    })

    it('should include .pptx extension', () => {
      expect(DOCUMENT_FILE_EXTENSIONS).toContain('.pptx')
    })

    it('should include .xlsx extension', () => {
      expect(DOCUMENT_FILE_EXTENSIONS).toContain('.xlsx')
    })
  })

  describe('ACCEPTED_FILE_EXTENSIONS', () => {
    it('should include .md', () => {
      expect(ACCEPTED_FILE_EXTENSIONS).toContain('.md')
    })

    it('should include .txt', () => {
      expect(ACCEPTED_FILE_EXTENSIONS).toContain('.txt')
    })

    it('should include .pdf', () => {
      expect(ACCEPTED_FILE_EXTENSIONS).toContain('.pdf')
    })
  })
})

// ============================================================================
// FUNCTION TESTS: isTextFileByExtension
// ============================================================================

describe('isTextFileByExtension', () => {
  describe('Markdown files (.md)', () => {
    it('should return true for .md file with text/markdown MIME', () => {
      const file = createMockFile('README.md', 'text/markdown')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .md file with text/plain MIME', () => {
      const file = createMockFile('document.md', 'text/plain')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .md file with EMPTY MIME type (browser issue)', () => {
      const file = createMockFile('notes.md', '')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .MD file (uppercase extension)', () => {
      const file = createMockFile('DOCUMENT.MD', '')
      expect(isTextFileByExtension(file)).toBe(true)
    })
  })

  describe('Text files (.txt)', () => {
    it('should return true for .txt file with text/plain MIME', () => {
      const file = createMockFile('notes.txt', 'text/plain')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .txt file with EMPTY MIME type', () => {
      const file = createMockFile('readme.txt', '')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .TXT file (uppercase extension)', () => {
      const file = createMockFile('README.TXT', '')
      expect(isTextFileByExtension(file)).toBe(true)
    })
  })

  describe('Other text files', () => {
    it('should return true for .json file', () => {
      const file = createMockFile('config.json', 'application/json')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .csv file', () => {
      const file = createMockFile('data.csv', 'text/csv')
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should return true for .xml file', () => {
      const file = createMockFile('config.xml', 'text/xml')
      expect(isTextFileByExtension(file)).toBe(true)
    })
  })

  describe('Non-text files', () => {
    it('should return false for .pdf file', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      expect(isTextFileByExtension(file)).toBe(false)
    })

    it('should return false for .docx file', () => {
      const file = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      expect(isTextFileByExtension(file)).toBe(false)
    })

    it('should return false for .png image', () => {
      const file = createMockFile('image.png', 'image/png')
      expect(isTextFileByExtension(file)).toBe(false)
    })
  })
})

// ============================================================================
// FUNCTION TESTS: isExtractableDocumentByExtension
// ============================================================================

describe('isExtractableDocumentByExtension', () => {
  describe('PDF files', () => {
    it('should return true for .pdf file', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .PDF file (uppercase)', () => {
      const file = createMockFile('DOCUMENT.PDF', 'application/pdf')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .pdf with empty MIME type', () => {
      const file = createMockFile('document.pdf', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })
  })

  describe('Office documents', () => {
    it('should return true for .docx file', () => {
      const file = createMockFile('document.docx', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .pptx file', () => {
      const file = createMockFile('presentation.pptx', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .xlsx file', () => {
      const file = createMockFile('spreadsheet.xlsx', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .doc file (legacy Word)', () => {
      const file = createMockFile('legacy.doc', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })

    it('should return true for .xls file (legacy Excel)', () => {
      const file = createMockFile('legacy.xls', '')
      expect(isExtractableDocumentByExtension(file)).toBe(true)
    })
  })

  describe('Non-extractable files', () => {
    it('should return false for .md file', () => {
      const file = createMockFile('readme.md', 'text/markdown')
      expect(isExtractableDocumentByExtension(file)).toBe(false)
    })

    it('should return false for .txt file', () => {
      const file = createMockFile('notes.txt', 'text/plain')
      expect(isExtractableDocumentByExtension(file)).toBe(false)
    })

    it('should return false for image file', () => {
      const file = createMockFile('photo.jpg', 'image/jpeg')
      expect(isExtractableDocumentByExtension(file)).toBe(false)
    })
  })
})

// ============================================================================
// FUNCTION TESTS: isSupportedFile
// ============================================================================

describe('isSupportedFile', () => {
  describe('Text files with correct MIME type', () => {
    it('should return true for .md with text/markdown', () => {
      const file = createMockFile('readme.md', 'text/markdown')
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .txt with text/plain', () => {
      const file = createMockFile('notes.txt', 'text/plain')
      expect(isSupportedFile(file)).toBe(true)
    })
  })

  describe('Text files with EMPTY or WRONG MIME type (browser issue)', () => {
    it('should return true for .md with EMPTY MIME type', () => {
      const file = createMockFile('readme.md', '')
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .txt with EMPTY MIME type', () => {
      const file = createMockFile('notes.txt', '')
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .md with application/octet-stream (generic binary)', () => {
      const file = createMockFile('document.md', 'application/octet-stream')
      expect(isSupportedFile(file)).toBe(true)
    })
  })

  describe('Document files', () => {
    it('should return true for .pdf with application/pdf', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .pdf with EMPTY MIME type', () => {
      const file = createMockFile('document.pdf', '')
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .docx with correct MIME type', () => {
      const file = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should return true for .docx with EMPTY MIME type', () => {
      const file = createMockFile('document.docx', '')
      expect(isSupportedFile(file)).toBe(true)
    })
  })

  describe('Unsupported files', () => {
    it('should return false for .exe file', () => {
      const file = createMockFile('program.exe', 'application/x-msdownload')
      expect(isSupportedFile(file)).toBe(false)
    })

    it('should return false for .zip file', () => {
      const file = createMockFile('archive.zip', 'application/zip')
      expect(isSupportedFile(file)).toBe(false)
    })

    it('should return false for unknown extension with empty MIME', () => {
      const file = createMockFile('file.xyz', '')
      expect(isSupportedFile(file)).toBe(false)
    })
  })
})

// ============================================================================
// EDGE CASES AND REGRESSION TESTS
// ============================================================================

describe('Edge Cases and Regression Tests', () => {
  describe('Browser MIME type inconsistencies', () => {
    it('should handle .md file that browser reports as text/plain', () => {
      // Some browsers report .md as text/plain instead of text/markdown
      const file = createMockFile('README.md', 'text/plain')
      expect(isSupportedFile(file)).toBe(true)
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should handle .md file that browser reports as empty string', () => {
      // Some browsers return empty MIME type for .md files
      const file = createMockFile('document.md', '')
      expect(isSupportedFile(file)).toBe(true)
      expect(isTextFileByExtension(file)).toBe(true)
    })

    it('should handle .txt file that browser reports as empty string', () => {
      const file = createMockFile('notes.txt', '')
      expect(isSupportedFile(file)).toBe(true)
      expect(isTextFileByExtension(file)).toBe(true)
    })
  })

  describe('File name edge cases', () => {
    it('should handle file with multiple dots in name', () => {
      const file = createMockFile('document.v2.final.md', '')
      expect(isTextFileByExtension(file)).toBe(true)
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should handle file with spaces in name', () => {
      const file = createMockFile('my document.md', '')
      expect(isTextFileByExtension(file)).toBe(true)
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should handle file with special characters in name', () => {
      const file = createMockFile('análise-técnica_v1.md', '')
      expect(isTextFileByExtension(file)).toBe(true)
      expect(isSupportedFile(file)).toBe(true)
    })

    it('should handle mixed case extension', () => {
      const file = createMockFile('README.Md', '')
      expect(isTextFileByExtension(file)).toBe(true)
      expect(isSupportedFile(file)).toBe(true)
    })
  })
})
