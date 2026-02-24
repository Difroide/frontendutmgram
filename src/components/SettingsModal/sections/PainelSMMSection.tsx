import { MeasmmCard } from '../../../pages/configurações/PainelSMM/components/MeasmmCard'
import { SmmProviderCard } from '../../../pages/configurações/PainelSMM/components/SmmProviderCard'
import { BrsmmCard } from '../../../pages/configurações/PainelSMM/components/BrsmmCard'

export const PainelSMMSection = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MeasmmCard />
        <SmmProviderCard />
        <BrsmmCard />
      </div>
    </div>
  )
}

