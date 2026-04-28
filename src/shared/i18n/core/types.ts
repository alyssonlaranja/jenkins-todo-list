import type { supportedLngs } from './constants'

export type SupportedLanguage = (typeof supportedLngs)[number]

export interface AuthTranslation {
  login: {
    title: string
    subtitle: string
    loginButton: string
    loadingButtonMessage: string
    loginDescriptionFooter: string
  }
}

export interface CommonTranslation {
  button: {
    save: string
    cancel: string
    delete: string
    edit: string
    close: string
    confirm: string
    loading: string
  }
  status: {
    loading: string
    success: string
    error: string
    warning: string
    info: string
  }
  pagination: {
    firstPage: string
    lastPage: string
    previous: string
    next: string
    page: string
    of: string
  }
}

export interface NavigationTranslation {
  groups: {
    aiHub: string
    commandCenter: string
    agentConsole: string
    administration: string
  }
  aiHub: {
    aiLibrary: string
    agentPlayground: string
    utilityAgents: string
    videoGeneration: string
    configuration: string
  }
  commandCenter: {
    agentControlPanel: string
    managementAgents: string
    schedule: string
    reports: string
    telemetry: string
  }
  agentConsole: {
    aiRegistry: string
    sandbox: string
    agentCreator: string
    importAgents: string
    utilityAgents: string
    aiMarketplace: string
  }
  administration: {
    systemAdministrator: string
    users: string
    namespaces: string
    licenses: string
    artifacts: string
    artifactLibrary: string
    utilityAgentsLibrary: string
  }
  search: { noResults: string }
}

export interface PagesTranslation {
  profile: {
    title: string
    apiKey: { title: string; description: string }
    serviceApiKey: { title: string; description: string }
  }
  administration: {
    artifacts: {
      title: string
      description: string
      breadcrumbParent: string
      new: { title: string; description: string }
      edit: { title: string; description: string }
    }
    licenses: { title: string; description: string; breadcrumbParent: string }
    namespaces: { title: string; description: string; breadcrumbParent: string }
    projects: { title: string; description: string; breadcrumbParent: string }
    users: { title: string; description: string; breadcrumbParent: string }
  }
  agentConsole: {
    aiRegistry: {
      title: string
      description: string
      breadcrumbParent: string
      importUtilityAgent: { title: string; description: string }
    }
    utilityAgentAiRegistry: {
      title: string
      description: string
      breadcrumbParent: string
      breadcrumbCurrent: string
      new: { title: string; description: string }
      edit: { title: string; description: string }
    }
    chatSandbox: {
      title: string
      description: string
      breadcrumbParent: string
    }
    marketplace: {
      title: string
      description: string
      breadcrumbParent: string
      retail: { title: string; description: string; breadcrumbParent: string }
    }
  }
  aiHub: {
    configuration: {
      title: string
      description: string
      breadcrumbParent: string
      breadcrumbCurrent: string
    }
    utilityAgents: {
      title: string
      description: string
      breadcrumbParent: string
    }
    videoGeneration: {
      title: string
      description: string
      breadcrumbParent: string
      modules: {
        projects: {
          title: string
          description: string
          breadcrumbParent: string
          new: { title: string; description: string }
          detail: { title: string; description: string }
        }
        products: {
          title: string
          description: string
          breadcrumbParent: string
          detail: { title: string; description: string }
        }
        settings: {
          title: string
          description: string
          breadcrumbParent: string
          detail: { title: string; description: string }
        }
        backgrounds: {
          title: string
          description: string
          breadcrumbParent: string
          detail: { title: string; description: string }
        }
      }
    }
  }
  commandCenter: {
    agents: { title: string; description: string; breadcrumbParent: string }
    reports: {
      title: string
      description: string
      breadcrumbParent: string
      detail: { title: string; description: string }
    }
    schedule: { title: string; description: string; breadcrumbParent: string }
    telemetry: { title: string; description: string; breadcrumbParent: string }
  }
  buttons: {
    newArtifact: string
    newAgent: string
    refresh: string
    tryAgain: string
    accessDenied: { title: string; message: string; buttonLabel: string }
    featureNotAvailable: string
  }
  search: { taskOrAgent: string; byName: string }
  errors: { failedToLoadReports: string; failedToLoadReportDetails: string }
  common: { noReportsFound: string }
  telemetry: { underDevelopment: string }
  chat: {
    welcome: {
      title: string
      titleDefault: string
      subtitle: string
      teamMembers: string
      loadingTeamMembers: string
      noTeamMembers: string
      error: string
    }
  }
  sda2: {
    home: {
      title: string
      description: string
      createProject: string
      benefits: string
      aiAssisted: string
      requirements: string
      contextAware: string
      suggestions: string
      agentsAndArtifacts: string
      agentTypes: string
      assistantAgents: string
      artifactTypes: string
      structuredDocuments: string
      yourProjects: string
      project: string
      projects: string
      loadingProjects: string
      noProjectsYet: string
      openProject: string
      manageTeam: string
      deleteProject: string
      members: string
      member: string
      page: string
      of: string
      switchToLightTheme: string
      switchToDarkTheme: string
      logout: string
      supportedLLMs: string
      benefitsList: {
        acceleration: string
        documentation: string
        tradeoffs: string
        diagrams: string
      }
      agents: {
        discovery: { name: string; artifactType: string; description: string }
        product: { name: string; artifactType: string; description: string }
        ux: { name: string; artifactType: string; description: string }
        tech: { name: string; artifactType: string; description: string }
        backlog: { name: string; artifactType: string; description: string }
      }
    }
    workspace: {
      title: string
      welcome: string
      description: string
      agents: string
      artifacts: string
      settings: string
      loadingChat: string
      sendMessage: string
      thinking: string
      newConversation: string
      exportChat: string
    }
    createProject: {
      title: string
      description: string
      projectName: string
      projectDescription: string
      addTeam: string
      cancel: string
      create: string
      creating: string
    }
    deleteProject: {
      title: string
      confirmMessage: string
      cancel: string
      delete: string
      deleting: string
    }
    addTeam: {
      title: string
      description: string
      addMember: string
      removeMember: string
      email: string
      role: string
      done: string
    }
  }
}

export interface MCPTranslation {
  marketplace: {
    title: string
    description: string
    hero: {
      title: string
      subtitle: string
      badge: {
        method: string
        version: string
      }
      stats: {
        availableModus: string
        multiNS: string
        connections: string
        realTime: string
        syncMigrate: string
        enterprise: string
        gradeSecurity: string
      }
    }
    content: {
      title: string
      subtitle: string
    }
    modus: {
      agentWorkspace: {
        title: string
        subtitle: string
        description: string
        tags: {
          enterprise: string
          multiNS: string
          infrastructure: string
        }
        features: {
          multiNamespace: string
          envConfig: string
          connectionTest: string
          realTimeMonitoring: string
        }
      }
      upstreamModus: {
        title: string
        subtitle: string
        description: string
        tags: {
          aiPowered: string
          businessValue: string
          discovery: string
          copilotKit: string
        }
        features: {
          sixStage: string
          aiAssisted: string
          stakeholder: string
          portfolio: string
        }
      }
      devOpsModus: {
        title: string
        subtitle: string
        description: string
        tags: {
          ml: string
          devOps: string
          automation: string
        }
        features: {
          automated: string
          smartResolution: string
          visualPipeline: string
          iac: string
        }
      }
    }
    actions: {
      launch: string
      comingSoon: string
    }
    search: {
      placeholder: string
      noResults: string
    }
    filters: {
      all: string
      copilotEnabled: string
      upstream: string
    }
    card: {
      viewDetails: string
      configure: string
      enabled: string
      disabled: string
    }
  }
  connections: {
    title: string
    description: string
    addConnection: string
    importConnection: string
    exportConnection: string
    fromEnvironment: string
    stats: {
      total: string
      errors: string
      artifacts: string
    }
    status: {
      connected: string
      disconnected: string
      connecting: string
      error: string
    }
    actions: {
      connect: string
      disconnect: string
      edit: string
      delete: string
      test: string
    }
    form: {
      name: string
      url: string
      headers: string
      namespace: string
      environment: string
    }
    search: {
      placeholder: string
      noResults: string
      showing: string
      showingPlural: string
    }
    sort: {
      byName: string
      byLastConnected: string
      byArtifacts: string
      byStatus: string
    }
    filter: {
      title: string
      all: string
    }
    messages: {
      deleteConfirm: string
      deleteSuccess: string
      connectSuccess: string
      connectError: string
    }
    card: {
      labels: {
        artifacts: string
        tools: string
        uptime: string
        agentDetails: string
        model: string
        mcpEnabled: string
        lastSync: string
        yes: string
        no: string
        agentDescription: string
        availableTools: string
        additionalDetails: string
        status: string
      }
      actions: {
        loadingDetails: string
        showAllTools: string
        showLess: string
        fetchDetails: string
        loading: string
        demoMode: string
      }
      tooltips: {
        disconnect: string
        connect: string
        testConnection: string
        collapseDetails: string
        expandDetails: string
        viewAgentDetails: string
        removeConnection: string
      }
      stats: {
        more: string
      }
      infoModal: {
        title: string
        description: string
        sections: {
          agentOverview: string
          description: string
          objective: string
          teamMembers: string
          metadata: string
          availableTools: string
          connectionInfo: string
          availableResources: string
          errorInfo: string
          demoMode: string
        }
        fields: {
          model: string
          mcpEnabled: string
          created: string
          updated: string
          status: string
          namespace: string
          uptime: string
          lastSync: string
          agentId: string
          typeId: string
        }
        values: {
          yes: string
          no: string
          na: string
          noDescription: string
        }
        messages: {
          availableArtifacts: string
          activeTools: string
          availableToolsCount: string
          toolTip: string
          toolHoverHint: string
          demoModeMessage: string
        }
        buttons: {
          fetchDetails: string
          loadingDetails: string
          refreshData: string
          close: string
        }
      }
      fromEnvironmentModal: {
        title: string
        steps: {
          selectEnvironment: string
          selectLicense: string
          selectNamespace: string
          selectUtilityAgent: string
        }
        placeholders: {
          chooseEnvironment: string
          chooseLicense: string
          chooseNamespace: string
          chooseUtilityAgent: string
          autoTitle: string
          autoSubtitle: string
        }
        emptyStates: {
          noEnvironments: string
          noLicenses: string
          noNamespaces: string
          noUtilityAgents: string
        }
        validation: {
          valid: string
          validMessage: string
          invalid: string
          warnings: string
        }
        summary: {
          title: string
          environment: string
          license: string
          namespace: string
          utilityAgent: string
          mcpServers: string
          configured: string
        }
        labels: {
          connectionTitle: string
          connectionSubtitle: string
        }
        plurals: {
          namespace: string
          namespaces: string
          utilityAgent: string
          utilityAgents: string
        }
        alerts: {
          completeAllSelections: string
          cannotCreate: string
          testFailed: string
          unnamedConnection: string
        }
        buttons: {
          cancel: string
          create: string
        }
      }
    }
  }
  upstream: {
    title: string
    subtitle: string
    description: string
    wizard: {
      title: string
      subtitle: string
      stages: {
        ideation: string
        immersion: string
        validation: string
        analysis: string
        prioritization: string
        transition: string
      }
      navigation: {
        next: string
        previous: string
        save: string
        cancel: string
        finish: string
      }
      steps: {
        ideation: {
          hypotheses: {
            singular: string
            plural: string
            createdHelp: string
            none: string
            noneHelp: string
          }
        }
        exploration: {
          criticalIssues: string
          metrics: {
            criticalIssues: string
          }
        }
        prioritization: {
          high: string
          medium: string
          low: string
        }
      }
    }
    epic: {
      create: string
      save: string
      cancel: string
      delete: string
      duplicate: string
    }
    views: {
      executive: {
        title: string
        subtitle: string
        kpis: {
          portfolioValue: string
          activeEpics: string
          qbrSuccessRate: string
          avgLeadTime: string
        }
      }
      gamified: {
        title: string
        subtitle: string
        description: string
      }
      hr: {
        title: string
        subtitle: string
        description: string
      }
      meta: {
        title: string
        subtitle: string
        description: string
      }
    }
    actions: {
      backToModus: string
      selectView: string
    }
    copilot: {
      riskLevels: {
        low: string
        medium: string
        high: string
        critical: string
      }
      exampleLabels: {
        low: string
        high: string
      }
      chatSuggestions: {
        languageRule: string
        notDefinedYet: string
        stageLabel: string
        contextLabel: string
        epicNameLabel: string
        organizationLabel: string
        projectLabel: string
        examplesLabel: string
        generateLabel: string
        step1: {
          epicName: string
          problemStatement: string
          hypothesis: string
          strategicAlignment: string
          okrs: string
          businessValue: string
        }
        step2: {
          csdMatrix: string
          mainProblems: string
          opportunityTree: string
          stakeholders: string
        }
        step3: {
          hypotheses: string
          experiments: string
        }
        step4: {
          macroRequirements: string
          userJourney: string
          actors: string
        }
        step5: {
          dependencies: string
          mitigationPlans: string
          kpis: string
        }
        step6: {
          effort: string
          strategicTheme: string
          valuePlan: string
          preliminaryKPIs: string
          prioritizationScore: string
          qbrMemo: string
        }
        step7: {
          handoffDocument: string
          responsibilityAgreements: string
          transition: string
        }
      }
      suggestions: {
        titles: {
          epicName: string
          businessValue: string
          description: string
          linkedOKRs: string
          problemStatement: string
          centralHypothesis: string
          strategicAlignment: string
          stakeholders: string
          csdMatrix: string
          mainProblems: string
          opportunityTree: string
          initialRisks: string
          hypotheses: string
          dataSources: string
          kpis: string
          macroRequirements: string
          businessFlowUrl: string
          userJourneyUrl: string
          actorMapping: string
          usabilityTest: string
          blueprintUrl: string
          impactAnalysis: string
          gapAnalysis: string
          dependencies: string
          mitigationPlans: string
          finalBusinessValue: string
          effort: string
          riskLevel: string
          strategicTheme: string
          strategicAdherence: string
          qbrMemo: string
          strategicJustification: string
          valuePlan: string
          preliminaryKPIs: string
          targetSquad: string
          jiraBacklog: string
          handoffDocument: string
          features: string
          responsibilityAgreements: string
          createArtifact: string
        }
      }
      assistant: {
        languageInstruction: string
        organizationalContext: string
      }
    }
  }
  environments: {
    title: string
    description: string
    create: string
    edit: string
    delete: string
    import: string
    export: string
    list: {
      title: string
      description: string
      importJson: string
      addEnvironment: string
      createEnvironment: string
      searchPlaceholder: string
      sortByName: string
      sortByUpdated: string
      sortByConnections: string
      noResults: string
      showingResults: string
      showingResults_plural: string
      noEnvironments: string
      noEnvironmentsDescription: string
      noResultsFound: string
      noResultsDescription: string
      clearSearch: string
      mcpServers: string
      mcpServers_plural: string
      license: string
      licenses: string
      namespace: string
      namespaces: string
      utilityAgents: string
      created: string
      updated: string
      tooltips: {
        licensesCount: string
        namespacesCount: string
        utilityAgentsCount: string
        exportConfig: string
        editSettings: string
        deleteEnvironment: string
      }
    }
    wizard: {
      stepProgress: string
      steps: {
        basic: string
        licenses: string
        namespaces: string
        agents: string
        review: string
      }
      basicInfo: {
        title: string
        name: string
        description: string
        url: string
      }
      nextSteps: {
        title: string
        description: string
      }
      readyToSave: {
        title: string
        description: string
      }
      buttons: {
        previous: string
        next: string
        cancel: string
        save: string
        update: string
      }
    }
    editModal: {
      title: {
        edit: string
        create: string
      }
      labels: {
        name: string
        description: string
      }
      placeholders: {
        name: string
        description: string
      }
      helpers: {
        name: string
      }
      nextSteps: {
        title: string
        steps: {
          addLicenses: string
          addNamespaces: string
          configureHeaders: string
          addUtilityAgents: string
          createConnections: string
        }
        info: string
      }
      buttons: {
        update: string
        create: string
        cancel: string
      }
      toast: {
        error: string
        success: string
        noEnvironmentToExport: string
        noEnvironmentSelected: string
        environmentUpdated: string
        nameRequired: string
      }
    }
    page: {
      backButton: string
      title: string
      description: string
      newButton: string
      loading: string
      emptyState: {
        title: string
        description: string
        button: string
      }
      licenseId: string
      namespaceId: string
      deleteConfirm: string
    }
    importModal: {
      title: string
      subtitle: string
      labels: {
        jsonInput: string
        importMode: string
        environmentName: string
        licenseName: string
        namespaceName: string
        utilityAgentName: string
      }
      placeholders: {
        environmentName: string
        licenseName: string
        namespaceName: string
        utilityAgentName: string
      }
      helpers: {
        environmentName: string
      }
      autoExtract: {
        title: string
        items: {
          licenseId: string
          namespaceId: string
          utilityAgentId: string
          apiKeys: string
        }
      }
      fromJson: {
        title: string
        description: string
      }
      summary: {
        title: string
        environment: string
        pendingName: string
        licenses: string
        license: string
        singleLicense: string
        namespaces: string
        singleNamespace: string
        servers: string
      }
      errors: {
        parseError: string
        invalidJson: string
      }
      buttons: {
        parse: string
        import: string
        cancel: string
      }
      toast: {
        error: string
        success: string
        noParsedConfig: string
        missingUtilityAgentName: string
        environmentCreated: string
      }
    }
    messages: {
      deleteConfirm: string
      saveSuccess: string
      saveError: string
      importSuccess: string
      exportSuccess: string
      noEnvironmentToExport: string
      noEnvironmentSelected: string
      confirmUpdate: string
      replace: string
      merge: string
    }
  }
  migration: {
    title: string
    description: string
    source: string
    target: string
    select: string
    preview: string
    execute: string
    configuration: {
      title: string
      sourceConnection: string
      targetConnection: string
      optional: string
      selectSource: string
      selectTarget: string
      targetNeededInfo: string
    }
    workspace: {
      supervisors: string
      supervisor: string
      supervisors_plural: string
      found: string
      loading: string
      loadAgents: string
      reloadAgents: string
      noSourceConnection: string
      noSourceConnectionDescription: string
    }
    agentSelector: {
      migrationMode: string
      selectMode: string
      teamBased: string
      individual: string
      artifactsOnly: string
      teamBasedDescription: string
      individualDescription: string
      artifactsOnlyDescription: string
      searchAgents: string
      searchPlaceholder: string
      searching: string
      resultsFor: string
      selectSupervisor: string
      selectAgent: string
      loadMore: string
      buildingTree: string
      loadingAgents: string
      chooseSupervisor: string
      chooseAgent: string
      supervisor: string
      standard: string
      loaded: string
      available: string
      of: string
      total: string
      page: string
      agent: string
      agents: string
      standards: string
      moreAvailable: string
      noSupervisors: string
      noAgents: string
    }
    supervisorSelector: {
      label: string
      buildingTree: string
      loadingSupervisors: string
      selectSupervisor: string
      noSupervisorsAvailable: string
      team: string
      teamMember: string
      teamMembers: string
      noSupervisorsMessage: string
    }
    actions: {
      item: string
      items: string
      selected: string
      selectAll: string
      deselectAll: string
      validate: string
      migrateSelected: string
    }
    preview: {
      title: string
      noSelection: string
      selectToPreview: string
      itemsSelected: string
      of: string
      supervisors: string
      standards: string
      artifacts: string
      validationStatus: string
      ready: string
      exists: string
      conflicts: string
      pending: string
      validating: string
      migrating: string
      checkingItems: string
      migratingItems: string
      migrationSuccess: string
      migrationWithIssues: string
      item: string
      items: string
      migratedSuccessfully: string
      failedToMigrate: string
      notYetMigrated: string
      readyForMigration: string
      noItemsReady: string
      selectedItems: string
      supervisor: string
      standard: string
      artifact: string
      unknown: string
    }
    tree: {
      title: string
      noTree: string
      selectToBuild: string
      selected: string
      of: string
      validationBadge: {
        pending: string
        validating: string
        ready: string
        exists: string
        conflict: string
        missing: string
        error: string
      }
      unknown: string
    }
    artifactSelector: {
      title: string
      selected: string
      tabs: {
        listAll: string
        search: string
        filter: string
        extract: string
      }
      readyToMigrate: string
      selectToBegin: string
      buildTree: string
      artifact: string
      artifacts: string
      noArtifacts: string
      table: {
        key: string
        type: string
        accessibility: string
        description: string
        noDescription: string
      }
      pagination: {
        showing: string
        of: string
        previous: string
        next: string
        page: string
      }
      search: {
        searchByKey: string
        placeholder: string
        showingMatching: string
        showingMatching_plural: string
        searchByName: string
      }
      filter: {
        artifactType: string
        allTypes: string
        accessibility: string
        allLevels: string
        clear: string
        showingFiltered: string
        showingFiltered_plural: string
        totalArtifacts: string
        totalArtifacts_plural: string
      }
      extract: {
        pasteInstruction: string
        placeholder: string
        extractDescription: string
        extracting: string
        extractArtifacts: string
        clear: string
        found: string
        noMatchingFound: string
        notFoundInSource: string
        referencedButNotExist: string
      }
    }
    status: {
      pending: string
      inProgress: string
      completed: string
      failed: string
    }
  }
  footer: {
    poweredBy: string
    subtitle: string
    tagline: string
    description: string
    protocol: string
    version: string
    badge: string
    cta: string
    cards: {
      universalOrchestration: {
        title: string
        description: string
      }
      enterprisePerformance: {
        title: string
        description: string
      }
      intelligentAutomation: {
        title: string
        description: string
      }
    }
  }
  agentWorkspace: {
    hero: {
      title: string
      subtitle: string
      description: string
    }
    tabs: {
      setupGroup: string
      modusGroup: string
      environments: string
      connections: string
      migration: string
    }
    time: {
      neverConnected: string
      justNow: string
      minutesAgo: string
      minutesAgo_plural: string
      hoursAgo: string
      hoursAgo_plural: string
      daysAgo: string
      daysAgo_plural: string
    }
    placeholders: {
      search: string
      name: string
      description: string
      agentId: string
      agentName: string
    }
    loading: {
      connections: string
    }
  }
  common: {
    loading: string
    error: string
    success: string
    warning: string
    info: string
    save: string
    cancel: string
    delete: string
    edit: string
    close: string
    confirm: string
    back: string
    next: string
    previous: string
    search: string
    filter: string
    export: string
    import: string
    refresh: string
    settings: string
  }
  migrationWizard: {
    title: string
    subtitle: string
    stepLabel: string
    steps: {
      connection: { name: string; description: string }
      discovery: { name: string; description: string }
      analysis: { name: string; description: string }
      execution: { name: string; description: string }
      verification: { name: string; description: string }
    }
    navigation: {
      next: string
      previous: string
      cancel: string
      finish: string
    }
    actions: {
      saving: string
      saveDraft: string
      viewReport: string
    }
    messages: {
      migrationComplete: string
      migrationCompleteDesc: string
    }
    copilot: {
      openAssistant: string
      closeAssistant: string
    }
  }
}

// ============================================================================
// AGENTS TRANSLATION - Dynamic Agent Prompts i18n
// ============================================================================

/**
 * Agent config translation structure
 * Each agent has: name, description, objective, instruction
 */
export interface AgentConfigTranslation {
  name: string
  description: string
  objective: string
  instruction: string
}

/**
 * Agents translation namespace
 * Used for dynamic agent fallback configurations
 */
export interface AgentsTranslation {
  common: {
    languageInstruction: string
    contextAwareness: string
    mcpEnabled: string
  }
  atlas: {
    quick: AgentConfigTranslation
  }
  kanban: {
    main: AgentConfigTranslation
  }
  upstream: {
    wizard: AgentConfigTranslation
  }
  downstream: {
    wizard: AgentConfigTranslation
  }
  migration: {
    wizard: AgentConfigTranslation
  }
  onboarding: {
    wizard: AgentConfigTranslation
    manifest: AgentConfigTranslation
  }
  feedback: {
    hub: AgentConfigTranslation
    analyzer: AgentConfigTranslation
    deepAgent: AgentConfigTranslation
  }
  training: {
    analyzer: AgentConfigTranslation
    deepAgent: AgentConfigTranslation
  }
}

// ============================================================================
// TRANSLATION RESOURCES
// ============================================================================

export interface TranslationResources {
  agents: AgentsTranslation
  auth: AuthTranslation
  common: CommonTranslation
  navigation: NavigationTranslation
  pages: PagesTranslation
  mcp: MCPTranslation
}

export type NamespaceKey = keyof TranslationResources
