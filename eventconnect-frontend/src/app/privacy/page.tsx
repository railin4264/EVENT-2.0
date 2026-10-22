import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad | EventConnect',
  description: 'Conoce cómo EventConnect recopila, usa y protege tu información personal.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/10 dark:bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative z-10">
          <p className="text-sm font-semibold text-violet-500 mb-2 uppercase tracking-wider">Términos Legales</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            Política de Privacidad
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Última actualización: Abril 2025
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-3xl p-6 sm:p-10 shadow-sm backdrop-blur-xl">
          <div className="prose prose-emerald dark:prose-invert max-w-none space-y-10 text-gray-600 dark:text-gray-300">
            
            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">1</span>
                Información que recopilamos
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Recopilamos información que nos proporcionas directamente, como nombre, correo
                  electrónico y preferencias de eventos, así como datos de uso de la plataforma.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">2</span>
                Uso de la información
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Utilizamos tu información para personalizar tu experiencia, enviarte notificaciones
                  relevantes sobre eventos y mejorar nuestros servicios.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">3</span>
                Compartición de datos
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  No vendemos tu información personal a terceros. Solo compartimos datos con
                  proveedores de servicios necesarios para operar la plataforma de manera eficiente.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">4</span>
                Cookies y Rastreos
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Utilizamos cookies para mantener tu sesión activa y mejorar la experiencia.
                  Puedes desactivar las cookies en la configuración de tu navegador.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-sm">5</span>
                Tus derechos
              </h2>
              <div className="pl-11">
                <p className="leading-relaxed">
                  Tienes derecho a acceder, corregir o eliminar tus datos personales en cualquier momento. 
                  Para ejercer estos derechos, contáctanos en nuestro correo oficial de soporte:
                </p>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 inline-block">
                  <a href="mailto:privacy@eventconnect.app" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors">
                    privacy@eventconnect.app
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
