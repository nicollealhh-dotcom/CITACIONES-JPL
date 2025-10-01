
import React from 'react';
import type { CorrespondenceRow } from '../types';

interface CorrespondenceViewProps {
    data: CorrespondenceRow[];
}

export const CorrespondenceView: React.FC<CorrespondenceViewProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-center text-slate-500 py-8">No hay datos de correspondencia para mostrar.</p>;
    }

    const headers = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        {headers.map((header) => (
                            <th 
                                key={header} 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                            {headers.map((header) => (
                                <td key={`${rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                    {row[header as keyof CorrespondenceRow]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};