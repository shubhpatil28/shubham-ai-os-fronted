import { useEffect } from "react";

const API_URL = "https://shubham-ai-backend.onrender.com";

export default function App() {

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((res) => res.text())
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div
      style={{
        background: "#050816",
        color: "cyan",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "40px",
        fontWeight: "bold",
      }}
    >
      SHUBHAM AI OS 🚀
    </div>
  );
}
