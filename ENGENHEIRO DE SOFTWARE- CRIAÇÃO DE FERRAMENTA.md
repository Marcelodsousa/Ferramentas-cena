Atue como um Engenheiro de Software Sênior especializado em sistemas operacionais corporativos, análise de dados e automação de processos.

Sua tarefa é projetar e desenvolver uma aplicação web chamada:

CENA TOOLS – Plataforma de Automação Operacional

Objetivo:
Criar uma plataforma web com ferramentas para análise de planilhas, validação de dados operacionais, controle de materiais e geração de requisições para almoxarifado.

O sistema deve permitir que usuários carreguem planilhas Excel e obtenham análises automáticas, filtros, comparações e relatórios.

A aplicação deve ser modular, permitindo adicionar novas ferramentas no futuro.

Tecnologias desejadas:

Frontend
React + Vite

Estilização
TailwindCSS

Manipulação de planilhas
SheetJS (XLSX)

Tabelas avançadas
TanStack Table

Geração de PDF
jsPDF

Exportação
FileSaver

Ícones
Lucide React

Persistência
LocalStorage inicialmente (futuro backend)

Arquitetura da aplicação:

Single Page Application (SPA)

Estrutura:

src
components
tools
pages
utils
services
hooks

Cada ferramenta deve ficar dentro da pasta:

tools/

Cada ferramenta funciona como um módulo independente.

Interface principal:

Header
Nome da plataforma

Sidebar
Lista de ferramentas

Área principal
Interface da ferramenta selecionada

Dashboard inicial com cards de ferramentas.

---

FERRAMENTA 1
ANÁLISE DE STATUS PEP (ANÁLISE DE NOTAS)

Objetivo:
Verificar se as notas possuem PEP correto e analisar seus status.

Entrada de dados:

Upload de planilha Excel contendo:

Nota
PEP
Status
Data
Outros campos relevantes

Funcionalidades:

Leitura automática da planilha

Tabela interativa com:

filtros
busca
ordenação
paginação

Verificações automáticas:

Notas sem PEP
PEP incorreto
status divergente
notas duplicadas

Análise de histórico:

Comparar:

status anterior
status atual

Mostrar:

ANTES
DEPOIS

Destacar mudanças.

Exemplo:

NOTA | STATUS ANTES | STATUS ATUAL | ALTERAÇÃO

Filtros:

por status
por PEP
por data
por divergência

Resumo automático:

total de notas
notas corretas
notas com erro
notas alteradas

Exportações:

Excel
PDF

---

FERRAMENTA 2
ADERÊNCIA DE MATERIAL

Objetivo:

Verificar aderência entre:

material requisitado
material baixado
material pendente

Entrada:

Planilha contendo:

material
quantidade requisitada
quantidade baixada
centro de custo
obra
data

Processamento automático:

Calcular:

saldo pendente
excesso de baixa
material faltante

Fórmulas:

saldo = requisitado - baixado

Classificação automática:

POSITIVO
(material faltando baixar)

NEGATIVO
(material baixado a mais)

OK
(material correto)

Interface:

Tabela analítica com:

filtros
busca
ordenar
agrupar por obra

Colunas exemplo:

Material
Requisitado
Baixado
Saldo
Status

Filtros:

obra
material
status

Resumo:

total requisitado
total baixado
total pendente

Gráficos opcionais.

Exportação:

Excel
PDF

---

FERRAMENTA 3
REQUISIÇÃO DE MATERIAL PARA ALMOXARIFADO

Objetivo:

Gerar requisições formais de materiais.

Interface de formulário.

Campos obrigatórios:

Obra
Local
Operação
Responsável da operação
Responsável almoxarifado

Lista de materiais.

Cada material deve conter:

SKU (gerado automaticamente)
Descrição
Quantidade
Unidade de medida

Exemplos de unidade:

UN
M
M²
KG
CX

Funcionalidades:

Adicionar múltiplos materiais

Editar materiais

Remover materiais

Validação de campos obrigatórios.

Após preenchimento:

Gerar documento de requisição.

Saídas:

PDF de requisição
Tabela de histórico

Histórico deve armazenar:

data
obra
responsável
lista de materiais

Salvar histórico no LocalStorage.

---

REQUISITOS DE INTERFACE

Design moderno.

Layout:

Sidebar esquerda
Ferramentas

Área principal
Conteúdo

Componentes necessários:

Cards
Tabelas
Modais
Alertas
Botões de ação
Formulários

Interface responsiva.

---

QUALIDADE DE CÓDIGO

Código modular.

Componentes reutilizáveis.

Separar:

UI
lógica
processamento de dados

Comentar partes importantes do código.

---

EXTRAS

Sistema de busca global.

Tema claro e escuro.

Loading states.

Mensagens de erro amigáveis.

---

PROCESSO DE GERAÇÃO

Antes de gerar código:

1 Explique a arquitetura completa
2 Liste todos os componentes
3 Descreva o fluxo das ferramentas
4 Depois gere o código inicial da aplicação
5 Comece implementando a ferramenta:

ANÁLISE DE STATUS PEP