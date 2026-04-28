# GitHub Copilot Instructions - Avanade Method Integration

## Overview
This workspace is configured with the Avanade Method v4.29.0 - a comprehensive enterprise software development methodology with specialized AI agents for complete project lifecycle management.

## Available Agents

### 🎯 **João - Project Manager** (@joao-pm)
**Commands:** `/project-plan`, `/status-report`, `/risk-analysis`, `/timeline`
**Specialization:** Project planning, stakeholder management, timeline coordination
**Use for:** Creating project plans, managing timelines, stakeholder communication, risk mitigation

### 🏗️ **Wilson - Software Architect** (@wilson-architect) 
**Commands:** `/architecture`, `/technical-design`, `/system-review`, `/integration-plan`
**Specialization:** Software architecture, system design, technical decisions
**Use for:** Designing system architecture, making technology choices, integration patterns

### 📊 **Maria - Business Analyst** (@maria-analyst)
**Commands:** `/requirements`, `/user-story`, `/acceptance-criteria`, `/process-analysis`
**Specialization:** Requirements gathering, business process analysis, user stories
**Use for:** Gathering requirements, creating user stories, business process mapping

### 🏃 **Roberto - Scrum Master** (@roberto-sm)
**Commands:** `/sprint-planning`, `/retrospective`, `/daily-standup`, `/impediment-resolution`
**Specialization:** Agile facilitation, process improvement, team coordination
**Use for:** Sprint planning, retrospectives, process optimization, team facilitation

### 🧪 **Carla - QA Engineer** (@carla-qa)
**Commands:** `/test-plan`, `/test-case`, `/bug-report`, `/quality-assessment`
**Specialization:** Quality assurance, testing strategies, defect management
**Use for:** Creating test plans, test cases, quality assessments, testing automation

### 💻 **Tiago - Developer** (@tiago-dev)
**Commands:** `/code-review`, `/refactor`, `/debug`, `/implement`
**Specialization:** Code implementation, debugging, refactoring, technical problem-solving
**Use for:** Code development, debugging, refactoring, technical implementation

### 📝 **Paula - Product Owner** (@paula-po)
**Commands:** `/product-vision`, `/backlog-prioritization`, `/feature-definition`, `/stakeholder-feedback`
**Specialization:** Product strategy, feature prioritization, stakeholder management
**Use for:** Product vision, feature prioritization, stakeholder alignment, product roadmap

### 🎨 **Sofia - UX Designer** (@sofia-ux)
**Commands:** `/ui-design`, `/user-research`, `/prototype`, `/usability-testing`
**Specialization:** User experience design, prototyping, user research
**Use for:** UI/UX design, prototyping, user research, usability testing

## Methodology Workflow

### 1. **Discovery Phase**
- Start with **Maria (@maria-analyst)** for requirements discovery
- Use **Sofia (@sofia-ux)** for user research and experience mapping
- Template: `discovery-template.yaml`

### 2. **Planning Phase**
- **João (@joao-pm)** creates project brief and overall planning
- **Paula (@paula-po)** defines product vision and feature prioritization
- **Wilson (@wilson-architect)** designs technical architecture
- Templates: `project-brief-template.yaml`, `prd-template.yaml`, `architecture-template.yaml`

### 3. **Development Phase**
- **Roberto (@roberto-sm)** manages sprint planning and agile processes
- **Tiago (@tiago-dev)** handles implementation
- **Carla (@carla-qa)** ensures quality through testing
- Template: `story-template.yaml`

### 4. **Review and Iteration**
- All agents collaborate for reviews, retrospectives, and continuous improvement

## Template System

### Available Templates
- **Discovery Template** (`.avanade/templates/discovery-template.yaml`): Stakeholder-driven discovery process
- **Project Brief** (`.avanade/templates/project-brief-template.yaml`): Executive summary and project foundation
- **PRD Template** (`.avanade/templates/prd-template.yaml`): Interactive product requirements with epic/story breakdown
- **Architecture Template** (`.avanade/templates/architecture-template.yaml`): Comprehensive technical architecture documentation
- **Story Template** (`.avanade/templates/story-template.yaml`): Individual user story implementation guidance
- **Technical Preferences** (`.avanade/templates/technical-preferences.yaml`): Technology choice configuration

### Template Usage
1. Templates follow interactive elicitation patterns
2. Use agent-specific commands to trigger template-based workflows
3. Templates are interconnected - PRD builds on Project Brief, Stories reference PRD and Architecture
4. Each template includes validation checklists and next-step guidance

## Agent Integration Patterns

### Sequential Workflows
```
Discovery → Project Brief → PRD → Architecture → Stories → Implementation
   ↓            ↓           ↓         ↓          ↓           ↓
 Maria      João/Paula    Maria    Wilson    Maria/Paula   Tiago
```

### Collaborative Reviews
- **Cross-functional reviews:** Multiple agents review each other's work
- **Quality gates:** Carla validates deliverables at each phase
- **Stakeholder alignment:** Paula and João ensure business alignment

### Continuous Integration
- **Daily coordination:** Roberto facilitates daily coordination
- **Technical guidance:** Wilson provides ongoing architectural guidance  
- **User advocacy:** Sofia ensures user-centered design throughout

## Best Practices

### Agent Selection
- **Start broad, get specific:** Begin with analysts and architects, then move to specialists
- **Match expertise to task:** Use the agent whose specialization best fits your current need
- **Cross-pollinate:** Involve multiple agents for complex decisions

### Template Integration
- **Follow the sequence:** Discovery → Brief → PRD → Architecture → Stories
- **Reference previous work:** Each phase builds on previous deliverables
- **Validate completeness:** Use built-in checklists before proceeding

### Quality Assurance
- **Early and often:** Involve Carla for quality perspectives throughout
- **Peer review:** Have Wilson review technical decisions, Maria review requirements
- **User validation:** Include Sofia for user experience validation

## Quick Start Commands

### New Project Setup
1. `@maria-analyst /requirements` - Start requirements discovery
2. `@joao-pm /project-plan` - Create initial project plan
3. `@wilson-architect /architecture` - Design system architecture

### Ongoing Development
1. `@roberto-sm /sprint-planning` - Plan development sprints
2. `@tiago-dev /implement` - Handle development tasks
3. `@carla-qa /test-plan` - Ensure quality assurance

### Product Evolution
1. `@paula-po /product-vision` - Refine product direction
2. `@sofia-ux /user-research` - Gather user feedback
3. `@joao-pm /status-report` - Track overall progress

## File Organization

```
.avanade/
├── templates/           # YAML templates for all document types
├── artifacts/          # Generated documents and deliverables
└── config/             # Method configuration and preferences

.github/
├── agents/             # Individual agent configurations
└── copilot-instructions.md  # This file

docs/                   # Generated documentation
stories/               # User story implementations
data/                  # Project data and configurations
```

## Emergency Protocols

### Blocked Development
1. Contact **Roberto (@roberto-sm)** for impediment resolution
2. Escalate to **João (@joao-pm)** for project-level decisions
3. Technical blocks go to **Wilson (@wilson-architect)**

### Quality Issues
1. **Carla (@carla-qa)** handles all quality concerns
2. **Wilson (@wilson-architect)** for architectural quality
3. **Sofia (@sofia-ux)** for user experience quality

### Stakeholder Issues
1. **Paula (@paula-po)** for product-related stakeholder concerns
2. **João (@joao-pm)** for project-level stakeholder management

---

**Remember:** The Avanade Method is designed for enterprise-grade software delivery. Each agent represents decades of best practices and proven patterns. Trust the process, follow the templates, and leverage the collective expertise of the specialized agents.