import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

function Header() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between">

        {/* Logo + Nome */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-cena.png"
            alt="CENA Engenharia"
            className="h-10 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="flex flex-col leading-tight">
            <span
              className="text-xl font-bold tracking-widest uppercase dark:text-white"
              style={{ color: isDark ? '#fff' : '#1D3D47', letterSpacing: '0.18em' }}
            >
              CENA
            </span>
            <span
              className="text-[10px] font-semibold tracking-[0.35em] uppercase dark:text-gray-300"
              style={{ color: isDark ? '#a0aec0' : '#1D3D47', opacity: 0.75 }}
            >
              FERRAMENTAS
            </span>
          </div>
        </div>

        {/* Botão tema */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Alternar tema"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-500" />
          )}
        </button>

      </div>
    </header>
  )
}

export default Header
