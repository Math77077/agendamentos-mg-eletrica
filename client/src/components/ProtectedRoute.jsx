import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext';


export function ProtectedRoute({ children, requiredRole }) {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <p>Verificando autenticação...</p>;
    }

    if (!user) {
        return <Navigate replace to="/login"/>;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate replace to={user.role === 'admin' ? '/admin' : '/'} />;
    }

    return children;
}