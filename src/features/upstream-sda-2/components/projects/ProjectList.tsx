'use client'

import type { Project } from '../../types'
import { ProjectCard } from './ProjectCard'

interface ProjectListProps {
  projects: Project[]
  onNewProject: () => void
  onSelectProject: (project: Project) => void
}

export function ProjectList({
  projects,
  onNewProject,
  onSelectProject,
}: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* New Project Card */}
      <ProjectCard isNewProject onClick={onNewProject} />

      {/* Existing Projects */}
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelectProject(project)}
        />
      ))}
    </div>
  )
}
