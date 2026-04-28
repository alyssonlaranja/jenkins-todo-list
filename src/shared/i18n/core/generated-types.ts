// ⚠️ ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITAR MANUALMENTE
// Gerado por: scripts/generate-i18n-types.ts
// Para regenerar: npm run generate:i18n-types

export interface AgentsTranslation {
  common: {
    languageInstruction: string
    contextAwareness: string
    mcpEnabled: string
  }
  atlas: {
    quick: {
      name: string
      description: string
      objective: string
      instruction: string
    }
    full: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  kanban: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  upstream: {
    wizard: {
      name: string
      description: string
      objective: string
      instruction: string
    }
    migration: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  downstream: {
    wizard: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  migration: {
    wizard: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  onboarding: {
    wizard: {
      name: string
      description: string
      objective: string
      instruction: string
    }
    manifest: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  feedback: {
    hub: {
      name: string
      description: string
      objective: string
      instruction: string
    }
    analyzer: {
      name: string
      description: string
      objective: string
      instruction: string
      systemPrompt: string
    }
    deepAgent: {
      name: string
      description: string
      objective: string
      instruction: string
      systemPrompt: string
      subagents: {
        patternAnalyzer: {
          name: string
          description: string
          systemPrompt: string
        }
        resolutionAdvisor: {
          name: string
          description: string
          systemPrompt: string
        }
      }
    }
  }
  training: {
    analyzer: {
      name: string
      description: string
      objective: string
      instruction: string
      systemPrompt: string
    }
    deepAgent: {
      name: string
      description: string
      objective: string
      instruction: string
      systemPrompt: string
      subagents: {
        contentWriter: {
          name: string
          description: string
          systemPrompt: string
        }
        quizSpecialist: {
          name: string
          description: string
          systemPrompt: string
        }
        structureAdvisor: {
          name: string
          description: string
          systemPrompt: string
        }
      }
    }
  }
  environment: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  knowledgeBase: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  promptBuilder: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  utilityAgents: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  artifacts: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
  mcpServers: {
    main: {
      name: string
      description: string
      objective: string
      instruction: string
    }
  }
}

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
  of: string
  name: string
  edit: string
  cancel: string
  delete: string
  loading: string
  error: string
  button: {
    save: string
    cancel: string
    delete: string
    deleting: string
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
  apiKeyModal: {
    title: string
    description: string
    instructions: string
    goToPortalButton: string
    createButton: string
    creatingButton: string
    autoCreatedDescription: string
    successMessage: string
    errorMessage: string
    portalErrorMessage: string
  }
  systemStatus: {
    mcpConnected: string
    mcpError: string
    mcpDisconnected: string
    initializing: string
    connectionStatusTooltip: string
    portalEnvironment: string
    activeLicense: string
    activeNamespace: string
    systemLabel: string
  }
  serviceApiKey: {
    title: string
    description: string
    form: {
      keyExpiration: string
      keyExpirationDescription: string
      expirationDate: string
      expirationDateDescription: string
      nonExpiringInfo: string
    }
    info: {
      name: string
      purpose: string
      accessLevel: string
    }
    security: {
      warningTitle: string
      warningMessage: string
      confirmText: string
      cancelText: string
    }
    toast: {
      createSuccess: string
      createError: string
    }
  }
}

export interface CopilotTranslation {
  readables: {
    global: {
      currentUser: {
        description: string
      }
      sessionInfo: {
        description: string
      }
      connectionStatus: {
        description: string
      }
      namespaceContext: {
        description: string
      }
      licenseContext: {
        description: string
      }
    }
    myTasks: {
      kanbanState: {
        description: string
      }
      focusedTask: {
        description: string
      }
      productivityInsights: {
        description: string
      }
      upcomingDeadlines: {
        description: string
      }
      availableActions: {
        description: string
      }
    }
    downstream: {
      feature: {
        description: string
      }
      currentStep: {
        description: string
      }
      stepData: {
        description: string
      }
      requirements: {
        description: string
      }
    }
    navigation: {
      currentModule: {
        description: string
      }
      currentPage: {
        description: string
      }
    }
    atlas: {
      session: {
        description: string
      }
      connection: {
        description: string
      }
      overview: {
        description: string
      }
      viewState: {
        description: string
      }
      selectedFeedback: {
        description: string
      }
      insights: {
        description: string
      }
      capabilities: {
        description: string
      }
      kanbanBoardState: {
        description: string
      }
    }
    kanban: {
      boardState: {
        description: string
      }
      taskCounts: {
        description: string
      }
      overdueTasks: {
        description: string
      }
    }
    upstream: {
      epic: {
        description: string
      }
      currentStep: {
        description: string
      }
      stepData: {
        description: string
      }
      hypotheses: {
        description: string
      }
      selectedHypothesis: {
        description: string
      }
      knowledgeBase: {
        description: string
      }
      bvFrameworkInfo: {
        description: string
      }
    }
    migration: {
      sourceEnv: {
        description: string
      }
      targetEnv: {
        description: string
      }
      currentStep: {
        description: string
      }
      selectedAgents: {
        description: string
      }
      progress: {
        description: string
      }
    }
    onboarding: {
      training: {
        description: string
      }
      currentStep: {
        description: string
      }
      progress: {
        description: string
      }
      quizState: {
        description: string
      }
    }
    feedback: {
      hubState: {
        description: string
      }
      categories: {
        description: string
      }
      statistics: {
        description: string
      }
    }
  }
  actions: {
    spotlight: {
      executeUtilityAgent: {
        description: string
        params: {
          user_input: string
        }
      }
      searchArtifacts: {
        description: string
        params: {
          searchTerm: string
        }
      }
      listArtifacts: {
        description: string
      }
      readArtifact: {
        description: string
        params: {
          key: string
        }
      }
      createArtifact: {
        description: string
        params: {
          key: string
          value: string
          description: string
          type: string
        }
      }
      captureFeedback: {
        description: string
        params: {
          category: string
          title: string
          description: string
          severity: string
          impact: string
          tags: string
        }
      }
      quickBugReport: {
        description: string
        params: {
          issue: string
          severity: string
        }
      }
      suggestFeature: {
        description: string
        params: {
          suggestion: string
          benefit: string
        }
      }
      shareSuccess: {
        description: string
        params: {
          success: string
          impact: string
        }
      }
      rateAgentResponse: {
        description: string
        params: {
          feedback: string
          helpful: string
          agentName: string
        }
      }
      askQuestion: {
        description: string
        params: {
          question: string
          context: string
        }
      }
      shareInsight: {
        description: string
        params: {
          insight: string
          implication: string
        }
      }
      reportError: {
        description: string
        params: {
          errorMessage: string
          context: string
          severity: string
        }
      }
      listSignals: {
        description: string
        params: {
          type: string
        }
      }
      listFeedbacks: {
        description: string
        params: {
          status: string
          category: string
          severity: string
          limit: string
        }
      }
      getFeedbackStatistics: {
        description: string
      }
      navigateToPage: {
        description: string
        params: {
          destination: string
          subpath: string
        }
      }
      createSignal: {
        description: string
        params: {
          type: string
          category: string
          title: string
          content: string
          priority: string
        }
      }
      createTask: {
        description: string
        params: {
          title: string
          description: string
          priority: string
          status: string
          dueDate: string
          tags: string
        }
      }
      listMyTasks: {
        description: string
        params: {
          status: string
        }
      }
      completeTask: {
        description: string
        params: {
          taskTitle: string
        }
      }
      moveTask: {
        description: string
        params: {
          taskTitle: string
          newStatus: string
        }
      }
      deleteTask: {
        description: string
        params: {
          taskTitle: string
        }
      }
      summarizeDay: {
        description: string
      }
      getTaskInsights: {
        description: string
      }
      createContextualTask: {
        description: string
        params: {
          title: string
          notes: string
        }
      }
      taskContext: {
        description: string
      }
    }
    navigation: {
      navigateToPage: {
        description: string
        params: {
          path: string
        }
      }
    }
    signal: {
      createSignal: {
        description: string
        params: {
          type: string
          category: string
          content: string
          priority: string
        }
      }
      listSignals: {
        description: string
        params: {
          type: string
          category: string
        }
      }
    }
    task: {
      createTask: {
        description: string
        params: {
          title: string
          description: string
          priority: string
          dueDate: string
        }
      }
      listMyTasks: {
        description: string
        params: {
          status: string
        }
      }
      completeTask: {
        description: string
        params: {
          taskId: string
        }
      }
      moveTask: {
        description: string
        params: {
          taskId: string
          newStatus: string
        }
      }
      deleteTask: {
        description: string
        params: {
          taskId: string
        }
      }
    }
    artifact: {
      searchArtifacts: {
        description: string
        params: {
          searchTerm: string
        }
      }
      listArtifacts: {
        description: string
        params: {
          cursor: string
        }
      }
      readArtifact: {
        description: string
        params: {
          artifactId: string
        }
      }
      createArtifactForEpic: {
        description: string
        params: {
          name: string
          type: string
          content: string
        }
      }
    }
    agent: {
      executeUtilityAgent: {
        description: string
        params: {
          agentName: string
          prompt: string
        }
      }
    }
    feedback: {
      reportBug: {
        description: string
        params: {
          title: string
          description: string
          severity: string
          module: string
        }
      }
      suggestFeature: {
        description: string
        params: {
          title: string
          description: string
          businessValue: string
          priority: string
        }
      }
      shareImprovement: {
        description: string
        params: {
          title: string
          description: string
          currentBehavior: string
          desiredBehavior: string
        }
      }
      trackDecision: {
        description: string
        params: {
          title: string
          decision: string
          rationale: string
          alternatives: string
        }
      }
      quickNote: {
        description: string
        params: {
          content: string
          category: string
        }
      }
      listFeedbacks: {
        description: string
        params: {
          type: string
          status: string
        }
      }
    }
    mcp: {
      searchArtifactsInNamespace: {
        description: string
        params: {
          query: string
          limit: string
        }
      }
      listAvailableArtifacts: {
        description: string
        params: {
          type: string
        }
      }
      getArtifactDetails: {
        description: string
        params: {
          artifactId: string
        }
      }
      fetchArtifactsForStep: {
        description: string
        params: {
          step: string
          category: string
        }
      }
    }
    knowledge: {
      listKnowledgeDocuments: {
        description: string
        params: {
          category: string
        }
      }
      searchKnowledgeBase: {
        description: string
        params: {
          query: string
        }
      }
      readKnowledgeDocument: {
        description: string
        params: {
          documentId: string
        }
      }
      semanticSearchKnowledgeBase: {
        description: string
        params: {
          query: string
          limit: string
        }
      }
      summarizeKnowledgeDocument: {
        description: string
        params: {
          documentId: string
        }
      }
    }
    atlas: {
      kanban_getBoardOverview: {
        description: string
      }
      kanban_moveFeedback: {
        description: string
        params: {
          feedbackId: string
          toStatus: string
          reason: string
        }
      }
      kanban_getColumnItems: {
        description: string
        params: {
          column: string
          limit: string
          sortBy: string
        }
      }
      kanban_bulkTransition: {
        description: string
        params: {
          fromColumn: string
          toColumn: string
          filter: string
          maxItems: string
        }
      }
      kanban_suggestNextAction: {
        description: string
      }
      add_feedback_comment: {
        description: string
        params: {
          feedbackId: string
          content: string
          commentType: string
        }
      }
      comment_and_move_feedback: {
        description: string
        params: {
          feedbackId: string
          toStatus: string
          reason: string
        }
      }
      read_feedback_comments: {
        description: string
        params: {
          feedbackId: string
        }
      }
      read_feedback_history: {
        description: string
        params: {
          feedbackId: string
        }
      }
      check_related_feedbacks: {
        description: string
        params: {
          feedbackId: string
        }
      }
      analyzePatterns: {
        description: string
        params: {
          timeframe: string
          focusArea: string
        }
      }
      generateReport: {
        description: string
        params: {
          format: string
        }
      }
      findSimilar: {
        description: string
        params: {
          feedbackId: string
        }
      }
      suggestPriorities: {
        description: string
        params: {
          limit: string
        }
      }
      resolveFeedback: {
        description: string
        params: {
          feedbackId: string
          resolution: string
        }
      }
      updateStatus: {
        description: string
        params: {
          feedbackId: string
          status: string
        }
      }
      suggestResolution: {
        description: string
        params: {
          feedbackId: string
        }
      }
      listFeedbacks: {
        description: string
        params: {
          status: string
          category: string
          limit: string
        }
      }
      getFeedbackDetails: {
        description: string
        params: {
          feedbackId: string
        }
      }
      listComments: {
        description: string
        params: {
          feedbackId: string
        }
      }
      captureFeedback: {
        description: string
        params: {
          title: string
          description: string
          category: string
          severity: string
        }
      }
      getKanbanBoard: {
        description: string
        params: Record<string, never>
      }
      moveFeedbackColumn: {
        description: string
        params: {
          feedbackId: string
          targetColumn: string
        }
      }
      deepAnalysis: {
        description: string
        params: {
          analysisType: string
        }
      }
      deepPatterns: {
        description: string
        params: {
          timeRange: string
        }
      }
      deep_analyze: {
        description: string
        params: {
          query: string
          includeReport: string
        }
      }
      analyze_feedback: {
        description: string
        params: {
          feedbackId: string
          title: string
          description: string
          feedbackType: string
        }
      }
    }
    onboarding: {
      presentLesson: {
        description: string
        params: {
          lessonId: string
          format: string
        }
      }
      askLearner: {
        description: string
        params: {
          question: string
          expectedAnswer: string
        }
      }
      startStep: {
        description: string
        params: {
          stepId: string
        }
      }
      demonstrateConcept: {
        description: string
        params: {
          concept: string
          examples: string
        }
      }
      provideFeedback: {
        description: string
        params: {
          response: string
          isCorrect: string
          feedback: string
        }
      }
      navigateToStep: {
        description: string
        params: {
          stepNumber: string
        }
      }
      explainConcept: {
        description: string
        params: {
          concept: string
          depth: string
        }
      }
      summarizeStep: {
        description: string
        params: {
          stepId: string
        }
      }
      askClarification: {
        description: string
        params: {
          topic: string
        }
      }
      getQuizHint: {
        description: string
        params: {
          questionId: string
        }
      }
      explainWrongAnswer: {
        description: string
        params: {
          questionId: string
          wrongAnswer: string
        }
      }
      encourageUser: {
        description: string
        params: {
          context: string
        }
      }
      showProgress: {
        description: string
        params: {
          format: string
        }
      }
      suggestNextStep: {
        description: string
        params: Record<string, never>
      }
      celebrateCompletion: {
        description: string
        params: {
          milestone: string
        }
      }
    }
  }
  suggestions: {
    atlas: {
      global: string
    }
    kanban: {
      board: string
    }
    upstream: {
      step1: string
      step2: string
      step3: string
      step4: string
      step5: string
      step6: string
      step7: string
      knowledgeBase: string
      mcpTools: string
    }
    downstream: {
      step1: string
      step2: string
      step3: string
      step4: string
      step5: string
      step6: string
    }
    migration: {
      main: string
    }
    onboarding: {
      main: string
      quiz: string
    }
    feedback: {
      hub: string
    }
  }
  actionLabels: {
    spotlight: {
      navigateTo: string
      createSignal: string
      captureFeedback: string
      reportBug: string
      registerSuggestion: string
      registerSuccess: string
      registerAssessment: string
      searchArtifacts: string
      listArtifacts: string
      readArtifact: string
      createArtifact: string
      executeAgent: string
      listSignals: string
      listFeedbacks: string
      calculateStats: string
      ui: {
        severity: {
          critical: string
          high: string
          medium: string
          low: string
        }
        status: {
          new: string
          seen: string
          inProgress: string
          resolved: string
          wontFix: string
        }
        labels: {
          description: string
          category: string
          source: string
          general: string
          createdBy: string
          date: string
          tags: string
          viewInHub: string
          searchingFeedbacks: string
          noFeedbackFound: string
          feedback: string
          feedbackRegistered: string
          bugReported: string
          suggestionRegistered: string
          successRegistered: string
          registering: string
        }
      }
    }
    mcp: {
      searchingArtifacts: string
      searchTerm: string
      noArtifactsFound: string
      artifactsFound: string
      listingArtifacts: string
      noArtifactsInNamespace: string
      artifactsInNamespace: string
      gettingArtifactDetails: string
      artifactNotFound: string
      artifact: string
      detailsLoaded: string
      newArtifact: string
      createArtifactReason: string
      contentPreview: string
      noContent: string
      executingUtilityAgent: string
      requestNotSpecified: string
      executeAgentReason: string
      request: string
      fetchingStepDocuments: string
      fetchingHypothesisContext: string
      hypothesis: string
      fetchingValidatedHypotheses: string
      mcpNotAvailable: string
      cannotSearchArtifacts: string
      cannotFetchArtifacts: string
      searchTermRequired: string
      noMacroInitiativeId: string
      hypothesisNotFound: string
    }
    knowledgeBase: {
      listingDocuments: string
      filter: string
      searchingDocuments: string
      query: string
      readingDocument: string
      document: string
      semanticSearch: string
      summarizingDocument: string
      noDocumentsFound: string
      documentsFound: string
      documentNotFound: string
      noContent: string
    }
    feedback: {
      listingFeedbacks: string
      trackingCustomization: string
    }
    context: {
      stageNames: {
        '1': string
        '2': string
        '3': string
        '4': string
        '5': string
        '6': string
        '7': string
      }
      slotTypeLabels: {
        general: string
        market_insights: string
        stakeholder_mapping: string
        qualitative_data: string
        quantitative_data: string
        preliminary_results: string
        technical_data: string
        usability_test: string
        actor_mapping: string
      }
    }
    upstream: {
      searchArtifactsByText: string
      getArtifactByPattern: string
      searchArtifactsByTags: string
      listArtifactTypes: string
      readArtifactContent: string
      updateArtifact: string
      editArtifactContent: string
      validateArtifactType: string
      setArtifactVersionProduction: string
      listKnowledgeDocuments: string
      searchKnowledgeBase: string
      readKnowledgeDocument: string
      semanticSearchKnowledgeBase: string
      summarizeKnowledgeDocument: string
      getAgentCard: string
      executeUtilityAgent: string
      step1_suggestMacroInitiativeName: string
      step1_suggestDescription: string
      step1_suggestInitialBusinessValue: string
      step1_suggestLinkedOKRs: string
      step1_suggestProblemStatement: string
      step1_suggestHypothesis: string
      step1_suggestStrategicAlignment: string
      step2_suggestCSDMatrixItem: string
      step2_suggestOpportunityTreeItem: string
      step2_suggestStakeholder: string
      step2_suggestInitialRisk: string
      step2_suggestMainProblems: string
      step3_suggestValidationMethod: string
      step3_suggestQualitativeResults: string
      step3_suggestQuantitativeResults: string
      step3_suggestHypothesisConclusion: string
      step4_suggestDependency: string
      step4_suggestMitigationPlan: string
      step5_suggestKPI: string
      step5_suggestResponsibilityAgreement: string
      step6_suggestFinalBusinessValue: string
      step6_suggestPrioritizationRationale: string
      step6_suggestNextSteps: string
      listMCPPrompts: string
      getMCPPrompt: string
      executeMCPPrompt: string
      listMCPResources: string
      getMCPResource: string
    }
    downstream: {
      stageNames: {
        '1': string
        '2': string
        '3': string
        '4': string
        '5': string
        '6': string
      }
    }
    migrationWizard: {
      stepNames: {
        '1': string
        '2': string
        '3': string
        '4': string
        '5': string
      }
    }
    myTasks: {
      adding: string
      added: string
      errorAdding: string
      moving: string
      moved: string
      errorMoving: string
      activatingFocus: string
      focusMode: string
      errorFocus: string
      searching: string
      focusMessage: string
      changingPriority: string
      priorityChanged: string
      errorPriority: string
      analyzingKanban: string
      error: string
      kanbanOverview: string
      boardSummary: string
      total: string
      inProgress: string
      critical: string
      overdue: string
      analyzingWorkflow: string
      generatingSuggestions: string
      inboxZero: string
      noActiveTasks: string
      workflowSuggestion: string
      alternatives: string
    }
  }
}

export interface McpTranslation {
  common: {
    name: string
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
    of: string
  }
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
        demoModeLabel: string
        custom: string
        session: string
        description: string
        showAllTools: string
        showLess: string
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
        environment: string
        namespace: string
      }
      time: {
        never: string
        justNow: string
        minutesAgo: string
        hoursAgo: string
        daysAgo: string
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
  upstream: {
    title: string
    subtitle: string
    description: string
    stats: {
      totalEpics: string
      features: string
      userStories: string
    }
    steps: {
      ideacao: {
        label: string
        title: string
        description: string
        agentName: string
      }
      viabilidade: {
        label: string
        title: string
        description: string
        agentName: string
      }
      priorizacao: {
        label: string
        title: string
        description: string
        agentName: string
      }
      refinamento: {
        label: string
        title: string
        description: string
        agentName: string
      }
      aprovacao: {
        label: string
        title: string
        description: string
        agentName: string
      }
      acompanhamento: {
        label: string
        title: string
        description: string
        agentName: string
      }
    }
    emptyState: {
      title: string
      description: string
      quickInfo: {
        framework: {
          title: string
          description: string
        }
        aiPowered: {
          title: string
          description: string
        }
        lifecycle: {
          title: string
          description: string
        }
      }
    }
    hero: {
      title: string
      subtitle: string
      description: string
    }
    features: {
      okrAlignment: {
        title: string
        description: string
      }
      aiPowered: {
        title: string
        description: string
      }
      businessValue: {
        title: string
        description: string
      }
    }
    tabs: {
      setupGroup: string
      modusGroup: string
      environments: string
      connections: string
      upstream: string
      loadingConnections: string
    }
    workspace: {
      loadingEnvironment: string
      loadingEnvironmentDescription: string
      noEnvironment: string
      noEnvironmentDescription: string
      loadingConnection: string
      loadingConnectionDescription: string
      syncingConnections: string
      noConnection: string
      noConnectionDescription: string
    }
    knowledgeBase: {
      title: string
      document: string
      documents: string
      dropFilesHere: string
      dragAndDrop: string
      supportedFormats: string
      emptyState: string
      status: {
        processing: string
        ready: string
        error: string
      }
    }
    wizard: {
      title: string
      subtitle: string
      badge: string
      epicTitle: string
      epicProgress: string
      of: string
      stepStatus: {
        completed: string
        current: string
        pending: string
      }
      progress: {
        step: string
      }
      stages: {
        ideation: string
        ideationDesc: string
        immersion: string
        immersionDesc: string
        validation: string
        validationDesc: string
        exploration: string
        explorationDesc: string
        analysis: string
        analysisDesc: string
        prioritization: string
        prioritizationDesc: string
        transition: string
        transitionDesc: string
      }
      hypotheses: {
        title: string
        new: string
        create: string
        edit: string
        delete: string
        duplicate: string
        noHypotheses: string
        createFirst: string
        inProgress: string
        completed: string
        validated: string
        rejected: string
        statement: string
        statementPlaceholder: string
        statementRequired: string
        statementMinLength: string
        statementTip: string
        type: string
        types: {
          value: string
          valueDesc: string
          usability: string
          usabilityDesc: string
          feasibility: string
          feasibilityDesc: string
          viability: string
          viabilityDesc: string
        }
        status: {
          draft: string
          exploring: string
          validating: string
          validated: string
          rejected: string
          pivoted: string
          needs_more_data: string
          pending: string
        }
        linkedOKRs: string
        linkedOKRsTip: string
        progress: string
        evidence: string
        evidences: string
        owner: string
        collaborators: string
        saveChanges: string
      }
      hypothesis: {
        noSelection: string
        selectForImmersion: string
        selectForValidation: string
        exploringLabel: string
        validatingLabel: string
        dataForHypothesis: string
        selectRequired: string
        selectRequiredDescription: string
      }
      navigation: {
        next: string
        previous: string
        save: string
        cancel: string
        finish: string
      }
      actions: {
        cancelClose: string
        fullscreen: string
        exitFullscreen: string
        saveDraft: string
        saving: string
        viewOutputs: string
      }
      knowledgeBase: {
        title: string
        document: string
        documents: string
        loading: string
        count: string
        missingSteps: string
        allComplete: string
        statusPopover: {
          title: string
          allCompleteTitle: string
          allCompleteDescription: string
          stepComplete: string
          stepMissing: string
          requiredTypes: string
          helpTip: string
          bvFrameworkNote: string
          bvInputLabel: string
          slotTypes: {
            general: string
            marketInsights: string
            okrs: string
            registeredHypotheses: string
            hypothesisInput: string
            qualitativeData: string
            quantitativeData: string
            prioritizedHypotheses: string
            preliminaryResults: string
            validatedMacroInitiative: string
            validatedHypotheses: string
            technicalData: string
            functionalData: string
            prioritizedBacklog: string
            technicalAnalysis: string
            businessAnalysis: string
          }
          slotDescriptions: {
            general: string
            marketInsights: string
            okrs: string
            registeredHypotheses: string
            hypothesisInput: string
            qualitativeData: string
            quantitativeData: string
            prioritizedHypotheses: string
            preliminaryResults: string
            validatedMacroInitiative: string
            validatedHypotheses: string
            technicalData: string
            functionalData: string
            prioritizedBacklog: string
            technicalAnalysis: string
            businessAnalysis: string
          }
          slotBvInputs: {
            general: string
            marketInsights: string
            okrs: string
            registeredHypotheses: string
            hypothesisInput: string
            qualitativeData: string
            quantitativeData: string
            prioritizedHypotheses: string
            preliminaryResults: string
            validatedMacroInitiative: string
            validatedHypotheses: string
            technicalData: string
            functionalData: string
            prioritizedBacklog: string
            technicalAnalysis: string
            businessAnalysis: string
          }
        }
        inputRequirements: {
          slotTypes: {
            general: string
            marketInsights: string
            okrs: string
            registeredHypotheses: string
            hypothesisInput: string
            qualitativeData: string
            quantitativeData: string
            prioritizedHypotheses: string
            preliminaryResults: string
            validatedMacroInitiative: string
            validatedHypotheses: string
            technicalData: string
            functionalData: string
            prioritizedBacklog: string
            technicalAnalysis: string
            businessAnalysis: string
          }
          slotDescriptions: {
            general: string
            marketInsights: string
            okrs: string
            registeredHypotheses: string
            hypothesisInput: string
            qualitativeData: string
            quantitativeData: string
            prioritizedHypotheses: string
            preliminaryResults: string
            validatedMacroInitiative: string
            validatedHypotheses: string
            technicalData: string
            functionalData: string
            prioritizedBacklog: string
            technicalAnalysis: string
            businessAnalysis: string
          }
        }
      }
      knowledgeSlots: {
        basicView: string
        slotsView: string
        title: string
        document: string
        documents: string
        filterByType: string
        allTypes: string
        loading: string
        stageInfo: string
        stageInfoDescription: string
        dropHere: string
        dragDrop: string
      }
      stageInputs: {
        title: string
        buttonLabel: string
        buttonLabelWithCount: string
        expandTooltip: string
        collapseTooltip: string
        headerTitle: string
        headerSubtitle: string
        allComplete: string
        allCompleteSubtitle: string
        missingCount: string
        missingCountPlural: string
        addDocument: string
        viewDocument: string
        copilotHint: string
        copilotSuggestion: string
        slotStatus: {
          filled: string
          missing: string
          optionalEmpty: string
        }
        optional: string
        progressLabel: string
        progressComplete: string
        actions: {
          askCopilot: string
          uploadFile: string
          skipForNow: string
        }
      }
      saving: {
        inProgress: string
        autoSave: string
      }
      validation: {
        pleaseComplete: string
        requiredFields: string
      }
      outputs: {
        description: string
        footer: string
        download: string
        downloadSuccess: string
        ideation: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
        }
        immersion: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
          item5: string
        }
        validation: {
          title: string
          item1: string
          item2: string
        }
        exploration: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
          item5: string
          item6: string
        }
        analysis: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
          item5: string
        }
        prioritization: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
          item5: string
          item6: string
        }
        transition: {
          title: string
          item1: string
          item2: string
          item3: string
          item4: string
        }
      }
      toast: {
        epicSavedTitle: string
        epicSavedDescription: string
        saveErrorTitle: string
        saveErrorDescription: string
      }
      markdownPreview: {
        noContent: string
        title: string
      }
      steps: {
        ideation: {
          title: string
          description: string
          fields: {
            name: string
            namePlaceholder: string
            epicName: string
            epicNamePlaceholder: string
            description: string
            descriptionPlaceholder: string
            charactersCount: string
            linkedOKRs: string
            linkedOKRsPlaceholder: string
            businessValue: string
            businessValueHelp: string
            valueLow: string
            valueMedium: string
            valueHigh: string
            problemStatement: string
            problemStatementPlaceholder: string
            problemStatementHelp: string
            hypothesis: string
            hypotheses: string
            hypothesesHelp: string
            hypothesisPlaceholder: string
            hypothesisHelp: string
            hypothesisAddHint: string
            addMoreHypotheses: string
            addButton: string
            strategicAlignment: string
            strategicAlignmentPlaceholder: string
            strategicAlignmentHelp: string
          }
          bvFramework: {
            title: string
          }
          outputsTitle: string
          outputs: string
          alerts: {
            nameRequired: string
            descriptionRequired: string
            okrRequired: string
            hypothesisRequired: string
            problemStatementRequired: string
          }
          hypotheses: {
            singular: string
            plural: string
            createdHelp: string
            none: string
            types: {
              value: string
              usability: string
              feasibility: string
              viability: string
            }
          }
          nextStep: string
        }
        immersion: {
          title: string
          description: string
          csdMatrix: string
          certainties: string
          certaintyPlaceholder: string
          assumptions: string
          assumptionPlaceholder: string
          doubts: string
          doubtPlaceholder: string
          stakeholders: string
          stakeholderName: string
          stakeholderRole: string
          stakeholderDepartment: string
          addStakeholder: string
          influenceLow: string
          influenceMedium: string
          influenceHigh: string
          mainProblems: string
          mainProblemsHelp: string
          mainProblemPlaceholder: string
          noProblems: string
          opportunityTree: string
          opportunityPlaceholder: string
          initialRisks: string
          riskPlaceholder: string
          outputsTitle: string
          outputs: string
          back: string
          nextStep: string
          alerts: {
            csdRequired: string
            stakeholderRequired: string
          }
        }
        validation: {
          title: string
          description: string
          newHypothesis: string
          editHypothesis: string
          descriptionLabel: string
          descriptionPlaceholder: string
          typeLabel: string
          typeValue: string
          typeValueOption: string
          typeUsability: string
          typeUsabilityOption: string
          typeFeasibility: string
          typeFeasibilityOption: string
          typeViability: string
          typeViabilityOption: string
          statusLabel: string
          statusPending: string
          statusValidated: string
          statusRejected: string
          methodLabel: string
          methodPlaceholder: string
          methodDisplay: string
          evidenceLabel: string
          evidencePlaceholder: string
          evidenceDisplay: string
          evidenceLevelLabel: string
          evidenceLevelWeak: string
          evidenceLevelMedium: string
          evidenceLevelNone: string
          evidenceLevelStrong: string
          evidenceLevelHint: string
          resetStatus: string
          evidenceQualitative: string
          evidenceQuantitative: string
          evidenceSource: string
          addEvidence: string
          noEvidence: string
          qualitativeResults: string
          qualitativeResultsPlaceholder: string
          quantitativeResults: string
          quantitativeResultsPlaceholder: string
          addButton: string
          updateButton: string
          editButton: string
          deleteButton: string
          cancelButton: string
          listTitle: string
          emptyState: string
          statsTotal: string
          statsValidated: string
          statsRejected: string
          statsPending: string
          outputsTitle: string
          outputs: string
          back: string
          nextStep: string
          alerts: {
            descriptionRequired: string
            hypothesisRequired: string
            pendingWarning: string
          }
        }
        exploration: {
          title: string
          description: string
          macroRequirementsLabel: string
          macroRequirementPlaceholder: string
          noMacroRequirements: string
          macroRequirementsHelp: string
          businessFlowLabel: string
          businessFlowPlaceholder: string
          businessFlowMermaidPlaceholder: string
          businessFlowHelp: string
          openBusinessFlow: string
          generateMermaid: string
          userJourneyLabel: string
          userJourneyPlaceholder: string
          userJourneyMermaidPlaceholder: string
          userJourneyHelp: string
          openUserJourney: string
          actorMappingLabel: string
          actorName: string
          actorType: string
          actorTypeInternal: string
          actorTypeExternal: string
          actorCriticality: string
          criticalityLow: string
          criticalityMedium: string
          criticalityHigh: string
          criticalityCritical: string
          addActor: string
          noActors: string
          actorMappingHelp: string
          usabilityTestLabel: string
          usabilityTestDateLabel: string
          usabilityTestParticipants: string
          usabilityTestParticipantsPlaceholder: string
          usabilityTestResultsLabel: string
          usabilityTestResultsPlaceholder: string
          usabilityTestCriticalIssues: string
          criticalIssues: string
          criticalIssue: string
          criticalIssuePlaceholder: string
          issueResolution: string
          resolutionPending: string
          resolutionInProgress: string
          resolutionResolved: string
          addCriticalIssue: string
          noCriticalIssues: string
          usabilityTestHelp: string
          metricsLabel: string
          metricsDescription: string
          metricRequirementsCount: string
          metricActorsIdentified: string
          metricCriticalIssues: string
          metricCriticalResolved: string
          metricUsabilityScore: string
          validatedHypothesesTitle: string
          noValidatedHypotheses: string
          validatedHypothesesHelp: string
          outputsTitle: string
          outputs: string
          back: string
          nextStep: string
          alerts: {
            macroRequirementsRequired: string
            actorMappingRequired: string
            criticalIssuesWarning: string
          }
        }
        analysis: {
          title: string
          description: string
          blueprintLabel: string
          blueprintPlaceholder: string
          blueprintMermaidPlaceholder: string
          blueprintHelp: string
          openBlueprint: string
          journeyLabel: string
          journeyPlaceholder: string
          journeyHelp: string
          openJourney: string
          impactLabel: string
          impactPlaceholder: string
          impactHelp: string
          gapLabel: string
          gapPlaceholder: string
          gapHelp: string
          dependenciesLabel: string
          dependencyPlaceholder: string
          noDependencies: string
          mitigationLabel: string
          mitigationPlaceholder: string
          noMitigation: string
          architectureNoticeTitle: string
          architectureNotice: string
          outputsTitle: string
          outputs: string
          back: string
          nextStep: string
          alerts: {
            blueprintRequired: string
            impactRequired: string
            gapRequired: string
          }
        }
        prioritization: {
          title: string
          description: string
          businessValue: string
          effort: string
          riskLevel: string
          riskLow: string
          riskMedium: string
          riskHigh: string
          riskCritical: string
          low: string
          high: string
          analysisTitle: string
          roiScore: string
          roiHelp: string
          moscowLabel: string
          mustHave: string
          mustHaveDesc: string
          shouldHave: string
          shouldHaveDesc: string
          couldHave: string
          couldHaveDesc: string
          wontHave: string
          wontHaveDesc: string
          matrixTitle: string
          highValue: string
          lowValue: string
          lowEffort: string
          highEffort: string
          kpisLabel: string
          kpiPlaceholder: string
          noKpis: string
          qbrLabel: string
          qbrGuidelines: string
          qbrPlaceholder: string
          qbrCharCount: string
          outputsTitle: string
          outputs: string
          moscowTitle: string
          moscowDescription: string
          strategicAdherenceTitle: string
          strategicAdherenceHelp: string
          strategicThemeLabel: string
          strategicThemePlaceholder: string
          strategicThemeHint: string
          strategicAdherenceLabel: string
          strategicAdherenceHint: string
          strategicJustificationLabel: string
          strategicJustificationPlaceholder: string
          strategicJustificationHint: string
          valuePlanTitle: string
          valuePlanHelp: string
          valuePlanLabel: string
          valuePlanPlaceholder: string
          preliminaryKPIsLabel: string
          addKPI: string
          noKPIsYet: string
          kpiName: string
          kpiNamePlaceholder: string
          kpiDescription: string
          kpiDescriptionPlaceholder: string
          kpiUnit: string
          kpiUnitPlaceholder: string
          kpiBaseline: string
          kpiBaselinePlaceholder: string
          kpiTarget: string
          kpiTargetPlaceholder: string
          kpiFrequency: string
          frequencyDaily: string
          frequencyWeekly: string
          frequencyMonthly: string
          frequencyQuarterly: string
          back: string
          nextStep: string
          alerts: {
            kpiRequired: string
            qbrRequired: string
          }
        }
        transition: {
          title: string
          description: string
          summaryTitle: string
          linkedOKRs: string
          stakeholders: string
          hypothesesValidated: string
          dependencies: string
          businessValue: string
          effort: string
          riskLevel: string
          okrsLabel: string
          stakeholdersLabel: string
          hypothesesLabel: string
          dependenciesLabel: string
          businessValueLabel: string
          effortLabel: string
          riskLevelLabel: string
          riskLow: string
          riskMedium: string
          riskHigh: string
          riskCritical: string
          kpisLabel: string
          kpisCount: string
          noKpis: string
          squadLabel: string
          squadPlaceholder: string
          squadHelp: string
          targetSquadLabel: string
          targetSquadPlaceholder: string
          targetSquadHelp: string
          jiraLabel: string
          jiraBacklogLabel: string
          jiraPlaceholder: string
          jiraHelp: string
          openJira: string
          viewJira: string
          handoffLabel: string
          handoffGuidelines: string
          handoffPlaceholder: string
          handoffCharCount: string
          featuresLabel: string
          featuresGuidelineTitle: string
          featuresGuidelines: string
          featuresPlaceholder: string
          featuresCharCount: string
          agreementsLabel: string
          agreementsHelp: string
          noAgreements: string
          levelLabel: string
          roleLabel: string
          roleLNT: string
          roleLPT: string
          roleLTT: string
          addAgreement: string
          responsibilitiesLabel: string
          responsibilityPlaceholder: string
          responsibilityHelp: string
          bigRoomTitle: string
          bigRoomDescription: string
          bigRoomLabel: string
          bigRoomSteps: string
          outputsTitle: string
          outputs: string
          completionTitle: string
          completionMessage: string
          stepIdeation: string
          stepImmersion: string
          stepValidation: string
          stepAnalysis: string
          stepPrioritization: string
          stepTransition: string
          back: string
          complete: string
          completeButton: string
          noBeDescription: string
          aiSuggestionTitle: string
          aiSuggestionDescription: string
          aiSuggestionHint: string
          validatedHypothesesBadge: string
          requirementsBadge: string
          stakeholdersBadge: string
          beCreated: string
          beUpdated: string
          beDeleted: string
          alerts: {
            squadRequired: string
            jiraRequired: string
            handoffRequired: string
            featuresRequired: string
            beRequired: string
            agreementRequired: string
            responsibilityRequired: string
          }
        }
      }
      stepLabel: string
      involvedRoles: string
      roleDescriptions: {
        lptLnt: string
        ltt: string
        lcio: string
        bo: string
        pm: string
        pd: string
        ans: string
        itl: string
        it: string
        qaCross: string
      }
      stepSummary: string
      outputPreview: {
        stages: {
          '1': string
          '2': string
          '3': string
          '4': string
          '5': string
          '6': string
          '7': string
        }
        sections: {
          epicInfo: string
          name: string
          description: string
          bvFrameworkHypothesis: string
          problemStatement: string
          centralHypothesis: string
          strategicAlignment: string
          linkedOKRs: string
          initialBusinessValue: string
          score: string
          csdMatrix: string
          certainties: string
          suppositions: string
          doubts: string
          mainProblems: string
          opportunityTree: string
          stakeholders: string
          initialRisks: string
          hypotheses: string
          hypothesis: string
          type: string
          status: string
          evidenceLevel: string
          validationMethod: string
          evidence: string
          macroRequirements: string
          businessFlow: string
          userJourney: string
          actorMapping: string
          usabilityTest: string
          criticalIssues: string
          resolvedIssues: string
          architectureBlueprint: string
          impactAnalysis: string
          gapAnalysis: string
          dependencies: string
          mitigationPlans: string
          businessMetrics: string
          finalBusinessValue: string
          effort: string
          riskLevel: string
          bvFrameworkValuePlan: string
          valuePlan: string
          preliminaryKPIs: string
          kpis: string
          theme: string
          adherence: string
          justification: string
          qbrMemo: string
          prioritizedBacklog: string
          jiraIntegration: string
          backlogLink: string
          handoff: string
          document: string
          targetSquad: string
          responsibilityAgreements: string
          features: string
          url: string
          results: string
          businessEpics: string
          scope: string
          targetTribe: string
          jiraBacklogUrl: string
          transitionStatus: string
          handoffDocument: string
        }
        table: {
          name: string
          role: string
          department: string
          influence: string
          type: string
          criticality: string
          kpiName: string
          kpiDescription: string
          target: string
          baseline: string
          unit: string
          frequency: string
          priority: string
          sprints: string
          criteria: string
          level: string
          responsibility: string
        }
        notDefined: string
        notDefinedYet: string
        noItemsYet: string
        items: string
        problemDefined: string
        hypothesisFormulated: string
        suggestedOKRs: string
        businessValue: string
        stakeholdersIdentified: string
        technicalComplexity: string
        estimatedEffort: string
        dependenciesMapped: string
        technicalRisks: string
        priorityScore: string
        urgency: string
        businessImpact: string
        alignmentWithOKRs: string
        detailedRequirements: string
        documented: string
        acceptanceCriteria: string
        technicalApproach: string
        defined: string
        integrationPoints: string
        approvals: string
        approvedBudget: string
        approvedTimeline: string
        status: string
        progress: string
        activeBlockers: string
        nextSteps: string
      }
      markdown: {
        defined: string
        completed: string
        linked: string
        documented: string
        validated: string
        identified: string
        mapped: string
        actors: string
        critical: string
        epicName: string
        hypothesis: string
        strategicAlignment: string
        linkedOKRs: string
        businessValue: string
        csdMatrix: string
        certainties: string
        suppositions: string
        doubts: string
        stakeholders: string
        hypotheses: string
        macroRequirements: string
        actorMapping: string
        usabilityIssues: string
        businessFlow: string
        architectureBlueprint: string
        dependencies: string
        impactAnalysis: string
        finalBusinessValue: string
        riskLevel: string
        valuePlan: string
        preliminaryKPIs: string
        kpis: string
        jiraBacklog: string
        targetSquad: string
        features: string
        businessEpics: string
        totalFeatures: string
        handoffDocument: string
        responsibilityAgreements: string
        accepted: string
        withExplorationData: string
        initialRisks: string
        effort: string
        sprints: string
        qbrMemo: string
        riskLevels: {
          low: string
          medium: string
          high: string
          critical: string
        }
      }
      completeStep: string
    }
    epic: {
      create: string
      save: string
      cancel: string
      delete: string
      duplicate: string
      deleteConfirm: string
      deleteWarning: string
      deleteError: string
      table: {
        stage: string
        businessValue: string
        businessEpics: string
        features: string
        created: string
      }
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
        backButton: string
        hero: {
          title: string
          level: string
          totalPower: string
          xp: string
        }
        stats: {
          activeQuests: string
          completed: string
          winRate: string
          teamMorale: string
        }
        questBoard: {
          title: string
          level: string
          risk: string
          blockers: string
          questProgress: string
          tasks: string
          reward: string
          daysInStage: string
          checkpoints: string
          loot: string
          viewAll: string
          showLess: string
        }
        inventory: {
          title: string
          stage: string
          lvl: string
        }
        achievements: {
          title: string
          epicMaster: string
          qbrChampion: string
          innovationHero: string
        }
        tabs: {
          checkpoints: string
          loot: string
          party: string
        }
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
      backToMarketplace: string
      selectView: string
    }
    badge: string
    modes: {
      gamified: {
        name: string
        subtitle: string
        description: string
      }
      executive: {
        name: string
        subtitle: string
        description: string
      }
      hr: {
        name: string
        subtitle: string
        description: string
      }
      meta: {
        name: string
        subtitle: string
        description: string
      }
    }
    aiChat: {
      placeholder: string
      emptyState: {
        title: string
        subtitle: string
      }
      generating: string
      error: string
      stop: string
      send: string
      untitledHypothesis: string
    }
    connection: {
      status: {
        connected: string
        disconnected: string
      }
      actions: {
        change: string
        viewDetails: string
        minimize: string
      }
      empty: {
        title: string
        description: string
      }
      selector: {
        title: string
        subtitle: string
      }
      details: {
        environment: string
        license: string
        namespace: string
        utilityAgent: string
        tools: string
      }
    }
    copilot: {
      riskLevels: {
        low: string
        medium: string
        high: string
        critical: string
      }
      suggestionCard: {
        generating: string
        applied: string
        reasoning: string
        accept: string
        reject: string
        changesApplied: string
        processing: string
        executing: string
        rejected: string
        executingAgent: string
        agentCompleted: string
        agentExecuted: string
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
          validationMethod: string
          evidence: string
          validationResults: string
          conclusion: string
        }
        step4: {
          macroRequirements: string
          userJourney: string
          actors: string
          usabilityTest: string
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
          suggestBusinessEpics: string
          suggestFeatures: string
          handoffDocument: string
          responsibilityAgreements: string
          targetSquad: string
          transition: string
        }
        knowledgeBase: {
          analyzeMissing: string
          helpWithInput: string
          suggestSources: string
          reviewDocuments: string
          extractInsights: string
        }
        initial: {
          startWithDocuments: string
          analyzeInputs: string
        }
        inputDocumentsLabel: string
        noDocumentsLabel: string
        priorityHint: string
      }
      suggestions: {
        titles: {
          epicName: string
          macroInitiativeName: string
          businessValue: string
          initialBusinessValue: string
          description: string
          linkedOKRs: string
          problemStatement: string
          centralHypothesis: string
          hypothesis: string
          strategicAlignment: string
          stakeholders: string
          csdMatrix: string
          mainProblems: string
          opportunityTree: string
          initialRisks: string
          hypotheses: string
          dataSources: string
          validationMethod: string
          validationResults: string
          validationConclusion: string
          evidence: string
          kpis: string
          macroRequirements: string
          businessFlowUrl: string
          businessFlowMermaid: string
          actorMapping: string
          blueprintUrl: string
          blueprintMermaid: string
          impactAnalysis: string
          gapAnalysis: string
          userJourneyUrl: string
          userJourneyMermaid: string
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
          usabilityTest: string
          capabilityAssessment: string
          utilityAgent: string
          targetSquad: string
          jiraBacklog: string
          handoffDocument: string
          features: string
          responsibilityAgreements: string
          createArtifact: string
          updateArtifact: string
          setArtifactVersion: string
          editArtifactContent: string
          hypothesisForSidebar: string
          businessEpic: string
          feature: string
          targetSquadTribe: string
          transitionStatus: string
          responsibilityAgreement: string
        }
        hypothesisSidebarHint: string
      }
      assistant: {
        title: string
        welcomeMessage: string
        languageInstruction: string
        languageRule: string
        communicationRules: string
        systemInstructions: string
        personalizedWelcome: string
        organizationalContext: string
      }
      openAssistant: string
      closeAssistant: string
      aiAssistant: string
      exampleLabels: {
        low: string
        high: string
      }
      errors: {
        noHypothesisSelected: string
        csdMatrixRequiresHypothesis: string
        stakeholderRequiresHypothesis: string
        opportunityTreeRequiresHypothesis: string
        riskRequiresHypothesis: string
        validationRequiresHypothesis: string
        validationResultsRequiresHypothesis: string
        validationConclusionRequiresHypothesis: string
        dataSourcesRequiresHypothesis: string
        evidenceRequiresHypothesis: string
        noBusinessEpicSelected: string
        businessEpicNotFound: string
        selectValidBusinessEpic: string
        featureRequiresBusinessEpic: string
        squadTribeRequiresBusinessEpic: string
        statusRequiresBusinessEpic: string
      }
    }
    hypothesis: {
      sidebar: {
        title: string
        new: string
        validated: string
        inProgress: string
        rejected: string
        noHypotheses: string
        noValidatedHypotheses: string
        createFirst: string
        inProgressGroup: string
        completedGroup: string
        viewDetails: string
        validatedCount: string
      }
      form: {
        newTitle: string
        editTitle: string
        newDescription: string
        editDescription: string
        statementLabel: string
        statementPlaceholder: string
        statementHint: string
        typeLabel: string
        typePlaceholder: string
        linkedOKRsLabel: string
        linkedOKRsHint: string
        cancel: string
        create: string
        saveChanges: string
        errors: {
          statementRequired: string
          statementMinLength: string
        }
      }
      createdBy: string
      validation: {
        awaitingValidation: string
        conclusion: {
          validated: string
          rejected: string
          needsMoreData: string
          pivotNeeded: string
        }
      }
      types: {
        value: {
          label: string
          description: string
        }
        usability: {
          label: string
          description: string
        }
        feasibility: {
          label: string
          description: string
        }
        viability: {
          label: string
          description: string
        }
      }
    }
    businessEpic: {
      title: string
      untitled: string
      features: string
      features_plural: string
      viewFeatures: string
      status: {
        pending: string
        handedOff: string
        accepted: string
      }
      sidebar: {
        title: string
        pending: string
        handedOff: string
        accepted: string
        totalFeatures: string
        businessEpics: string
        noBusinessEpics: string
        createFirst: string
        addBusinessEpic: string
        expand: string
      }
      form: {
        createTitle: string
        editTitle: string
        basicInfo: string
        name: string
        namePlaceholder: string
        description: string
        descriptionPlaceholder: string
        scope: string
        scopePlaceholder: string
        teamInfo: string
        targetSquad: string
        targetSquadPlaceholder: string
        targetTribe: string
        targetTribePlaceholder: string
        jiraIntegration: string
        jiraBacklogUrl: string
        jiraBacklogUrlPlaceholder: string
        jiraEpicKey: string
        jiraEpicKeyPlaceholder: string
        transitionStatus: string
        features: string
        featuresDescription: string
        noFeatures: string
        addFeature: string
        featureName: string
        featureNamePlaceholder: string
        featureDescription: string
        featureDescriptionPlaceholder: string
        priority: string
        estimatedSprints: string
        acceptanceCriteria: string
        acceptanceCriteriaPlaceholder: string
        noCriteria: string
        dependencies: string
        dependenciesPlaceholder: string
        noDependencies: string
        featureJiraKey: string
        featureJiraKeyPlaceholder: string
        cancel: string
        save: string
        moscow: {
          must: string
          should: string
          could: string
          wont: string
        }
        validation: {
          nameRequired: string
          squadRequired: string
        }
      }
    }
    feedback: {
      sidebar: {
        title: string
        expand: string
        addFeedback: string
        search: string
        filterCategory: string
        filterStatus: string
        allCategories: string
        allStatuses: string
        noFeedbacks: string
        noMatchingFeedbacks: string
        showing: string
      }
      categories: {
        bug: string
        error: string
        doubt: string
        suggestion: string
        customization: string
        praise: string
        learning: string
      }
      severity: {
        low: string
        medium: string
        high: string
        critical: string
      }
      status: {
        new: string
        acknowledged: string
        in_progress: string
        resolved: string
        wont_fix: string
      }
      actions: {
        reportBug: string
        askQuestion: string
        suggestImprovement: string
        trackingCustomization: string
        givePraise: string
        listingFeedbacks: string
      }
      messages: {
        bugReported: string
        questionRegistered: string
        suggestionRecorded: string
        customizationTracked: string
        praiseRecorded: string
        cancelled: string
        noFeedbacks: string
        noMatchingFeedbacks: string
        created: string
        updated: string
        deleted: string
        deleteFailed: string
        saveFailed: string
      }
      summary: {
        title: string
        total: string
        recent: string
        byCategory: string
      }
      list: {
        title: string
      }
      filter: string
      noDescription: string
      showLess: string
      showMore: string
      details: {
        description: string
        field: string
        reproductionSteps: string
        expected: string
        actual: string
        aiSuggestion: string
        userChoice: string
        tags: string
        createdBy: string
      }
      form: {
        createTitle: string
        editTitle: string
        description: string
        errors: string
        category: string
        severity: string
        selectSeverity: string
        title: string
        titlePlaceholder: string
        descriptionPlaceholder: string
        fieldOrAction: string
        fieldOrActionPlaceholder: string
        reproductionSteps: string
        addStep: string
        expectedBehavior: string
        expectedPlaceholder: string
        actualBehavior: string
        actualPlaceholder: string
        tags: string
        addTag: string
        contextInfo: string
        step: string
        submit: string
        update: string
      }
    }
    governance: {
      status: {
        validated: {
          short: string
          full: string
        }
        notValidated: {
          short: string
          full: string
        }
        approved: {
          short: string
          full: string
        }
        notApproved: {
          short: string
          full: string
        }
        pending: {
          short: string
          full: string
        }
      }
      checkpoints: {
        strategyReview: {
          name: string
          shortName: string
          description: string
          keyQuestion: string
          phase: string
          activities: {
            '0': string
            '1': string
            '2': string
          }
          outputs: string
          decisionPoint: string
        }
        qbrGathering: {
          name: string
          shortName: string
          description: string
          keyQuestion: string
          phase: string
          activities: {
            '0': string
            '1': string
            '2': string
            '3': string
          }
          outputs: string
          decisionPoint: string
        }
      }
      tooltip: {
        keyQuestion: string
        phase: string
        activities: string
        outputs: string
        decision: string
        clickToChange: string
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
      alerts: {
        warning: string
        mcpNotConnectedDelete: string
        unknownError: string
      }
      badges: {
        custom: string
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
      placeholders: {
        envName: string
        description: string
        licenseId: string
        licenseName: string
        namespaceId: string
        namespaceName: string
        agentId: string
        agentName: string
      }
      licenses: {
        title: string
        addLicense: string
        licenseId: string
        licenseName: string
        addNamespace: string
        namespaceId: string
        namespaceName: string
        saveNamespace: string
        utilityAgents: string
        addAgent: string
      }
      review: {
        title: string
        basicInfo: string
        name: string
        description: string
        licensesCount: string
        namespacesCount: string
        readyTitle: string
        readyDescription: string
      }
      headers: {
        xApiKey: string
        xCockpitApiKey: string
        xCockpitLicenseId: string
        xCockpitNamespaceId: string
      }
      alerts: {
        licenseRequired: string
        namespaceRequired: string
        agentRequired: string
        nameRequired: string
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
      cannotDeleteSession: string
      sessionAutoCreated: string
      deleted: string
      deletedDescription: string
      deleteFailed: string
    }
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalEnvironments: string
      activeCount: string
      inactiveCount: string
      connectionStatus: string
      suggestions: {
        createNew: string
        testConnection: string
        diagnoseIssues: string
        exportConfig: string
        importConfig: string
        listAll: string
        compareEnvs: string
        optimizeSettings: string
      }
    }
  }
  migration: {
    title: string
    description: string
    source: string
    target: string
    select: string
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
    execute: string
    configuration: {
      title: string
      sourceConnection: string
      targetConnection: string
      optional: string
      selectSource: string
      selectTarget: string
      targetNeededInfo: string
      loadingConnections: string
      selectSourceFirst: string
      selectSourceFirstHint: string
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
      loadingEnvironment: string
      loadingEnvironmentDescription: string
      noEnvironment: string
      noEnvironmentDescription: string
      loadingConnection: string
      loadingConnectionDescription: string
      syncingConnections: string
      noConnection: string
      noConnectionDescription: string
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
  sidebar: {
    groups: {
      setup: string
      operations: string
      personal: string
      communication: string
      admin: string
    }
    setup: {
      environments: string
      connections: string
    }
    operations: {
      migration: string
      migrationWizard: string
      upstream: string
      downstream: string
      atlas: string
      artifacts: string
    }
    personal: {
      myTasks: string
    }
    communication: {
      messages: string
    }
    admin: {
      moduleConfig: string
      onboarding: string
      devTools: string
      supervisorPlayground: string
    }
    search: {
      noResults: string
    }
  }
  downstream: {
    title: string
    subtitle: string
    badge: string
    workspace: {
      loadingEnvironment: string
      loadingEnvironmentDescription: string
      noEnvironment: string
      noEnvironmentDescription: string
      loadingConnection: string
      loadingConnectionDescription: string
      noConnection: string
      noConnectionDescription: string
      syncingConnections: string
    }
    connection: {
      empty: {
        title: string
        description: string
      }
      status: {
        connected: string
        disconnected: string
      }
      actions: {
        change: string
        viewDetails: string
        minimize: string
      }
      selector: {
        title: string
        subtitle: string
      }
      details: {
        environment: string
        license: string
        namespace: string
        utilityAgent: string
        tools: string
      }
    }
    stats: {
      totalFeatures: string
      inProgress: string
      inReview: string
      done: string
    }
    view: {
      kanban: string
      list: string
    }
    feature: {
      add: string
      importFromBE: string
      createManual: string
    }
    emptyState: {
      title: string
      description: string
      quickInfo: {
        stages: {
          title: string
          description: string
        }
        tracking: {
          title: string
          description: string
        }
        integration: {
          title: string
          description: string
        }
      }
    }
    stages: {
      todo: string
      refinement: string
      solutionDesign: string
      inProgress: string
      inReview: string
      done: string
    }
    stageDescriptions: {
      todo: string
      refinement: string
      solutionDesign: string
      inProgress: string
      inReview: string
      done: string
    }
    priority: {
      must: string
      should: string
      could: string
      wont: string
      high: string
      medium: string
      low: string
    }
    progress: {
      label: string
    }
    actions: {
      view: string
      edit: string
      delete: string
      moveNext: string
    }
    kanban: {
      empty: string
    }
    list: {
      feature: string
      businessEpic: string
      stage: string
      priority: string
      progress: string
      actions: string
      empty: string
    }
    import: {
      title: string
      description: string
      confirmTitle: string
      confirmDescription: string
      searchPlaceholder: string
      noEpics: string
      features: string
      selected: string
      clearSelection: string
      fromEpic: string
      continue: string
      importFeatures: string
    }
    wizard: {
      stepLabel: string
      navigation: {
        cancel: string
        previous: string
        next: string
        finish: string
      }
      actions: {
        saveDraft: string
        saving: string
      }
      saving: {
        autoSave: string
      }
      errors: {
        saveFailed: string
      }
      validation: {
        pleaseComplete: string
        requiredFields: string
      }
    }
    steps: {
      todo: {
        featureInfo: string
        featureName: string
        featureNamePlaceholder: string
        businessEpic: string
        businessEpicPlaceholder: string
        description: string
        descriptionPlaceholder: string
        priority: string
        manualFeature: string
        planning: string
        targetQuarter: string
        selectQuarter: string
        estimatedSprints: string
        estimatedSprintsPlaceholder: string
        assignment: string
        assignedTribe: string
        tribePlaceholder: string
        assignedSquad: string
        squadPlaceholder: string
        notes: string
        notesPlaceholder: string
      }
      refinement: {
        businessTitle: string
        businessDescription: string
        businessPlaceholder: string
        functionalTitle: string
        functionalDescription: string
        addFR: string
        noFRs: string
        frDescriptionPlaceholder: string
        nonFunctionalTitle: string
        nonFunctionalDescription: string
        addNFR: string
        noNFRs: string
        nfrDescriptionPlaceholder: string
        acceptanceCriteriaPlaceholder: string
        specialConsiderations: string
        analyticalImpact: string
        analyticalImpactDescription: string
        analyticalImpactPlaceholder: string
        sensitiveData: string
        sensitiveDataDescription: string
        sensitiveDataPlaceholder: string
      }
      solutionDesign: {
        technicalSolution: string
        technicalDescription: string
        mermaidDiagram: string
        mermaidPlaceholder: string
        dap: string
        dapDescription: string
        dapLink: string
        dapLinkPlaceholder: string
        dapStatus: string
        securityAnalysis: string
        securityDescription: string
        securityAnalysisPlaceholder: string
        securityItems: string
        addSecurityItem: string
        securityItemPlaceholder: string
        mitigationPlaceholder: string
        governanceApprovals: string
        architectureForum: string
        architectureForumDate: string
        architectureForumNotes: string
        architectureForumNotesPlaceholder: string
        federationReview: string
        federationNotes: string
        federationNotesPlaceholder: string
      }
      inProgress: {
        stories: string
        storiesDescription: string
        addStory: string
        noStories: string
        storyTitlePlaceholder: string
        storyDescriptionPlaceholder: string
        tasks: string
        addTask: string
        taskTitlePlaceholder: string
        standaloneTasks: string
        standaloneTasksDescription: string
        noTasks: string
        processTracking: string
        appSec: string
        eht: string
        testExecution: string
        deploy: string
        pdiTasks: string
        pdiTasksDescription: string
        addPDITask: string
        noPDITasks: string
        pdiTitlePlaceholder: string
      }
      inReview: {
        architecturalAdherence: string
        architecturalAdherenceDescription: string
        architecturalAdherenceConfirm: string
        architecturalAdherenceHelp: string
        architecturalNotesPlaceholder: string
        siRequirements: string
        siRequirementsDescription: string
        siRequirementsPlaceholder: string
        attachments: string
        addAttachment: string
        attachmentPlaceholder: string
        businessAcceptance: string
        businessAcceptanceDescription: string
        businessAcceptanceConfirm: string
        businessAcceptanceHelp: string
        accepted: string
        acceptedBy: string
        acceptedByPlaceholder: string
        reviewNotes: string
        reviewNotesDescription: string
        reviewNotesPlaceholder: string
      }
      done: {
        congratulations: string
        featureComplete: string
        summary: string
        stagesCompleted: string
        storiesCompleted: string
        tasksCompleted: string
        overallProgress: string
        releaseInfo: string
        releaseInfoDescription: string
        releaseVersion: string
        releaseDate: string
        productionUrl: string
        jiraLink: string
        releaseNotes: string
        releaseNotesDescription: string
        releaseNotesPlaceholder: string
        lessonsLearned: string
        lessonsLearnedDescription: string
        lessonsLearnedPlaceholder: string
        celebration: string
        celebrationPlaceholder: string
      }
    }
    nfrTypes: {
      performance: string
      security: string
      scalability: string
      availability: string
      reliability: string
      maintainability: string
      usability: string
      other: string
    }
    approvalStatus: {
      pending: string
      in_review: string
      approved: string
      rejected: string
    }
    severity: {
      low: string
      medium: string
      high: string
      critical: string
    }
    securityStatus: {
      identified: string
      mitigated: string
      accepted: string
    }
    storyStatus: {
      todo: string
      in_progress: string
      in_review: string
      done: string
    }
    taskStatus: {
      todo: string
      in_progress: string
      done: string
    }
    taskType: {
      development: string
      test: string
      documentation: string
      bug: string
      spike: string
    }
    processStatus: {
      pending: string
      in_progress: string
      done: string
    }
    pdiStatus: {
      pending: string
      done: string
      verified: string
    }
    copilot: {
      title: string
      initial: string
      placeholder: string
      openAssistant: string
      systemInstructions: string
      languageInstruction: string
      suggestionCard: {
        generating: string
        applied: string
        reasoning: string
        accept: string
        reject: string
        processing: string
        executing: string
        rejected: string
        changesApplied: string
        executingAgent: string
        agentCompleted: string
        agentExecuted: string
      }
      mcp: {
        searchingArtifacts: string
        listingArtifacts: string
        gettingArtifact: string
        fetchingUpstream: string
        creatingArtifact: string
        executingAgent: string
      }
      suggestions: {
        languageRule: string
        stageLabel: string
        contextLabel: string
        featureNameLabel: string
        organizationLabel: string
        projectLabel: string
        examplesLabel: string
        generateLabel: string
        titles: {
          featureName: string
          description: string
          targetQuarter: string
          assignedSquad: string
          estimatedSprints: string
          planningNotes: string
          priority: string
          businessRefinement: string
          functionalRequirement: string
          nonFunctionalRequirement: string
          analyticalImpact: string
          sensitiveDataHandling: string
          technicalSolution: string
          dapLink: string
          securityAnalysis: string
          securityItem: string
          architectureNotes: string
          federationNotes: string
          story: string
          storyWithTasks: string
          task: string
          taskForStory: string
          pdiTask: string
          architecturalAdherence: string
          siEvidence: string
          businessAcceptance: string
          reviewNotes: string
          releaseNotes: string
          releaseVersion: string
          celebrationNotes: string
          lessonsLearned: string
          productionUrl: string
          jiraLink: string
          createArtifact: string
          utilityAgent: string
        }
        priority: {
          high: string
          medium: string
          low: string
        }
        nfrTypes: {
          performance: string
          security: string
          scalability: string
          availability: string
          reliability: string
          maintainability: string
          usability: string
          other: string
        }
        severity: {
          low: string
          medium: string
          high: string
          critical: string
        }
        taskTypes: {
          development: string
          test: string
          documentation: string
          bug: string
          spike: string
        }
        adheres: string
        deviations: string
        accepted: string
        notAccepted: string
        acceptedBy: string
        releaseDate: string
        step1: {
          targetQuarter: string
          estimateSprints: string
          assignSquad: string
          planningNotes: string
        }
        step2: {
          businessRefinement: string
          functionalRequirements: string
          nonFunctionalRequirements: string
          analyticalImpact: string
        }
        step3: {
          technicalSolution: string
          securityAnalysis: string
          dapDocument: string
          architectureForum: string
        }
        step4: {
          createStories: string
          breakdownTasks: string
          trackProgress: string
          pdiTasks: string
        }
        step5: {
          architecturalAdherence: string
          siRequirements: string
          businessAcceptance: string
          reviewNotes: string
        }
        step6: {
          releaseNotes: string
          lessonsLearned: string
          celebrate: string
        }
      }
    }
  }
  migrationWizard: {
    title: string
    subtitle: string
    stepLabel: string
    steps: {
      connection: {
        name: string
        description: string
      }
      discovery: {
        name: string
        description: string
      }
      analysis: {
        name: string
        description: string
      }
      execution: {
        name: string
        description: string
      }
      verification: {
        name: string
        description: string
      }
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
      assistant: {
        title: string
        initial: string
        systemInstructions: string
        languageInstruction: string
      }
      suggestions: {
        languageRule: string
        step1: {
          configureSource: string
          configureTarget: string
          validateConnections: string
          explainProcess: string
        }
        step2: {
          discoverAgents: string
          analyzeAgents: string
          selectAgents: string
          supervisorInfo: string
        }
        step3: {
          createPlan: string
          validatePlan: string
          analyzeDependencies: string
          resolveConflicts: string
        }
        step4: {
          startMigration: string
          checkProgress: string
          handleErrors: string
        }
        step5: {
          verifyAgents: string
          generateReport: string
          troubleshoot: string
        }
      }
    }
  }
  atlas: {
    title: string
    description: string
    stats: {
      total: string
      pending: string
      last24h: string
      new: string
      acknowledged: string
      resolutionRate: string
      critical: string
      criticalLabel: string
      highLabel: string
      byCategory: string
      bySource: string
      other: string
    }
    categories: {
      bugsErrors: string
      doubts: string
      suggestions: string
      praise: string
    }
    sources: {
      upstream: string
      migration: string
      connections: string
      agents: string
      general: string
    }
    filters: {
      title: string
      source: string
      category: string
      status: string
      severity: string
      dateRange: string
      allSources: string
      allCategories: string
      allStatuses: string
      allSeverities: string
      clearFilters: string
      search: string
    }
    table: {
      title: string
      source: string
      category: string
      severity: string
      status: string
      createdAt: string
      createdBy: string
      actions: string
      noFeedbacks: string
      noMatchingFeedbacks: string
      loading: string
    }
    actions: {
      view: string
      edit: string
      delete: string
      changeStatus: string
      exportAll: string
      refresh: string
      severity: {
        low: string
        medium: string
        high: string
        critical: string
      }
      status: {
        new: string
        acknowledged: string
        in_progress: string
        resolved: string
        wont_fix: string
      }
      source: {
        upstream: string
        migration: string
        connections: string
        agents: string
        general: string
      }
      statusMessages: {
        collectingData: string
        executing: string
        done: string
        analyzing: string
        preparing: string
        saving: string
        saved: string
        failed: string
        error: string
      }
      categoryDesc: {
        deepAgent: string
        comment: string
        analysis: string
        resolution: string
        capture: string
        artifact: string
        processing: string
      }
      viewDetails: string
      resolve: string
      createdBy: string
      moreItems: string
      moreItemsPlural: string
      totalLabel: string
      byCategory: string
      bySeverity: string
      newLast24h: string
      description: string
      tags: string
      createdByLabel: string
      namespace: string
      relatedTo: string
      occurrences: string
      analysisTitle: string
      recommendations: string
      suggestionTitle: string
      confidence: string
      suggestedSteps: string
      estimatedEffort: string
    }
    detail: {
      description: string
      updatedAt: string
      aiAnalysis: string
      deepAgentAnalysis: string
      advancedAnalysis: string
      multiAgentDescription: string
      patternAnalyzer: string
      resolutionAdvisor: string
      analysisInProgress: string
      analyzingWithAgents: string
      clickToExpand: string
      analysisCompletedAt: string
      viewFullAnalysis: string
      runAnalysisPrompt: string
      analyzingButton: string
      runAnalysisAgain: string
      runAnalysis: string
      comments: string
      addCommentPlaceholder: string
      addingComment: string
      noComments: string
      editFeedback: string
    }
    messages: {
      loadError: string
      updateSuccess: string
      updateError: string
      deleteSuccess: string
      deleteError: string
      deleteConfirm: string
      exportSuccess: string
      exportError: string
    }
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      kanbanWelcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalFeedbacks: string
      pendingCount: string
      resolutionRate: string
      criticalIssues: string
      viewMode: string
      selectedFeedback: string
      examplesLabel: string
      generateLabel: string
      suggestions: {
        showCritical: string
        analyzeSelected: string
        suggestResolution: string
        findSimilar: string
        filterByPriority: string
        showUnresolved: string
        moveToProgress: string
        bulkResolve: string
        showTrends: string
        identifyPatterns: string
        generateReport: string
        answerQuestions: string
        summarizeStatus: string
        prioritizeBacklog: string
      }
    }
    analysis: {
      title: string
      overview: string
      totalAnalyzed: string
      criticalUnresolved: string
      bySource: string
      byCategory: string
      commonTopics: string
      noCommonTopics: string
      recommendations: string
      addressCritical: string
      noCritical: string
    }
    report: {
      executiveTitle: string
      detailedTitle: string
      briefTitle: string
      keyMetrics: string
      metric: string
      value: string
      highlights: string
      pendingBugs: string
      noPendingBugs: string
      recentPraise: string
      status: string
      overallStatus: string
      byCategory: string
      bySeverity: string
      bySource: string
      actionItems: string
      noActionItems: string
      bugsPending: string
      allClear: string
    }
    similar: {
      title: string
      noMatches: string
      score: string
      status: string
      hint: string
    }
    priority: {
      title: string
      allResolved: string
      source: string
      status: string
      score: string
      recommendation: string
    }
    resolution: {
      success: string
      suggestionFor: string
      category: string
      severity: string
      source: string
      status: string
      recommendedApproach: string
      similarResolved: string
      nextSteps: string
      step1: string
      step2: string
      step3: string
    }
    suggestions: {
      bug: string
      error: string
      doubt: string
      suggestion: string
      customization: string
      praise: string
    }
    status: {
      updated: string
    }
    list: {
      pendingTitle: string
      total: string
      filterCategory: string
      filterSource: string
      noPending: string
      andMore: string
    }
    details: {
      id: string
      category: string
      severity: string
      status: string
      source: string
      createdBy: string
      createdAt: string
      updatedAt: string
      tags: string
      description: string
      noDescription: string
    }
    errors: {
      feedbackNotFound: string
      noFeedbackSelected: string
      alreadyResolved: string
      updateFailed: string
    }
    kanban: {
      title: string
      description: string
      dropHere: string
      columns: {
        new: string
        acknowledged: string
        in_progress: string
        resolved: string
        wont_fix: string
      }
      actions: {
        acknowledge: string
        startWorking: string
        markResolved: string
        wontFix: string
      }
      stats: {
        total: string
        inProgress: string
        resolved: string
      }
    }
    form: {
      categoryQuestion: string
      newFeedback: string
      editFeedback: string
      labels: {
        title: string
        description: string
        severity: string
        impact: string
        tags: string
      }
      placeholders: {
        title: string
        description: string
        tags: string
      }
      buttons: {
        saving: string
        saveChanges: string
        submit: string
      }
      contextCaptured: string
      namespace: string
    }
    buttons: {
      newFeedback: string
      expand: string
    }
    tabs: {
      list: string
      kanban: string
      analytics: string
      messages: string
    }
  }
  messages: {
    title: string
    subtitle: string
    badge: string
    tabs: {
      inbox: string
      sent: string
      archived: string
      namespace: string
    }
    compose: {
      title: string
      button: string
      recipient: string
      recipientPlaceholder: string
      subject: string
      subjectPlaceholder: string
      content: string
      contentPlaceholder: string
      type: string
      scope: string
      priority: string
      expiresAt: string
      send: string
      sending: string
      cancel: string
    }
    types: {
      info: string
      announcement: string
      reminder: string
      alert: string
      request: string
      response: string
    }
    scopes: {
      private: string
      namespace: string
      license: string
      public: string
    }
    priorities: {
      low: string
      normal: string
      high: string
      urgent: string
    }
    card: {
      from: string
      to: string
      sentAt: string
      expiresAt: string
      noExpiration: string
      reply: string
      archive: string
      unarchive: string
      delete: string
      pin: string
      unpin: string
      star: string
      unstar: string
      markRead: string
      markUnread: string
      you: string
      recipients: string
      read: string
      reply_one: string
      reply_other: string
    }
    empty: {
      inbox: string
      inboxDescription: string
      sent: string
      sentDescription: string
      archived: string
      archivedDescription: string
      namespace: string
      loading: string
    }
    filters: {
      search: string
      type: string
      scope: string
      all: string
    }
    toast: {
      sent: string
      deleted: string
      archived: string
      unarchived: string
      pinned: string
      unpinned: string
      starred: string
      unstarred: string
      markedRead: string
      markedUnread: string
      error: string
    }
    page: {
      title: string
      description: string
      newMessage: string
      refresh: string
    }
    stats: {
      unread: string
      sent: string
      namespace: string
      total: string
    }
    search: {
      placeholder: string
      filter: string
    }
    composer: {
      title: string
      type: string
      priority: string
      audience: string
      subject: string
      message: string
      subjectPlaceholder: string
      messagePlaceholder: string
      cancel: string
      send: string
      sending: string
      audienceInfo: {
        namespace: string
        license: string
      }
      types: {
        announcement: string
        note: string
        task: string
        question: string
        feedback: string
        kudos: string
      }
      priorities: {
        low: string
        normal: string
        high: string
        urgent: string
      }
      visibility: {
        namespace: string
        namespaceDesc: string
        license: string
        licenseDesc: string
      }
    }
  }
  onboarding: {
    title: string
    subtitle: string
    badge: string
    wizard: {
      title: string
      progress: string
      step: string
      continue: string
      complete: string
      previous: string
      next: string
      skip: string
      restart: string
      assistant: {
        title: string
        greeting: string
        notJustChatbot: string
        firstStep: {
          title: string
          description: string
          present: string
          explain: string
          verify: string
          help: string
          startPrompt: string
        }
        continueStep: {
          title: string
          description: string
          explain: string
          summarize: string
          quiz: string
        }
        howToProceed: string
      }
    }
    steps: {
      video: {
        title: string
        description: string
        watchComplete: string
      }
      document: {
        title: string
        description: string
        readComplete: string
      }
      quiz: {
        title: string
        description: string
        question: string
        submit: string
        correct: string
        incorrect: string
        passed: string
        failed: string
        score: string
        passingScore: string
        retry: string
        maxAttempts: string
      }
      interactive: {
        title: string
        description: string
        complete: string
      }
      acknowledgment: {
        title: string
        description: string
        confirm: string
        confirmed: string
      }
      practice: {
        title: string
        description: string
        complete: string
      }
    }
    certification: {
      title: string
      certified: string
      notCertified: string
      certifiedOn: string
      expiresOn: string
      expired: string
      renew: string
      revoked: string
      active: string
      pending: string
    }
    access: {
      locked: string
      lockedDescription: string
      startTraining: string
      continueTraining: string
      viewCertification: string
    }
    admin: {
      title: string
      createNew: string
      edit: string
      delete: string
      publish: string
      unpublish: string
      preview: string
      addStep: string
      removeStep: string
      reorderSteps: string
      settings: string
      requiredFor: string
      optional: string
      expirationDays: string
      passingScore: string
    }
    creator: {
      title: string
      myTrainings: string
      createNew: string
      createYourFirst: string
      noTrainingsYet: string
      startByCreating: string
      createAndManage: string
      back: string
      onboarding: string
      saveDraft: string
      saving: string
      preview: string
      cancel: string
      next: string
      finish: string
      publishing: string
      publishTraining: string
      continueEditing: string
      viewOutputs: string
      untitled: string
      untitledTraining: string
      noDescription: string
      phases: string
      steps: string
      minutes: string
      loadingDrafts: string
      step: string
      labels: {
        slotName: string
        title: string
        description: string
        icon: string
        category: string
        estimatedMinutes: string
        phase: string
        duration: string
        required: string
        optional: string
      }
      buttons: {
        addPhase: string
        addStep: string
        addFirstPhase: string
        delete: string
        edit: string
        done: string
        save: string
        saveChanges: string
        publish: string
        publishNow: string
      }
      placeholders: {
        trainingTitle: string
        phaseTitle: string
        phaseDescription: string
        stepTitle: string
        stepDescription: string
        describeWhatUsersWillLearn: string
        selectIcon: string
        selectCategory: string
        leaveEmptyForNoExpiration: string
        certTitle: string
        certDescription: string
      }
      categories: {
        onboarding: string
        training: string
        compliance: string
        process: string
        custom: string
      }
      stepTypes: {
        document: string
        video: string
        quiz: string
        acknowledgment: string
        interactive: string
        practice: string
      }
      knowledge: {
        title: string
        description: string
        knowledgeBase: string
        uploadSourceDocuments: string
        documents: string
        words: string
        analyzing: string
        aiExtracting: string
        analyzeAndPropose: string
        uploadAtLeastOne: string
        primaryDocumentation: string
        mainSourceDocuments: string
        supportingMaterials: string
        additionalMaterials: string
        existingContent: string
        reuseExistingMaterials: string
        slotsFilled: string
      }
      proposal: {
        title: string
        description: string
        noDocumentsUploaded: string
        goBackToKnowledgeBase: string
        backToKnowledgeBase: string
      }
      structure: {
        title: string
        description: string
        noStructureYet: string
        acceptProposal: string
        backToAIProposal: string
      }
      branding: {
        title: string
        description: string
        livePreview: string
      }
      previewPublish: {
        title: string
        description: string
        summary: string
        noTrainingToPreview: string
        completePreviousSteps: string
        phases: string
        steps: string
        minutes: string
        publishedSuccessfully: string
        trainingPublished: string
        cannotPublishYet: string
        missingContent: string
        publishFailed: string
      }
      settings: {
        trainingDetails: string
        basicInformation: string
        certificationSettings: string
        configureCertification: string
        enableCertification: string
        usersWillReceiveCert: string
        certificationTitle: string
        certificationDescription: string
        validity: string
        requireRecertification: string
        progressSettings: string
        howUsersNavigate: string
        sequentialSteps: string
        mustCompleteInOrder: string
        allowSkip: string
        canSkipNonRequired: string
      }
      validation: {
        validationErrors: string
        fixBeforePublishing: string
        warnings: string
        optionalImprovements: string
        errors: string
      }
      tabs: {
        content: string
        settings: string
        preview: string
      }
      trainingOutputs: string
      notSet: string
      noDraftAvailable: string
      noPhasesYet: string
      noStepsYet: string
      phasesAndSteps: string
      requiredForCertification: string
      selectAllCorrect: string
      previous: string
      submitAnswers: string
      editStepTitle: string
      configureStepContent: string
      publishDialogTitle: string
      makeAvailableToUsers: string
      previewComingSoon: string
      canPublishAndTest: string
      copilot: {
        welcome: string
        welcomeFallback: string
        assistantTitle: string
        openAIAssistant: string
      }
      footer: {
        cancel: string
        back: string
        next: string
        publish: string
      }
      header: {
        back: string
        creatorMode: string
        v2Badge: string
      }
      phaseCard: {
        phase: string
        stepsCount: string
      }
    }
    empty: {
      title: string
      description: string
    }
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      stepsCompleted: string
      currentStep: string
      remainingSteps: string
      suggestions: {
        explainPlatform: string
        nextStep: string
        setupProfile: string
        connectMCP: string
        explainAgents: string
        getStarted: string
        skipStep: string
        reviewProgress: string
      }
    }
  }
  spotlight: {
    trigger: string
    title: string
    description: string
    searchPlaceholder: string
    recentSignals: string
    quickActions: string
    openAtlas: string
    shortcuts: {
      search: string
      close: string
    }
    suggestions: {
      openAtlasChat: string
      openAtlasChatDesc: string
      showCritical: string
      showCriticalDesc: string
      submitFeedback: string
      submitFeedbackDesc: string
      viewMessages: string
      viewMessagesDesc: string
    }
    quickFeedback: {
      title: string
      description: string
      connectToSubmit: string
      feedbackType: string
      titleLabel: string
      titlePlaceholder: string
      descriptionLabel: string
      descriptionPlaceholder: string
      cancel: string
      submit: string
      submitting: string
      successTitle: string
      successMessage: string
      categories: {
        bug: string
        feature: string
        performance: string
        insight: string
        learning: string
        success: string
        security: string
      }
    }
  }
  myTasks: {
    page: {
      title: string
      greeting: string
      aiActive: string
      refresh: string
    }
    dialog: {
      newTask: string
      description: string
      creating: string
      createTask: string
      cancel: string
    }
    form: {
      labels: {
        title: string
        description: string
        priority: string
        dueDate: string
      }
      placeholders: {
        title: string
        description: string
      }
      priorities: {
        low: string
        medium: string
        high: string
        critical: string
      }
    }
    alerts: {
      connectionRequired: string
      connectionRequiredDesc: string
      errorLoading: string
      tryAgain: string
    }
    empty: {
      title: string
      description: string
      createFirst: string
      tipTitle: string
      tipDescription: string
    }
    copilot: {
      title: string
      initialMessage: string
    }
    kanban: {
      columns: {
        backlog: string
        todo: string
        inProgress: string
        review: string
        done: string
      }
      stats: {
        active: string
        activePlural: string
        completed: string
        completedPlural: string
      }
      empty: string
      newTask: string
      loading: string
      focus: {
        mode: string
        description: string
        exit: string
        focusOn: string
        exitFocus: string
      }
      actions: {
        markComplete: string
        moveTo: string
        delete: string
      }
    }
  }
  devTools: {
    page: {
      title: string
      description: string
      developerOnly: string
      accessDenied: string
      restrictedMessage: string
      backButton: string
    }
    tabs: {
      agentRegistry: string
      platformAgents: string
      testAgentFetch: string
      mcpTools: string
    }
    mcpTools: {
      title: string
      comingSoon: string
    }
    agentRegistry: {
      title: string
      description: string
      search: string
      filterByModule: string
      filterByTechnology: string
      allModules: string
      allTechnologies: string
      statistics: {
        title: string
        totalAgents: string
        byTechnology: string
        totalTools: string
        modulesCovered: string
      }
      agent: {
        module: string
        technology: string
        tools: string
        description: string
        systemPrompt: string
        noTools: string
      }
    }
    platformAgents: {
      title: string
      description: string
      tabs: {
        langGraph: string
        copilotKit: string
        moduleConfig: string
        manifest: string
      }
      status: {
        synced: string
        notSynced: string
        error: string
        checking: string
      }
      actions: {
        create: string
        sync: string
        refresh: string
        viewDetails: string
        edit: string
        delete: string
      }
      messages: {
        createSuccess: string
        createError: string
        syncSuccess: string
        syncError: string
      }
      explorer: {
        title: string
        backToList: string
        header: {
          title: string
          revertAll: string
          modifications: string
        }
        categories: {
          title: string
          selectCategory: string
        }
        content: {
          title: string
          search: string
          noResults: string
          noItems: string
          chars: string
        }
        item: {
          modified: string
          edit: string
          revert: string
          save: string
          cancel: string
        }
        publish: {
          title: string
          description: string
          modificationsPending: string
          modificationsDescription: string
          contentSummary: string
          totalStrings: string
          totalCharacters: string
          categories: string
          warning: string
          publishing: string
          publish: string
          modified: string
        }
      }
    }
    dynamicAgents: {
      title: string
      description: string
      status: {
        fallback: string
        platform: string
      }
      sections: {
        hookDemo: string
        providerDemo: string
        ensureAgentDemo: string
      }
    }
  }
  knowledgeBase: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalDocuments: string
      indexedCount: string
      pendingCount: string
      lastUpdate: string
      suggestions: {
        addDocument: string
        optimizeEmbeddings: string
        reviewQuality: string
        findGaps: string
        organizeCategories: string
        testRetrieval: string
        bulkImport: string
        cleanupDuplicates: string
      }
    }
  }
  promptBuilder: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalPrompts: string
      activeCount: string
      draftCount: string
      suggestions: {
        createNew: string
        optimizeExisting: string
        addExamples: string
        testVariations: string
        reviewBestPractices: string
        addConstraints: string
        improveClarity: string
        convertToTemplate: string
      }
    }
  }
  utilityAgents: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalAgents: string
      activeCount: string
      mcpEnabled: string
      suggestions: {
        createAgent: string
        configureCapabilities: string
        testAgent: string
        enableMCP: string
        viewLogs: string
        optimizePerformance: string
        cloneAgent: string
        compareAgents: string
      }
    }
  }
  artifacts: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalArtifacts: string
      sharedCount: string
      privateCount: string
      suggestions: {
        createArtifact: string
        shareArtifact: string
        versionControl: string
        findArtifact: string
        duplicateArtifact: string
        exportArtifacts: string
        importArtifacts: string
        cleanupUnused: string
      }
    }
  }
  mcpServers: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalServers: string
      connectedCount: string
      disconnectedCount: string
      suggestions: {
        addServer: string
        testConnection: string
        diagnoseIssues: string
        viewCapabilities: string
        configureAuth: string
        monitorHealth: string
        migrateServer: string
        backupConfig: string
      }
    }
  }
  feedback: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalFeedbacks: string
      pendingCount: string
      resolvedCount: string
      suggestions: {
        analyzeTrends: string
        categorize: string
        prioritize: string
        findSimilar: string
        suggestResolution: string
        generateReport: string
        notifyTeam: string
        archiveResolved: string
      }
    }
  }
  training: {
    title: string
    description: string
    copilot: {
      instructions: string
      languageRule: string
      welcome: string
      button: string
      openAssistant: string
      closeAssistant: string
      contextLabel: string
      totalModules: string
      completedCount: string
      inProgressCount: string
      suggestions: {
        createModule: string
        suggestContent: string
        trackProgress: string
        generateQuiz: string
        reviewMaterial: string
        scheduleSession: string
        exportCertificate: string
        analyzeLearning: string
      }
    }
  }
  supervisorPlayground: {
    title: string
    quickActions: {
      summarize: string
      createDiagram: string
      actionItems: string
      continue: string
    }
    suggestions: {
      label: string
      tellMore: string
      nextSteps: string
      createDiagram: string
    }
    chat: {
      placeholder: string
      sendHint: string
    }
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
  search: {
    noResults: string
  }
}

export interface PagesTranslation {
  profile: {
    title: string
    apiKey: {
      title: string
      description: string
    }
    serviceApiKey: {
      title: string
      description: string
    }
  }
  administration: {
    artifacts: {
      title: string
      description: string
      breadcrumbParent: string
      new: {
        title: string
        description: string
      }
      edit: {
        title: string
        description: string
      }
    }
    licenses: {
      title: string
      description: string
      breadcrumbParent: string
    }
    namespaces: {
      title: string
      description: string
      breadcrumbParent: string
    }
    projects: {
      title: string
      description: string
      breadcrumbParent: string
    }
    users: {
      title: string
      description: string
      breadcrumbParent: string
    }
    utilityAgents: {
      title: string
      description: string
      breadcrumbParent: string
    }
  }
  agentConsole: {
    aiRegistry: {
      title: string
      description: string
      breadcrumbParent: string
      importUtilityAgent: {
        title: string
        description: string
      }
    }
    utilityAgentAiRegistry: {
      title: string
      description: string
      breadcrumbParent: string
      breadcrumbCurrent: string
      new: {
        title: string
        description: string
      }
      edit: {
        title: string
        description: string
      }
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
      retail: {
        title: string
        description: string
        breadcrumbParent: string
      }
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
          new: {
            title: string
            description: string
          }
          detail: {
            title: string
            description: string
          }
        }
        products: {
          title: string
          description: string
          breadcrumbParent: string
          detail: {
            title: string
            description: string
          }
        }
        backgrounds: {
          title: string
          description: string
          breadcrumbParent: string
          detail: {
            title: string
            description: string
          }
        }
        settings: {
          title: string
          description: string
          breadcrumbParent: string
          detail: {
            title: string
            description: string
          }
        }
      }
    }
  }
  commandCenter: {
    agents: {
      title: string
      description: string
      breadcrumbParent: string
    }
    reports: {
      title: string
      description: string
      breadcrumbParent: string
      detail: {
        title: string
        description: string
      }
    }
    schedule: {
      title: string
      description: string
      breadcrumbParent: string
    }
    telemetry: {
      title: string
      description: string
      breadcrumbParent: string
    }
  }
  buttons: {
    newArtifact: string
    newAgent: string
    refresh: string
    tryAgain: string
    accessDenied: {
      title: string
      message: string
      buttonLabel: string
    }
    featureNotAvailable: string
  }
  search: {
    taskOrAgent: string
    byName: string
  }
  errors: {
    failedToLoadReports: string
    failedToLoadReportDetails: string
  }
  common: {
    noReportsFound: string
  }
  telemetry: {
    underDevelopment: string
  }
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
}

export interface GeneratedTranslationResources {
  agents: AgentsTranslation
  auth: AuthTranslation
  common: CommonTranslation
  copilot: CopilotTranslation
  mcp: McpTranslation
  navigation: NavigationTranslation
  pages: PagesTranslation
}

export type GeneratedNamespaceKey = keyof GeneratedTranslationResources

// Flatten all translation keys for type checking
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never
    }[keyof T]
  : never

export type AllTranslationKeys<NS extends GeneratedNamespaceKey> = FlattenKeys<
  GeneratedTranslationResources[NS]
>
