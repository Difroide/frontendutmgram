import GruposList from './GruposList'

export default function GruposListPage() {
  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100">Grupos</h1>
        <p className="text-gray-400 mt-2">Visualize todos os grupos do sistema</p>
      </div>
      <GruposList />
    </div>
  )
}

