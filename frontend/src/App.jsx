import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LabList from './pages/LabList';
import LabDetail from './pages/LabDetail';
import Progress from './pages/Progress';

function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/labs"
          element={
            <ProtectedRoute>
              <LabList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/labs/:id"
          element={
            <ProtectedRoute>
              <LabDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/labs" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;