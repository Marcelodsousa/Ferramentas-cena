import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import AnaliseStatusPEP from './tools/AnaliseStatusPEP/AnaliseStatusPEP'
import AderenciaMaterial from './tools/AderenciaMaterial/AderenciaMaterial'
import RequisicaoMaterial from './tools/RequisicaoMaterial/RequisicaoMaterial'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analise-status-pep" element={<AnaliseStatusPEP />} />
            <Route path="/aderencia-material" element={<AderenciaMaterial />} />
            <Route path="/requisicao-material" element={<RequisicaoMaterial />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
