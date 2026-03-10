# CENA TOOLS - Plataforma de Automação Operacional

Plataforma web modular para análise de planilhas, validação de dados operacionais, controle de materiais e geração de requisições para almoxarifado.

## 🚀 Tecnologias

- **React 18** + **Vite** - Framework e build tool
- **TailwindCSS** - Estilização
- **TanStack Table** - Tabelas avançadas
- **SheetJS (XLSX)** - Manipulação de planilhas Excel
- **jsPDF** - Geração de PDFs
- **Lucide React** - Ícones
- **React Router** - Navegação

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Layout/         # Header, Sidebar, Layout
│   ├── Table/          # Componentes de tabela
│   └── UI/             # Cards, Buttons, Modals, Alerts
├── contexts/           # Contextos React (Theme)
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── services/           # Serviços (Excel, PDF, Storage)
├── tools/              # Ferramentas modulares
│   ├── AnaliseStatusPEP/
│   ├── AderenciaMaterial/
│   └── RequisicaoMaterial/
└── utils/              # Funções utilitárias
```

## 🛠️ Ferramentas

### 1. Análise de Status PEP
- Upload de planilhas Excel
- Validação automática de PEP
- Detecção de notas duplicadas
- Comparação com histórico
- Exportação Excel/PDF

### 2. Aderência de Material (Em desenvolvimento)
- Verificação de aderência entre materiais requisitados e baixados
- Cálculo de saldos pendentes
- Classificação automática

### 3. Requisição de Material (Em desenvolvimento)
- Geração de requisições formais
- Histórico de requisições
- Exportação em PDF

## 🎨 Recursos

- ✅ Tema claro/escuro
- ✅ Interface responsiva
- ✅ Tabelas interativas com filtros e ordenação
- ✅ Validações automáticas
- ✅ Exportação Excel e PDF
- ✅ Persistência LocalStorage

## 📝 Licença

Este projeto é privado e de uso interno.
