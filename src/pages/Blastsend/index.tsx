import { AlertCircle } from 'lucide-react'

export function BlastSend() {
    return (
        <div className="p-6 space-y-6 text-gray-100 min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center">

            <div className="max-w-md w-full bg-[#1b1e25] p-8 rounded-lg shadow-lg border border-red-900/30 text-center">
                <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />

                <h2 className="text-xl font-bold text-gray-300 mb-2">
                    Módulo Desativado
                </h2>

                <p className="text-gray-500 text-sm mb-6">
                    O gerenciador de links BlastSend foi removido.
                </p>

                <div className="h-px bg-gray-800 my-6 w-full" />

                <p className="text-xs text-gray-600">
                    Entre em contato com o suporte para mais informações.
                </p>
            </div>

        </div>
    )
}
