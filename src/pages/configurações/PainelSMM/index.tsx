import { MeasmmCard } from './components/MeasmmCard'
import { SmmProviderCard } from './components/SmmProviderCard'
import { BrsmmCard } from './components/BrsmmCard'

export default function PainelSMM() {
  return (
    <div className="space-y-6 min-h-screen -m-6 p-6">
      <div className="bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-600/30 shadow-lg p-6 hover:shadow-xl transition-shadow">
        <h1 className="text-3xl font-bold text-gray-100">Painel SMM</h1>
        <p className="text-gray-400 mt-2">Configure seus painéis SMM</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MeasmmCard />
        <SmmProviderCard />
        <BrsmmCard />
      </div>
    </div>
  )
}

