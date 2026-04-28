import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Artifact, Conversation, Project, User } from '../types'

// ============================================================================
// Project Store - Zustand
// ============================================================================

interface ProjectState {
  // User
  user: User | null
  setUser: (user: User | null) => void

  // Projects
  projects: Project[]
  currentProject: Project | null
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void

  // Current conversation
  currentConversation: Conversation | null
  setCurrentConversation: (conversation: Conversation | null) => void

  // Current artifact
  currentArtifact: Artifact | null
  setCurrentArtifact: (artifact: Artifact | null) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // View mode
  viewMode: 'chat' | 'artifact'
  setViewMode: (mode: 'chat' | 'artifact') => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    set => ({
      // User
      user: null,
      setUser: user => set({ user }),

      // Projects - inicializa vazio, projetos vêm do Cockpit
      projects: [],
      currentProject: null,
      setProjects: projects =>
        set(state => {
          // 🔒 PROTEÇÃO: Não sobrescrever projetos que já têm detalhes carregados
          // Batch loading traz versões BÁSICAS, mas se usuário já abriu o projeto
          // ele tem versão COMPLETA com artifacts. Preservamos a completa!
          const mergedProjects = projects.map(newProject => {
            const existingProject = state.projects.find(
              p => p.id === newProject.id
            )

            // Se existe E tem detalhes carregados → MANTER o existente (completo)
            if (existingProject?.detailsLoaded) {
              console.log(
                '🔒 [setProjects] Preservando projeto com detalhes:',
                {
                  projectName: existingProject.name,
                  artifactsCount: existingProject.artifacts?.length || 0,
                }
              )
              return existingProject
            }

            // Caso contrário → ACEITAR o novo do batch
            return newProject
          })

          // Se há um projeto atual, atualizar com a versão mais recente da lista
          let updatedCurrentProject = state.currentProject
          if (state.currentProject) {
            const freshProject = mergedProjects.find(
              p =>
                p.id === state.currentProject?.id ||
                p.name === state.currentProject?.name
            )
            if (freshProject) {
              updatedCurrentProject = freshProject
            }
          }
          return {
            projects: mergedProjects,
            currentProject: updatedCurrentProject,
          }
        }),
      setCurrentProject: project => set({ currentProject: project }),
      addProject: project =>
        set(state => ({
          projects: [...state.projects, project],
        })),
      updateProject: (id, updates) =>
        set(state => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),
      deleteProject: id =>
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        })),

      // Current conversation
      currentConversation: null,
      setCurrentConversation: conversation =>
        set({ currentConversation: conversation }),

      // Current artifact
      currentArtifact: null,
      setCurrentArtifact: artifact => set({ currentArtifact: artifact }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: open => set({ sidebarOpen: open }),

      // View mode
      viewMode: 'chat',
      setViewMode: mode => set({ viewMode: mode }),
    }),
    {
      name: 'upstream-sda-2-storage',
      partialize: state => ({
        user: state.user,
        // NOTE: projects NÃO são persistidos porque sempre vêm do backend (carregamento progressivo)
        //       Persistir causava race condition: localStorage desatualizado vs batch vs backend
        // NOTE: currentProject is NOT persisted so the user always starts on the home page
        // viewMode is also not persisted to avoid stale view state
      }),
    }
  )
)
