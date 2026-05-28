import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import type { Role } from '../lib/types';

export default function RequireAuth({
  roles,
  children,
}: {
  roles?: Role[];
  children: React.ReactNode;
}) {
  const location = useLocation();
  const user = useAppSelector(s => s.auth.user);
  const accessToken = useAppSelector(s => s.auth.accessToken);

  if (!user || !accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app/board" replace />;
  }
  return <>{children}</>;
}
