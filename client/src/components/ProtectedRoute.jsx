import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext';


export function ProtectedRoute({ children }) {

    const { user } = useContext(AuthContext);

    if (user == null) {
        return <Navigate replace to="/login"/>;
    } else {
        return children;
    }
}