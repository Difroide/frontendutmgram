import { CheckCircle2 } from 'lucide-react'

interface SystemStatusProps {
  services: Array<{
    name: string
    status: 'online' | 'offline'
  }>
}

export const SystemStatus = ({ services }: SystemStatusProps) => {
  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-4">Status do Sistema</h2>
      
      <div className="space-y-2">
        {services.map((service, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117]"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-gray-300">
                {service.name}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              service.status === 'online' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {service.status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
