"use client";

export default function StatCard({ titulo, valor, icon, trend, trendUp, className = "" }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{titulo}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{valor}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-sm font-medium ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
                {trendUp ? "▲" : "▼"} {trend}
              </span>
              <span className="text-sm text-gray-500">vs mês anterior</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <span className="text-primary-600 dark:text-primary-400 text-xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
