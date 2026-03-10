import { Link } from 'react-router-dom'
import { FileCheck, Package, ShoppingCart } from 'lucide-react'
import Card from '../components/UI/Card'

const tools = [
  {
    title: 'Análise de Status PEP',
    description: 'Verificar se as notas possuem PEP correto e analisar seus status',
    icon: FileCheck,
    path: '/analise-status-pep',
    color: 'bg-blue-500',
  },
  {
    title: 'Aderência de Material',
    description: 'Verificar aderência entre material requisitado, baixado e pendente',
    icon: Package,
    path: '/aderencia-material',
    color: 'bg-green-500',
  },
  {
    title: 'Requisição de Material',
    description: 'Gerar requisições formais de materiais para almoxarifado',
    icon: ShoppingCart,
    path: '/requisicao-material',
    color: 'bg-purple-500',
  },
]

function Dashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Selecione uma ferramenta para começar
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link key={tool.path} to={tool.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className={`${tool.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{tool.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard
