/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Login from './pages/Login';
import AdminServers from './pages/AdminServers';
import BroadcastMessage from './pages/BroadcastMessage';
import Analytics from './pages/Analytics';
import CreditRequests from './pages/CreditRequests';
import Dashboard from './pages/Dashboard';
import DevDiagnostics from './pages/DevDiagnostics';
import FinanceiroPospago from './pages/FinanceiroPospago';
import GodDashboard from './pages/GodDashboard';
import Home from './pages/Home';
import Index from './pages/Index';
import InvoiceManagement from './pages/InvoiceManagement';
import Management from './pages/Management';
import MessageTemplates from './pages/MessageTemplates';
import Playlists from './pages/Playlists';
import Profile from './pages/Profile';
import ProofGallery from './pages/ProofGallery';
import Register from './pages/Register';
import Servers from './pages/Servers';
import Settings from './pages/Settings';
import Users from './pages/Users';
import WhatsAppDiagnostic from './pages/WhatsAppDiagnostic';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Login": Login,
    "AdminServers": AdminServers,
    "BroadcastMessage": BroadcastMessage,
    "Analytics": Analytics,
    "CreditRequests": CreditRequests,
    "Dashboard": Dashboard,
    "DevDiagnostics": DevDiagnostics,
    "FinanceiroPospago": FinanceiroPospago,
    "GodDashboard": GodDashboard,
    "Home": Home,
    "Index": Index,
    "InvoiceManagement": InvoiceManagement,
    "Management": Management,
    "MessageTemplates": MessageTemplates,
    "Playlists": Playlists,
    "Profile": Profile,
    "ProofGallery": ProofGallery,
    "Register": Register,
    "Servers": Servers,
    "Settings": Settings,
    "Users": Users,
    "WhatsAppDiagnostic": WhatsAppDiagnostic,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
