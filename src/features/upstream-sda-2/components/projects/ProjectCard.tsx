'use client'

import { Folder, FolderPlus } from 'lucide-react'

import type { Project } from '../../types'

interface ProjectCardProps {
  project?: Project
  isNewProject?: boolean
  onClick: () => void
}

export function ProjectCard({
  project,
  isNewProject = false,
  onClick,
}: ProjectCardProps) {
  if (isNewProject) {
    return (
      <button
        onClick={onClick}
        className="group flex h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 transition-all hover:border-orange-400 hover:bg-orange-100"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-orange-500 text-white transition-transform group-hover:scale-110">
          <FolderPlus className="size-6" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">Novo projeto</p>
          <p className="text-sm text-gray-500">Crie um novo projeto com IA</p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="group flex h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white transition-all hover:border-orange-300 hover:shadow-md"
    >
      <div className="flex size-12 items-center justify-center text-gray-400 transition-colors group-hover:text-orange-500">
        <Folder className="size-10" />
      </div>
      <p className="font-medium text-gray-700 group-hover:text-gray-900">
        {project?.name}
      </p>
    </button>
  )
}
