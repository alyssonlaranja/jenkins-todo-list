# Documentacao SDA

## Estrutura de artefatos

O produto SDA organiza seus dados em artefatos na plataforma cockpit, sendo os principais artefatos os do tipo project, chat, document e history. Abaixo estão os papeis que cada um desempenha.

    - Project: Agrupo informações de todo o projeto, documentos aprovados, chats e pessoas enolvidas
    - Chat: Reune informações de chat, como o indice dos artefatos aprovados daquele chat e uma key do historico dele
    - History: Contém o historico do chat, mensagens e mensagens com artefatos.
    - Document: Contém o conteudo de um artefato gerado( Briefing, PRD, Backlog, etc...) além de um indice das pessoas as quais aquele documento foi compartilhado e qual versão foi compartilhada

## Como funcionam os agentes?

Os agentes no SDA não funcionam 100% do tempo via MCP, o que acontece é que nós trazemos as instruções para fora do cockpit, e a unica tarefa restante, é a comunicação com o supervisor, logo, adotamos um modelo hibrido.
Porque o modelo hibrido? Caso fosse 100% MCP a latência mataria o produto, caso fosse 100% via lengraph, se tornaria muito dificil a orquestração, não seria feita com tanta exelencia como é feita hoje em dia.

### Qual o fluxo disso tudo?

O fluxo é o seguinte, nós fazemos uma chamada MCP para o cockpit buscando os artefatos de instrução, por isso a primeira mensagem em um chat tende a demorar mais para ser respondida. Então quando trazemos para o front, iniciamos a orquestração, onde fazemos uma chamada MCP para o cockpit, o orquestrador, ele identifica qual agente deve ser utilizado e então mandamos as intrucoes junto da requisição do usuario para o Lengraph, ferramenta open source que ajuda na execução de agentes localmente.
