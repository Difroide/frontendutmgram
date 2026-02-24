import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface ChartProps {
    data: {
        total: number;
        online: number;
        offline: number;
        privado: number;
    };
    history?: Array<{
        date: string;
        online: number;
        offline: number;
    }>;
}

export const DashboardCharts: React.FC<ChartProps> = ({ history = [] }) => {
    // Se não tem histórico, mostrar mensagem de estado vazio
    if (history.length === 0) {
        return (
            <div className="bg-[#161b22] border border-gray-800/60 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                    Evolução dos Grupos (Últimos 7 dias)
                </h3>
                <p className="text-gray-500 text-sm text-center py-8">
                    Nenhum dado histórico disponível ainda. Execute uma verificação diária para começar a acumular dados.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#161b22] border border-gray-800/60 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                Evolução dos Grupos (Últimos 7 dias)
            </h3>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                color: '#f3f4f6',
                                borderRadius: '8px'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                        />
                        <Line
                            type="monotone"
                            dataKey="online"
                            name="Grupos Online"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 7 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="offline"
                            name="Grupos Caídos"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#ef4444', strokeWidth: 0 }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
