import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './auth';
import LoginPage from './pages/LoginPage';
import WorldMapPage from './pages/WorldMapPage';
import IslandPage from './pages/IslandPage';
import MissionPage from './pages/MissionPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/world" element={<PrivateRoute><WorldMapPage /></PrivateRoute>} />
        <Route path="/islands/:id" element={<PrivateRoute><IslandPage /></PrivateRoute>} />
        <Route path="/missions/:id" element={<PrivateRoute><MissionPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={isLoggedIn() ? '/world' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
