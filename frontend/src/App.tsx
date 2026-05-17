import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ComparisonPage from './pages/ComparisonPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-makita-blue text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight">Makita</span>
          <span className="text-makita-teal font-semibold text-lg">Price Comparison</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tools/:modelNumber" element={<ComparisonPage />} />
        </Routes>
      </main>
    </div>
  );
}
