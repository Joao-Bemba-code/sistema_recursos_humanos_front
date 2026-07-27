"use client";

import { createContext, useContext, useState, useEffect } from "react";

var ThemeContext = createContext();

export function ThemeProvider({ children }) {
  var [dark, setDark] = useState(false);

  useEffect(function () {
    var stored = localStorage.getItem("sghr-theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  var toggle = function () {
    setDark(function (prev) {
      var next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("sghr-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("sghr-theme", "light");
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export var useTheme = function () {
  return useContext(ThemeContext);
};
