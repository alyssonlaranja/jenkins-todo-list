/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server'

import {
  mapStateToProcess,
  PROCESS_MAPPINGS,
  PROCESS_STATES,
} from '@/features/upstream-sda-2/services/azure-devops-process.service'
import type { ProcessTemplate } from '@/features/upstream-sda-2/types/azure-devops-process.types'

// Hierarquia é baseada em parentLocalId, não mais em detecção automática de tipos

interface WorkItem {
  localId?: string
  parentLocalId?: string // ID local do pai para hierarquia
  type: 'Epic' | 'Initiative' | 'Product Backlog Item' | 'Task' | string
  title: string
  description?: string
  acceptanceCriteria?: string
  priority?: number
  tags?: string[]
  fields?: Record<string, unknown>
  relations?: Array<{ rel: string; url: string }>
  parentId?: number
  sdaType?: string // Tipo original do SDA
  state?: string // Estado desejado (será mapeado para o processo alvo)
}

interface SyncRequest {
  organization: string
  project: string
  areaPath?: string
  pat: string
  workItems: WorkItem[]
  enableHierarchy?: boolean // Nova opção para habilitar hierarquia automática
  targetProcess?: ProcessTemplate // Processo do projeto alvo para mapeamento de estados
  baseProcess?: ProcessTemplate // Processo base (usado quando targetProcess é Custom)
}

export async function POST(request: NextRequest) {
  try {
    const {
      organization,
      project,
      areaPath,
      pat,
      workItems,
      enableHierarchy = true,
      targetProcess,
      baseProcess,
    }: SyncRequest = await request.json()

    console.log('🚀 [API] Sincronizando work items:', {
      organization,
      project,
      areaPath,
      workItemsCount: workItems.length,
      enableHierarchy,
      targetProcess:
        targetProcess || 'não especificado (usando Agile como padrão)',
      baseProcess: baseProcess || 'N/A',
      targetProcessType: typeof targetProcess,
      hasPat: !!pat,
    })

    // Debug: mostrar estados disponíveis para o processo
    if (targetProcess) {
      const processStates = PROCESS_STATES[targetProcess]
      console.log(
        `🔍 [API] Estados para processo ${targetProcess}:`,
        processStates
      )
    } else {
      console.log(
        '⚠️ [API] targetProcess não especificado, tentando detectar automaticamente...'
      )
    }

    if (!organization || !project || !pat || !workItems?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          created: [],
          errors: [],
          skipped: [],
        },
        { status: 400 }
      )
    }

    // 1. Primeiro descobrir os tipos de work item disponíveis no projeto
    console.log(
      '🔍 [SYNC WORKITEMS API] Descobrindo tipos de work item disponíveis...'
    )

    const typesResponse = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.1-preview.2`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          Accept: 'application/json',
        },
      }
    )

    if (!typesResponse.ok) {
      const errorText = await typesResponse.text()
      console.error(
        '❌ [SYNC WORKITEMS API] Erro ao buscar tipos de work item:',
        errorText
      )
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch work item types: ${typesResponse.status} ${typesResponse.statusText}`,
          created: [],
          errors: [],
          skipped: [],
        },
        { status: typesResponse.status }
      )
    }

    const typesData = await typesResponse.json()
    const availableTypes =
      typesData.value
        ?.map((type: { name: string }) => type.name)
        .filter(Boolean) || []

    console.log(
      '✅ [SYNC WORKITEMS API] Tipos disponíveis no projeto:',
      availableTypes
    )

    // Log específico para verificar presença de Task
    console.log('🔍 [SYNC WORKITEMS API] Verificação de tipos importantes:', {
      hasTask: availableTypes.includes('Task'),
      hasIssue: availableTypes.includes('Issue'),
      hasEpic: availableTypes.includes('Epic'),
      hasBug: availableTypes.includes('Bug'),
    })

    // 1.5. FALLBACK: Detectar processo automaticamente se não especificado
    // Isso garante mapeamento correto de estados mesmo se frontend não passar
    let effectiveTargetProcess: ProcessTemplate | undefined = targetProcess
    let effectiveBaseProcess: ProcessTemplate | undefined = baseProcess

    if (!effectiveTargetProcess) {
      console.log(
        '🔄 [API] Detectando processo automaticamente pelos tipos de work item...'
      )
      const typeSet = new Set(
        availableTypes.map((t: string) => t.toLowerCase())
      )

      // Scrum: tem "Product Backlog Item" e não tem "User Story"
      if (typeSet.has('product backlog item') && !typeSet.has('user story')) {
        effectiveTargetProcess = 'Scrum'
        console.log(
          '✅ [API] Processo detectado: Scrum (tem PBI, não tem User Story)'
        )
      }
      // CMMI: tem "Requirement" e não tem "User Story"
      else if (typeSet.has('requirement') && !typeSet.has('user story')) {
        effectiveTargetProcess = 'CMMI'
        console.log(
          '✅ [API] Processo detectado: CMMI (tem Requirement, não tem User Story)'
        )
      }
      // Basic: tem "Issue" mas não tem "Feature" nem "User Story"
      else if (
        typeSet.has('issue') &&
        !typeSet.has('feature') &&
        !typeSet.has('user story')
      ) {
        effectiveTargetProcess = 'Basic'
        console.log(
          '✅ [API] Processo detectado: Basic (tem Issue, não tem Feature nem User Story)'
        )
      }
      // Agile: tem "User Story" e "Feature"
      else if (typeSet.has('user story') && typeSet.has('feature')) {
        effectiveTargetProcess = 'Agile'
        console.log(
          '✅ [API] Processo detectado: Agile (tem User Story e Feature)'
        )
      }
      // Default
      else {
        effectiveTargetProcess = 'Agile'
        console.log(
          '⚠️ [API] Processo não identificado, usando Agile como padrão'
        )
      }

      // Usar o processo detectado também como base
      effectiveBaseProcess = effectiveTargetProcess

      // Log dos estados que serão usados
      const processStates = PROCESS_STATES[effectiveTargetProcess]
      console.log(
        `🔍 [API] Estados para processo detectado ${effectiveTargetProcess}:`,
        processStates
      )
    }

    // 2. Processar work items - usar tipo já definido pelo frontend (convertSdaTypeToScrum)
    // NÃO sobrescrever com detecção automática pois o frontend já define o tipo correto
    let processedWorkItems = workItems.map(item => {
      // Log do tipo recebido
      console.log(
        `📋 [HIERARCHY] "${item.title}" → Tipo recebido: ${item.type}, sdaType: ${item.sdaType || 'N/A'}, parentLocalId: ${item.parentLocalId || 'N/A'}`
      )
      return item
    })

    // 3. Agrupar por hierarquia para criação ordenada: Epic → Initiative → PBI → Task
    const epics = processedWorkItems.filter(i => i.type === 'Epic')
    const initiatives = processedWorkItems.filter(i => i.type === 'Initiative')
    const userStories = processedWorkItems.filter(
      i => i.type === 'Product Backlog Item'
    )
    const tasks = processedWorkItems.filter(i => i.type === 'Task')

    console.log('📊 [HIERARCHY] Agrupamento por tipo:', {
      epics: epics.length,
      initiatives: initiatives.length,
      userStories: userStories.length,
      tasks: tasks.length,
    })

    // 4. Função para mapear tipos com base no processo alvo e tipos disponíveis
    function mapWorkItemType(originalType: string, sdaType?: string): string {
      console.log(`🔍 [mapWorkItemType] ===== INÍCIO MAPEAMENTO =====`)
      console.log(`🔍 [mapWorkItemType] originalType: '${originalType}'`)
      console.log(`🔍 [mapWorkItemType] sdaType: '${sdaType || 'N/A'}'`)
      console.log(
        `🔍 [mapWorkItemType] effectiveTargetProcess: '${effectiveTargetProcess || 'N/A'}'`
      )
      console.log(
        `🔍 [mapWorkItemType] effectiveBaseProcess: '${effectiveBaseProcess || 'N/A'}'`
      )

      // Determinar o processo efetivo para mapeamento de tipos
      const effectiveProcess =
        effectiveTargetProcess === 'Custom' && effectiveBaseProcess
          ? effectiveBaseProcess
          : effectiveTargetProcess || 'Agile'

      // Usar mapeamentos de PROCESS_MAPPINGS para o processo alvo
      const processMapping = PROCESS_MAPPINGS[effectiveProcess]

      if (processMapping) {
        // Mapear tipo genérico do SDA para tipo do Azure DevOps
        // Primeiro, identificar o tipo genérico baseado no sdaType ou originalType
        let genericType: string | undefined

        if (sdaType) {
          const sdaTypeNormalized = sdaType.toLowerCase()
          if (sdaTypeNormalized === 'epic') genericType = 'Epic'
          else if (
            sdaTypeNormalized === 'feature' ||
            sdaTypeNormalized === 'initiative'
          )
            genericType = 'Feature'
          else if (
            sdaTypeNormalized === 'userstory' ||
            sdaTypeNormalized === 'story'
          )
            genericType = 'UserStory'
          else if (sdaTypeNormalized === 'task') genericType = 'Task'
          else if (sdaTypeNormalized === 'bug') genericType = 'Bug'
        }

        // Se não identificou pelo sdaType, tentar pelo originalType
        if (!genericType) {
          const normalizedOriginal = originalType.toLowerCase()
          if (normalizedOriginal === 'epic') genericType = 'Epic'
          else if (
            normalizedOriginal === 'initiative' ||
            normalizedOriginal === 'feature'
          )
            genericType = 'Feature'
          else if (
            normalizedOriginal === 'product backlog item' ||
            normalizedOriginal === 'user story'
          )
            genericType = 'UserStory'
          else if (normalizedOriginal === 'task') genericType = 'Task'
          else if (normalizedOriginal === 'bug') genericType = 'Bug'
        }

        console.log(
          `🔍 [mapWorkItemType] genericType detectado: '${genericType || 'NENHUM'}'`
        )

        // Encontrar o mapeamento para o tipo genérico
        if (genericType) {
          const mapping = processMapping.mappings.find(
            m => m.generic === genericType
          )
          if (mapping) {
            // Para Task, sempre usar Task se o mapeamento diz Task
            // Task é um tipo universal que existe em todos os processos do Azure DevOps
            if (genericType === 'Task' && mapping.azureDevOpsType === 'Task') {
              console.log(
                `✅ [mapWorkItemType] Task mapeado diretamente: '${originalType}' → 'Task' (processo: ${effectiveProcess})`
              )
              return 'Task'
            }

            // Para outros tipos, verificar se o tipo mapeado está disponível no projeto
            if (availableTypes.includes(mapping.azureDevOpsType)) {
              console.log(
                `✅ [mapWorkItemType] Tipo mapeado via PROCESS_MAPPINGS: '${originalType}' → '${mapping.azureDevOpsType}' (processo: ${effectiveProcess})`
              )
              return mapping.azureDevOpsType
            } else {
              console.log(
                `⚠️ [mapWorkItemType] Tipo '${mapping.azureDevOpsType}' não disponível, buscando alternativa...`
              )
            }
          }
        }
      }

      // Primeiro tentar encontrar o tipo exato
      if (availableTypes.includes(originalType)) {
        return originalType
      }

      // Mapeamentos de fallback baseados nos tipos disponíveis
      const commonMappings: { [key: string]: string[] } = {
        'Product Backlog Item': [
          'Product Backlog Item',
          'User Story',
          'Issue',
          'Story',
          'Backlog Item',
        ],
        'User Story': ['User Story', 'Product Backlog Item', 'Issue', 'Story'],
        Task: ['Task'],
        Bug: ['Bug', 'Issue'],
        Epic: ['Epic'],
        Initiative: ['Initiative', 'Feature', 'Issue', 'Epic'],
        Feature: ['Feature', 'Issue', 'Epic'],
      }

      // Buscar mapeamento para o tipo original
      const mappingOptions = commonMappings[originalType] || []
      for (const option of mappingOptions) {
        if (availableTypes.includes(option)) {
          console.log(
            `✅ [mapWorkItemType] Tipo mapeado via fallback: '${originalType}' → '${option}'`
          )
          return option
        }
      }

      // Se nada foi encontrado, usar Issue como fallback para Basic
      if (effectiveProcess === 'Basic' && availableTypes.includes('Issue')) {
        console.warn(
          `⚠️ [mapWorkItemType] Usando Issue como fallback para Basic: '${originalType}'`
        )
        return 'Issue'
      }

      // Fallback geral
      const fallbackTypes = [
        'Product Backlog Item',
        'User Story',
        'Issue',
        'Task',
        'Bug',
      ]
      for (const fallback of fallbackTypes) {
        if (availableTypes.includes(fallback)) {
          console.warn(
            `⚠️ [SYNC WORKITEMS API] Usando tipo fallback "${fallback}" para "${originalType}"`
          )
          return fallback
        }
      }

      // Último recurso: usar o primeiro tipo disponível
      if (availableTypes.length > 0) {
        console.warn(
          `⚠️ [SYNC WORKITEMS API] Usando primeiro tipo disponível "${availableTypes[0]}" para "${originalType}"`
        )
        return availableTypes[0]
      }

      // Se chegou aqui, há um problema sério
      throw new Error(`No work item types available in project ${project}`)
    }

    // 5. Criar work items em ordem hierárquica: Epic → Initiative → PBI → Task
    const created: Array<{
      id: number
      url: string
      type: string
      title: string
      state: string
      rev: number
      originalType: string
      mappedType: string
      localId?: string
      parentLocalId?: string
    }> = []
    const errors: Array<{
      item: WorkItem | null
      error: string
      details?: Record<string, unknown>
    }> = []
    const skipped: Array<{
      item: WorkItem
      reason: string
    }> = []
    const idMapping = new Map<string, number>() // localId → Azure DevOps ID

    console.log(
      '🔄 [SYNC WORKITEMS API] Criando work items em ordem hierárquica...'
    )

    // Criar todos os work items em ordem hierárquica
    const allItems = [...epics, ...initiatives, ...userStories, ...tasks]

    for (const item of allItems) {
      try {
        // Mapear tipo para um tipo disponível no projeto (considerando processo alvo)
        const mappedType = mapWorkItemType(item.type, item.sdaType)

        // Mapear estado para o processo alvo
        // Usa effectiveTargetProcess que inclui detecção automática como fallback
        const sourceState = item.state || 'New'
        const mappedState = effectiveTargetProcess
          ? mapStateToProcess(
              sourceState,
              effectiveTargetProcess,
              effectiveBaseProcess
            )
          : sourceState

        console.log('📝 [SYNC WORKITEMS API] Criando:', item.title)
        console.log(
          '📋 [SYNC WORKITEMS API] Tipo original:',
          item.type,
          '→ Tipo mapeado:',
          mappedType
        )
        console.log(
          '🔄 [SYNC WORKITEMS API] Estado original:',
          sourceState,
          '→ Estado mapeado:',
          mappedState,
          `(Processo: ${effectiveTargetProcess || 'Agile (padrão)'}, Base: ${effectiveBaseProcess || 'N/A'})`
        )

        // Preparar operações JSON Patch para criar work item
        const patchDocument: Array<{
          op: 'add' | 'remove' | 'replace'
          path: string
          value?: string | number | boolean
        }> = [
          {
            op: 'add',
            path: '/fields/System.Title',
            value: item.title,
          },
          {
            op: 'add',
            path: '/fields/System.State',
            value: mappedState,
          },
        ]

        // Adicionar relacionamento pai/filho se especificado
        if (item.parentId) {
          console.log('🔗 [HIERARCHY] Linking to parent:', item.parentId)
          // Azure DevOps relationships são criados depois da criação do work item
        }

        // Adicionar descrição se existir
        if (item.description) {
          patchDocument.push({
            op: 'add',
            path: '/fields/System.Description',
            value: item.description,
          })
        }

        // Adicionar critérios de aceite no campo correto do Azure DevOps
        if (item.acceptanceCriteria) {
          patchDocument.push({
            op: 'add',
            path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
            value: item.acceptanceCriteria,
          })
        }

        // Adicionar área se especificada
        if (areaPath) {
          patchDocument.push({
            op: 'add',
            path: '/fields/System.AreaPath',
            value: areaPath,
          })
        }

        // Adicionar tags se existirem, incluindo tags da origem SDA
        // REMOVED: User lacks 'Create Tags' permission in Azure DevOps (HTTP 403)
        // const existingTags = item.tags || []
        // const allTags = [...existingTags, 'sda-platform', 'auto-generated']
        // if (allTags.length > 0) {
        //   patchDocument.push({
        //     op: 'add',
        //     path: '/fields/System.Tags',
        //     value: allTags.join('; '),
        //   })
        // }

        console.log(
          '🔗 [SYNC WORKITEMS API] URL:',
          `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(mappedType)}`
        )
        console.log(
          '📄 [SYNC WORKITEMS API] Patch Document:',
          JSON.stringify(patchDocument, null, 2)
        )

        // Fazer requisição para Azure DevOps REST API
        const azureResponse = await fetch(
          `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(mappedType)}?api-version=7.1-preview.3`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json-patch+json',
              Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
              Accept: 'application/json',
            },
            body: JSON.stringify(patchDocument),
          }
        )

        if (!azureResponse.ok) {
          const errorText = await azureResponse.text()
          const errorDetails = {
            status: azureResponse.status,
            statusText: azureResponse.statusText,
            error: errorText,
            title: item.title,
            originalType: item.type,
            mappedType: mappedType,
            availableTypes: availableTypes,
            url: `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(mappedType)}`,
            patchDocument,
          }

          console.error(
            '❌ [SYNC WORKITEMS API] Erro ao criar work item:',
            errorDetails
          )

          errors.push({
            item,
            error: `HTTP ${azureResponse.status}: ${errorText}`,
            details: errorDetails,
          })
          continue
        }

        const workItemResult = await azureResponse.json()
        console.log(
          '✅ [SYNC WORKITEMS API] Work item criado:',
          workItemResult.id
        )

        // Armazenar mapeamento para relacionamentos hierárquicos
        if (item.localId) {
          idMapping.set(item.localId, workItemResult.id)
          console.log(
            `🗺️ [HIERARCHY] Mapeamento: ${item.localId} → ${workItemResult.id}`
          )
        }

        created.push({
          id: workItemResult.id,
          url: workItemResult._links.html.href,
          type: workItemResult.fields['System.WorkItemType'],
          title: workItemResult.fields['System.Title'],
          state: workItemResult.fields['System.State'],
          rev: workItemResult.rev,
          originalType: item.type,
          mappedType: mappedType,
          localId: item.localId,
          parentLocalId: item.parentLocalId,
        })
      } catch (error) {
        console.error('❌ [SYNC WORKITEMS API] Erro:', error)
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })
      }

      // Pequeno delay entre criações para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Implementar criação de relacionamentos pai/filho usando parentLocalId
    console.log(
      '🔗 [HIERARCHY] Criando relacionamentos pai-filho usando parentLocalId...'
    )
    const relationshipErrors: string[] = []

    // Definir variáveis de agrupamento no escopo correto para uso posterior
    const createdInitiatives = created.filter(
      item => item.type === 'Initiative'
    )
    const createdEpics = created.filter(item => item.type === 'Epic')
    const createdUserStories = created.filter(
      item => item.type === 'Product Backlog Item'
    )
    const createdTasks = created.filter(item => item.type === 'Task')

    console.log('🔍 [HIERARCHY] Work items criados por tipo:', {
      epics: createdEpics.length,
      initiatives: createdInitiatives.length,
      userStories: createdUserStories.length,
      tasks: createdTasks.length,
    })
    console.log(
      '🗺️ [HIERARCHY] Mapeamento de IDs:',
      Object.fromEntries(idMapping)
    )

    // Criar relacionamentos baseados em parentLocalId
    for (const item of allItems) {
      // Pular itens sem parentLocalId (Epics geralmente não têm pai)
      if (!item.parentLocalId) {
        console.log(
          `ℹ️ [HIERARCHY] Item "${item.title}" não tem parentLocalId - pulando`
        )
        continue
      }

      // Encontrar o ID do Azure DevOps do item atual
      const childAzureId = item.localId ? idMapping.get(item.localId) : null
      if (!childAzureId) {
        console.warn(
          `⚠️ [HIERARCHY] Não encontrou Azure ID para item "${item.title}" (localId: ${item.localId})`
        )
        continue
      }

      // Encontrar o ID do Azure DevOps do pai
      const parentAzureId = idMapping.get(item.parentLocalId)
      if (!parentAzureId) {
        console.warn(
          `⚠️ [HIERARCHY] Não encontrou Azure ID do pai para item "${item.title}" (parentLocalId: ${item.parentLocalId})`
        )
        continue
      }

      try {
        console.log(
          `🔗 [HIERARCHY] Linkando "${item.title}" (${childAzureId}) → pai (${parentAzureId})`
        )

        const linkResponse = await fetch(
          `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${childAzureId}?api-version=7.1-preview.3`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json-patch+json',
              Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
              Accept: 'application/json',
            },
            body: JSON.stringify([
              {
                op: 'add',
                path: '/relations/-',
                value: {
                  rel: 'System.LinkTypes.Hierarchy-Reverse', // Item é filho do pai
                  url: `https://dev.azure.com/${organization}/${project}/_apis/wit/workItems/${parentAzureId}`,
                  attributes: {
                    comment:
                      'Auto-linked by SDA Platform - Hierarchical relationship',
                  },
                },
              },
            ]),
          }
        )

        if (linkResponse.ok) {
          console.log(
            `✅ [HIERARCHY] Item ${childAzureId} linkado ao pai ${parentAzureId}`
          )
        } else {
          const errorText = await linkResponse.text()
          console.error(
            `❌ [HIERARCHY] Erro ao linkar item ${childAzureId}:`,
            errorText
          )
          relationshipErrors.push(
            `${item.title} (${childAzureId}) → pai (${parentAzureId}): ${errorText}`
          )
        }
      } catch (error) {
        console.error(
          `❌ [HIERARCHY] Erro ao linkar item ${childAzureId}:`,
          error
        )
        relationshipErrors.push(
          `${item.title} (${childAzureId}) → pai (${parentAzureId}): ${error}`
        )
      }

      await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
    }

    if (relationshipErrors.length === 0) {
      console.log(
        '🎉 [HIERARCHY] Todos os relacionamentos foram criados com sucesso!'
      )
    } else {
      console.warn(
        `⚠️ [HIERARCHY] ${relationshipErrors.length} erros ao criar relacionamentos:`,
        relationshipErrors
      )
    }

    const result = {
      success: errors.length === 0 && relationshipErrors.length === 0,
      created,
      errors,
      skipped,
      hierarchy: {
        relationshipsCreated: relationshipErrors.length === 0,
        relationshipErrors: relationshipErrors,
        totalRelationships: Math.max(
          0,
          createdInitiatives.length +
            createdUserStories.length +
            createdTasks.length
        ),
      },
      metadata: {
        organization,
        project,
        areaPath,
        totalProcessed: workItems.length,
        hierarchyEnabled: enableHierarchy,
        detectedHierarchy: {
          epics: epics.length,
          initiatives: initiatives.length,
          userStories: userStories.length,
          tasks: tasks.length,
        },
        createdHierarchy: {
          epics: createdEpics.length,
          initiatives: createdInitiatives.length,
          userStories: createdUserStories.length,
          tasks: createdTasks.length,
        },
        availableTypes: availableTypes,
        idMapping: Object.fromEntries(idMapping),
        processingTime: Date.now(),
      },
    }

    console.log('📊 [SYNC WORKITEMS API] Resultado final:', {
      totalItems: workItems.length,
      created: created.length,
      errors: errors.length,
      relationshipErrors: relationshipErrors.length,
      success: errors.length === 0 && relationshipErrors.length === 0,
      hierarchyEnabled: enableHierarchy,
      hierarchyCreated: relationshipErrors.length === 0,
      availableTypesInProject: availableTypes,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [API] Erro na sincronização:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        created: [],
        errors: [
          {
            item: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        skipped: [],
      },
      { status: 500 }
    )
  }
}
