export const PainelSMM = () => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL do Painel SMM
        </label>
        <input
          type="text"
          placeholder="https://exemplo.com/api"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          API Key
        </label>
        <input
          type="password"
          placeholder="Digite sua API Key"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Salvar Configurações
      </button>
    </div>
  )
}

