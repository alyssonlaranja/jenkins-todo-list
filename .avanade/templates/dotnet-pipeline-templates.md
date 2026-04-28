---
mode: 'workflows'
description: 'Workflows inteligentes para automação de processos GitHub'
---

# GITHUB AUTOMATION WORKFLOWS

## WORKFLOW 1: ANÁLISE INTELIGENTE DE REPOSITÓRIO

### Comando: `*github-analyze [repo-url]`

```python
# Pseudocode para análise de repositório
def analyze_repository(repo_url):
    analysis = {
        "stack_detection": detect_technology_stack(),
        "pipeline_complexity": analyze_current_pipeline(),
        "security_gaps": identify_security_issues(),
        "performance_bottlenecks": find_performance_issues(),
        "optimization_opportunities": suggest_improvements()
    }
    
    return analysis

def detect_technology_stack():
    stack_indicators = {
        ".NET": ["*.sln", "*.csproj", "Program.cs"],
        "Docker": ["Dockerfile", "docker-compose*.yml"],
        "Kubernetes": ["k8s/", "charts/", "*.yaml with kind:"],
        "Node.js": ["package.json", "node_modules/"],
        "Python": ["requirements.txt", "*.py", "setup.py"]
    }
    
    detected_stack = []
    for tech, indicators in stack_indicators.items():
        if any(file_exists(indicator) for indicator in indicators):
            detected_stack.append(tech)
    
    return detected_stack
```

### Output Exemplo:
```json
{
  "repository": "cockpit-portal-api",
  "analysis": {
    "stack": [".NET 8.0", "Docker", "Kubernetes", "Azure"],
    "current_pipeline": {
      "complexity_score": 85,
      "lines_of_code": 15700,
      "optimization_potential": "HIGH",
      "issues": [
        "Repetitive deployment code across environments",
        "No intelligent change detection",
        "Missing security scanning integration",
        "No automated rollback mechanism"
      ]
    },
    "recommendations": [
      "Implement reusable workflows for deployment",
      "Add path-based change detection", 
      "Integrate CodeQL and dependency scanning",
      "Configure automated rollback triggers"
    ],
    "estimated_improvement": {
      "build_time_reduction": "60%",
      "maintenance_effort": "-70%",
      "security_coverage": "+90%"
    }
  }
}
```

## WORKFLOW 2: OTIMIZAÇÃO AUTOMÁTICA DE PIPELINE

### Comando: `*github-optimize-pipeline`

```yaml
# Workflow gerado automaticamente baseado na análise
name: Optimized Pipeline (Auto-Generated)

on:
  push:
    branches: [ main, develop, 'release/**' ]
    paths:
      - 'src/**'           # Only trigger on source changes
      - '*.sln'
      - '**/*.csproj'
      - 'Dockerfile*'
      - 'k8s/**'
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

# Intelligent job orchestration
jobs:
  # Smart change detection
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      source: ${{ steps.changes.outputs.source }}
      docker: ${{ steps.changes.outputs.docker }}
      k8s: ${{ steps.changes.outputs.k8s }}
      docs: ${{ steps.changes.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            source:
              - 'src/**'
              - '*.sln'
              - '**/*.csproj'
            docker:
              - 'Dockerfile*'
              - 'docker-compose*.yml'
            k8s:
              - 'k8s/**'
            docs:
              - 'docs/**'
              - '*.md'

  # Conditional builds based on changes
  build:
    needs: detect-changes
    if: needs.detect-changes.outputs.source == 'true'
    uses: ./.github/workflows/build-template.yml
    
  security-scan:
    needs: detect-changes
    if: needs.detect-changes.outputs.source == 'true'
    uses: ./.github/workflows/security-template.yml
    
  docker-build:
    needs: [build, security-scan]
    if: needs.detect-changes.outputs.docker == 'true' || needs.detect-changes.outputs.source == 'true'
    uses: ./.github/workflows/docker-template.yml
    
  deploy:
    needs: [docker-build]
    if: github.event_name != 'pull_request'
    strategy:
      matrix:
        include:
          - environment: development
            condition: ${{ github.ref == 'refs/heads/develop' }}
          - environment: quality
            condition: ${{ startsWith(github.ref, 'refs/heads/release/') }}
          - environment: production
            condition: ${{ github.ref == 'refs/heads/main' }}
    uses: ./.github/workflows/deploy-template.yml
    with:
      environment: ${{ matrix.environment }}
    secrets: inherit
```

## WORKFLOW 3: DEPLOYMENT INTELIGENTE

### Comando: `*github-deploy-strategy`

```yaml
# Intelligent deployment strategy selector
name: Smart Deployment Strategy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      risk-level:
        required: false
        type: string
        default: 'auto'

jobs:
  assess-deployment-risk:
    runs-on: ubuntu-latest
    outputs:
      strategy: ${{ steps.strategy.outputs.strategy }}
      risk-level: ${{ steps.risk.outputs.level }}
      approval-required: ${{ steps.approval.outputs.required }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Calculate risk level
        id: risk
        run: |
          # Analyze changes and determine risk
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
          SRC_CHANGES=$(echo "$CHANGED_FILES" | grep -E '^src/' | wc -l)
          DB_CHANGES=$(echo "$CHANGED_FILES" | grep -E 'migration|schema' | wc -l)
          K8S_CHANGES=$(echo "$CHANGED_FILES" | grep -E '^k8s/' | wc -l)
          
          RISK_SCORE=0
          if [ $DB_CHANGES -gt 0 ]; then RISK_SCORE=$((RISK_SCORE + 30)); fi
          if [ $K8S_CHANGES -gt 0 ]; then RISK_SCORE=$((RISK_SCORE + 20)); fi
          if [ $SRC_CHANGES -gt 50 ]; then RISK_SCORE=$((RISK_SCORE + 25)); fi
          
          if [ $RISK_SCORE -lt 25 ]; then
            echo "level=low" >> $GITHUB_OUTPUT
          elif [ $RISK_SCORE -lt 50 ]; then
            echo "level=medium" >> $GITHUB_OUTPUT
          else
            echo "level=high" >> $GITHUB_OUTPUT
          fi
      
      - name: Select deployment strategy
        id: strategy
        run: |
          RISK_LEVEL=${{ steps.risk.outputs.level }}
          ENVIRONMENT=${{ inputs.environment }}
          
          case "$ENVIRONMENT-$RISK_LEVEL" in
            "development-"*)
              echo "strategy=direct" >> $GITHUB_OUTPUT
              ;;
            "quality-low")
              echo "strategy=direct" >> $GITHUB_OUTPUT
              ;;
            "quality-medium"|"quality-high")  
              echo "strategy=blue-green" >> $GITHUB_OUTPUT
              ;;
            "production-low")
              echo "strategy=canary" >> $GITHUB_OUTPUT
              ;;
            "production-medium"|"production-high")
              echo "strategy=canary-slow" >> $GITHUB_OUTPUT
              ;;
            *)
              echo "strategy=manual" >> $GITHUB_OUTPUT
              ;;
          esac

  deploy-canary:
    needs: assess-deployment-risk
    if: contains(needs.assess-deployment-risk.outputs.strategy, 'canary')
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Canary deployment
        run: |
          STRATEGY=${{ needs.assess-deployment-risk.outputs.strategy }}
          
          if [ "$STRATEGY" = "canary-slow" ]; then
            # Slower rollout for high-risk changes
            STAGES="5,25,50,100"
            DURATION="600,600,300,0"
          else
            # Standard canary rollout
            STAGES="10,50,100"
            DURATION="300,300,0"
          fi
          
          echo "Executing canary deployment with stages: $STAGES"
          # Canary deployment logic with progressive traffic shifting
```

## WORKFLOW 4: ROLLBACK AUTOMÁTICO

### Comando: `*github-rollback-config`

```yaml
# Automatic rollback system
name: Intelligent Rollback

on:
  workflow_call:
    inputs:
      trigger-type:
        required: true
        type: string
      environment:
        required: true
        type: string
      reason:
        required: false
        type: string

jobs:
  execute-rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - name: Get previous stable version
        id: previous-version
        run: |
          # Query deployment history to find last stable version
          PREVIOUS=$(kubectl get deployment cockpit-api -n cockpit -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
          PREVIOUS_VERSION=$(kubectl rollout history deployment/cockpit-api -n cockpit --revision=$((PREVIOUS-1)) | grep Image | awk '{print $2}' | cut -d':' -f2)
          
          echo "version=$PREVIOUS_VERSION" >> $GITHUB_OUTPUT
          echo "Previous stable version: $PREVIOUS_VERSION"
      
      - name: Execute rollback
        run: |
          echo "🔄 Starting rollback to version ${{ steps.previous-version.outputs.version }}"
          
          # Stop traffic to current version
          kubectl annotate ingress cockpit-api-ingress -n cockpit nginx.ingress.kubernetes.io/canary-weight=0
          
          # Rollback deployment
          kubectl rollout undo deployment/cockpit-api -n cockpit
          
          # Wait for rollback to complete
          kubectl rollout status deployment/cockpit-api -n cockpit --timeout=300s
          
          echo "✅ Rollback completed successfully"
      
      - name: Verify rollback health
        id: verify
        run: |
          # Wait for pods to be ready
          sleep 30
          
          # Health check
          for i in {1..10}; do
            if curl -f "https://${{ inputs.environment }}.cockpit.example.com/health" --max-time 10; then
              echo "✅ Health check passed"
              echo "success=true" >> $GITHUB_OUTPUT
              break
            fi
            
            if [ $i -eq 10 ]; then
              echo "❌ Health check failed after rollback"
              echo "success=false" >> $GITHUB_OUTPUT
              exit 1
            fi
            
            sleep 10
          done
```

Estes workflows fornecem automação inteligente completa para GitHub DevOps, desde análise de repositório até rollbacks automáticos baseados em métricas de saúde.