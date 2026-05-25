import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@medusajs/icons";

export default function Redirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/vehicles", { replace: true }); }, []);
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="animate-spin" />
    </div>
  );
}
