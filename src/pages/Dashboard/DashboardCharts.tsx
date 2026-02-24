export const DashboardCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Atividades Recentes</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 backdrop-blur-sm rounded-lg border border-gray-600/30">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Nova conta adicionada</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 backdrop-blur-sm rounded-lg border border-gray-600/30">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Bot iniciado com sucesso</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 backdrop-blur-sm rounded-lg border border-gray-600/30">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Proxy configurado</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-600/30 hover:shadow-xl transition-all">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Status do Sistema</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Serviços</span>
            <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm font-medium">
              Online
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">API</span>
            <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm font-medium">
              Conectado
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Banco de Dados</span>
            <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm font-medium">
              Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

