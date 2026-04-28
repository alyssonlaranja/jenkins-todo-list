// src/server/tools/projects.ts

import type { FastMCP } from 'fastmcp'
import { z } from 'zod'

import {
  createGenerator,
  CreateProjectInputSchema,
  jobManager,
} from '../../core/index.js'

/**
 * Register project-related tools
 */
export function registerProjectTools(server: FastMCP): void {
  // create_project
  server.addTool({
    name: 'create_project',
    description: 'Start async generation of a new MCP server project',
    parameters: CreateProjectInputSchema,
    execute: async input => {
      const { name, description, slots, storageSlot } = input

      // Create job
      const job = jobManager.createJob(name, description, slots, storageSlot)

      // Start generation in background
      const generator = createGenerator()
      generator.runJob(job).catch(error => {
        console.error(`Job ${job.id} failed:`, error)
      })

      return JSON.stringify({
        job_id: job.id,
        status: job.status,
        message: 'Project generation started',
      })
    },
  })

  // get_job_status
  server.addTool({
    name: 'get_job_status',
    description: 'Get the status of a generation job',
    parameters: z.object({
      job_id: z.string().describe('Job ID'),
    }),
    execute: async ({ job_id }) => {
      const job = jobManager.getJob(job_id)

      if (!job) {
        return JSON.stringify({ error: 'Job not found' })
      }

      return JSON.stringify({
        id: job.id,
        status: job.status,
        projectName: job.projectName,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })
    },
  })

  // cancel_job
  server.addTool({
    name: 'cancel_job',
    description: 'Cancel a running generation job',
    parameters: z.object({
      job_id: z.string().describe('Job ID'),
    }),
    execute: async ({ job_id }) => {
      const cancelled = jobManager.cancelJob(job_id)
      return JSON.stringify({ success: cancelled })
    },
  })

  // list_jobs
  server.addTool({
    name: 'list_jobs',
    description: 'List all generation jobs',
    parameters: z.object({}),
    execute: async () => {
      const jobs = jobManager.listJobs()
      return JSON.stringify({
        jobs: jobs.map(j => ({
          id: j.id,
          status: j.status,
          projectName: j.projectName,
          createdAt: j.createdAt,
        })),
      })
    },
  })
}
