"use client";

// Skeleton simples sobre a classe .skeleton do globals.css.
// Ex.: <Skeleton className="h-4 w-1/3" />
export default function Skeleton({ className = "" }) {
  return <div className={"skeleton " + className} />;
}
