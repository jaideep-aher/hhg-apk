import React from "react";

export const DataGrid = ({ data }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              दिनांक (Date)
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
              सरासरी दर (₹/kg)
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
              कमाल दर (₹/kg)
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
              किमान दर (₹/kg)
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
              आवक (Kg)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {[...data].reverse().map((point, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                {point.date}
              </td>
              <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                ₹{point.avgRate}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                ₹{point.maxRate}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                ₹{point.minRate}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {point.volume.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
