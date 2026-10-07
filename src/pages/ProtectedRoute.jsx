import React, { useEffect } from "react";
import { useAuth } from "../contexts/FakeAuthContext";
import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuth) navigate("/login");
  }, [isAuth, navigate]);
  return isAuth ? children : null;
}

export default ProtectedRoute;
