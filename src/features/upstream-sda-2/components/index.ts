// Components - Layout
export { Header } from './layout/Header'
export { Sidebar, ProjectSidebar } from './layout/Sidebar'

// Components - Projects
export { NewProjectModal } from './projects/NewProjectModal'
export { ProjectCard } from './projects/ProjectCard'
export { ProjectList } from './projects/ProjectList'
export { TeamMemberSelect, type TeamMember } from './projects/TeamMemberSelect'

// Components - Chat
export { ChatArea } from './chat/ChatArea'
export { ChatInput, type ProjectDocument } from './chat/ChatInput'
export { ChatMessage } from './chat/ChatMessage'
export { NewChatModal } from './chat/NewChatModal'
export { OcrPreviewModal } from './chat/OcrPreviewModal'

// Components - Artifacts
export { ArtifactViewer } from './artifacts/ArtifactViewer'
export { ArtifactDirectEditPanel } from './artifacts/ArtifactDirectEditPanel'
export { ArtifactAIEditPanel } from './artifacts/ArtifactAIEditPanel'
export {
  ArtifactProposal,
  type DetectedArtifact,
} from './artifacts/ArtifactProposal'
export { BacklogHierarchyView } from './artifacts/BacklogHierarchyView'
export { AzureDevOpsConfigModal } from './artifacts/AzureDevOpsConfigModal'
export { AzureDevOpsSyncModal } from './artifacts/AzureDevOpsSyncModal'

// Components - Process Compatibility
export {
  ProcessCompatibilityWarning,
  ProcessWarningInline,
} from './ProcessCompatibilityWarning'
