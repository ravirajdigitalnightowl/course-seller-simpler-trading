import React from "react";

const ResponsiveTable = ({ 
  headers, 
  data, 
  onEdit, 
  onDelete, 
  keyExtractor
}) => {
  return (
    <div className="bg-card w-full">
      {/* Desktop Table */}
      <div className="hidden lg:block w-full overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              {headers.map((header, index) => (
                <th 
                  key={index}
                  className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {data.map((item, index) => (
              <tr key={keyExtractor(item)} className="hover:bg-muted/50">
                {headers.map((header, cellIndex) => {
                  const key = header.toLowerCase().replace(/\s+/g, '_');
                  return (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {item[key] || `Data ${cellIndex + 1}`}
                    </td>
                  );
                })}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit && onEdit(item)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(item)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4 p-4 w-full">
        {data.map((item, index) => (
          <div key={keyExtractor(item)} className="bg-muted border border-border rounded-lg p-4 w-full">
            <div className="space-y-3">
              {headers.map((header, cellIndex) => {
                const key = header.toLowerCase().replace(/\s+/g, '_');
                return (
                  <div key={cellIndex} className="flex justify-between items-center">
                    <span className="font-semibold text-foreground text-sm">{header}:</span>
                    <span className="text-foreground text-sm text-right flex-1 ml-4 truncate">
                      {item[key] || `Data ${cellIndex + 1}`}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <button
                  onClick={() => onEdit && onEdit(item)}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete && onDelete(item)}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponsiveTable;