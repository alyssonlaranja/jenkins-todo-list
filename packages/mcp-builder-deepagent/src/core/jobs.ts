// src/core/jobs.ts

import { randomUUID } from 'crypto'

import type {
  Job,
  JobError,
  JobProgress,
  JobResult,
  JobStatus,
  McpSlotDefinition,
} from './types.js'

/**
 * In-memory job store
 * In production, replace with Redis or database
 */
export class JobManager {
  private jobs: Map<string, Job> = new Map()

  /**
   * Create a new job
   */
  createJob(
    projectName: string,
    description: string,
    slots: Record<string, McpSlotDefinition>,
    storageSlot: string,
    playgroundId?: string
  ): Job {
    const job: Job = {
      id: randomUUID(),
      status: 'pending',
      projectName,
      description,
      slots,
      storageSlot,
      playgroundId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.jobs.set(job.id, job)
    return job
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Update job status
   */
  updateStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.status = status
      job.updatedAt = new Date()
    }
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: Partial<JobProgress>): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.progress = {
        phase: progress.phase || job.progress?.phase || '',
        filesGenerated:
          progress.filesGenerated || job.progress?.filesGenerated || [],
        currentFile: progress.currentFile,
      }
      job.updatedAt = new Date()
    }
  }

  /**
   * Complete a job successfully
   */
  completeJob(jobId: string, result: JobResult): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.status = 'completed'
      job.result = result
      job.updatedAt = new Date()
    }
  }

  /**
   * Fail a job
   */
  failJob(jobId: string, error: JobError): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.status = 'failed'
      job.error = error
      job.updatedAt = new Date()
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (job && ['pending', 'connecting', 'generating'].includes(job.status)) {
      job.status = 'cancelled'
      job.updatedAt = new Date()
      return true
    }
    return false
  }

  /**
   * List all jobs
   */
  listJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Clean up old jobs (older than 24 hours)
   */
  cleanup(): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    let cleaned = 0

    for (const [id, job] of this.jobs) {
      if (job.createdAt.getTime() < cutoff) {
        this.jobs.delete(id)
        cleaned++
      }
    }

    return cleaned
  }
}

// Singleton instance
export const jobManager = new JobManager()
