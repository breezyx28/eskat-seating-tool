import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import Landing from '@/pages/Landing';
import Playground from '@/pages/Playground';
import Benchmark from '@/pages/Benchmark';
import TemplateStudio from '@/pages/TemplateStudio';

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/templates" element={<TemplateStudio />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}
