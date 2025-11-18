// src/main.jsx
import "@fortawesome/fontawesome-free/css/all.min.css"; // optional, if you use icons

import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/main.scss";
import "./index.css";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
