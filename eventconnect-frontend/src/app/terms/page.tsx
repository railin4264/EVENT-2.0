import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de Servicio | EventConnect',
  description: 'Términos y condiciones de uso de la plataforma EventConnect.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-violet-500/10 dark:bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative z-10">
          <p className="text-sm font-semibold text-violet-500 mb-2 uppercase tracking-wider">Legal</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            Términos de Servicio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Última actualización: Abril 2025
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-3xl p-6 sm:p-10 shadow-sm backdrop-blur-xl">
          <div className="prose prose-violet dark:prose-invert max-w-none space-y-10 text-gray-600 dark:text-gray-300">
            
            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">1</span>
                Aceptación de los términos
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Al acceder y usar EventConnect, aceptas estar vinculado por estos Términos de Servicio.
                  Si no estás de acuerdo con alguno de estos términos, no debes usar la plataforma.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">2</span>
                Descripción del servicio
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  EventConnect es una plataforma social para descubrir, crear y gestionar eventos.
                  Nos reservamos el derecho de modificar o descontinuar temporalmente el servicio.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">3</span>
                Cuentas de usuario
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Eres completamente responsable de mantener la confidencialidad de tu cuenta y contraseña.
                  Notifícanos inmediatamente sobre cualquier uso no autorizado o violación de seguridad.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">4</span>
                Contenido del usuario
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Eres el único responsable del contenido visual y textual que publicas. Queda estrictamente
                  prohibido publicar contenido ilegal, ofensivo, discriminatorio o que viole la propiedad intelectual.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">5</span>
                Contacto legal
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Para consultas legales, notificaciones DMCA o para aclarar dudas sobre estos términos, por favor dirígite a:
                </p>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 inline-block">
                  <a href="mailto:legal@eventconnect.app" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors">
                    legal@eventconnect.app
                  </a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
