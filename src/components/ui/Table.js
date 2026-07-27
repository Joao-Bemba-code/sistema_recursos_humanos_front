"use client";

import Card from "./Card";
import EmptyState from "./EmptyState";

export default function Table({ columns, data = [], loading, emptyMessage = "Nenhum registo encontrado", onRowClick }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <div className="p-8 space-y-4">
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState icon="inbox" title={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(function (col, idx) {
              return (
                <th key={idx} style={col.width ? { width: col.width } : {}}>
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map(function (row, rowIdx) {
            return (
              <tr
                key={row.id || rowIdx}
                onClick={onRowClick ? function () { onRowClick(row); } : undefined}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map(function (col, colIdx) {
                  var value = row[col.accessor];
                  return (
                    <td key={colIdx}>
                      {col.render
                        ? col.render(value, row)
                        : value || "—"
                      }
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
