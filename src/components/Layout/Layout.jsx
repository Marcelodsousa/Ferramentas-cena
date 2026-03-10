import Header from './Header'
import Sidebar from './Sidebar'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-6">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 CENA Engenharia &nbsp;|&nbsp; Sistema de Ferramentas &nbsp;|&nbsp; Criado por Marcelo.S
        </p>
      </footer>
    </div>
  )
}

export default Layout
