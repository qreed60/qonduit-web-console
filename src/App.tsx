import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import ModelsPage from './pages/ModelsPage';
import RouterPage from './pages/RouterPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import RagPage from './pages/RagPage';
import SettingsPage from './pages/SettingsPage';
import GatewaySettingsPage from './pages/GatewaySettingsPage';
import { Page } from './types';

// Navigation wrapper component to sync URL with state
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Map current path to page state
  const getPageFromPath = (path: string): Page => {
      if (path === '/' || path === '/dashboard') return 'dashboard';
      if (path === '/chat') return 'chat';
      if (path === '/models') return 'models';
      if (path === '/router') return 'router';
      if (path === '/diagnostics') return 'diagnostics';
      if (path === '/rag') return 'rag';
      if (path === '/settings') return 'settings';
      if (path === '/gateway-settings') return 'gateway-settings';
      return 'dashboard';
    };

  const currentPage = getPageFromPath(location.pathname);

  // Update URL when page changes
  const handleChangePage = (page: Page) => {
    const pathMap: Record<Page, string> = {
        dashboard: '/',
        chat: '/chat',
        models: '/models',
        router: '/router',
        diagnostics: '/diagnostics',
        rag: '/rag',
        settings: '/settings',
        'gateway-settings': '/gateway-settings',
      };
    navigate(pathMap[page]);
  };

  return (
      <div className="flex h-screen bg-bg-primary text-text-primary transition-colors duration-300 overflow-x-hidden" style={{ overflowX: 'hidden' }}>
        <Sidebar currentPage={currentPage} onChangePage={handleChangePage} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
          <main className="flex-1 overflow-y-auto bg-bg-primary overflow-x-hidden">
           <Routes>
             <Route path="/" element={<DashboardPage />} />
             <Route path="/dashboard" element={<DashboardPage />} />
             <Route path="/chat" element={<ChatPage />} />
             <Route path="/models" element={<ModelsPage />} />
             <Route path="/router" element={<RouterPage />} />
             <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/rag" element={<RagPage />} />
               <Route path="/settings" element={<SettingsPage />} />
               <Route path="/gateway-settings" element={<GatewaySettingsPage />} />
            </Routes>
         </main>
       </div>
     </div>
   );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
