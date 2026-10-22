export const MOBILE_SECTIONS = [
  { title: 'Descubre', items: [
    { title: 'Buscar en EventNow', description: 'Eventos, tribus, personas y anfitriones.', route: '/search', icon: 'search-outline', public: true },
    { title: 'Mapa de eventos', description: 'Explora lugares o busca cerca de ti.', route: '/map', icon: 'map-outline', public: true },
    { title: 'Eventos', description: 'Encuentra tu próximo plan.', route: '/(tabs)/discover', icon: 'compass-outline', public: true },
  ] },
  { title: 'Tu comunidad', items: [
    { title: 'Publicaciones', description: 'Lo que comparte tu comunidad.', route: '/feed', icon: 'chatbubbles-outline', public: false },
    { title: 'Tribus', description: 'Conecta por intereses.', route: '/tribes/discover', icon: 'people-outline', public: false },
    { title: 'Mensajes', description: 'Continúa la conversación.', route: '/messages', icon: 'mail-outline', public: false },
    { title: 'Publicar', description: 'Comparte una idea o una experiencia.', route: '/create-post', icon: 'create-outline', public: false },
    { title: 'Crear historia', description: 'Comparte un momento.', route: '/create-story', icon: 'camera-outline', public: false },
  ] },
  { title: 'Organiza tu plan', items: [
    { title: 'Planes con amigos', description: 'Votaciones e invitaciones.', route: '/group-plans', icon: 'people-circle-outline', public: true },
    { title: 'Ideas y actividades', description: 'Encuentra público para tu idea.', route: '/ideas-market', icon: 'bulb-outline', public: true },
    { title: 'Itinerarios y horarios', description: 'Calendario, zonas horarias y borradores.', route: '/planning-tools', icon: 'calendar-outline', public: true },
    { title: 'Mis entradas', description: 'Consulta tus pases y sus códigos.', route: '/tickets', icon: 'ticket-outline', public: false },
    { title: 'Pasaporte y logros', description: 'Tus experiencias y desafíos.', route: '/passport', icon: 'ribbon-outline', public: false },
  ] },
  { title: 'Anfitriones y aliados', items: [
    { title: 'Gestión y anfitriones', description: 'Accede a los paneles de gestión web.', route: '/operations', icon: 'stats-chart-outline', public: false },
    { title: 'Crear evento', description: 'Prepara tu próxima experiencia.', route: '/create-event', icon: 'add-circle-outline', public: false },
    { title: 'Crear tribu', description: 'Reúne a tu comunidad.', route: '/create-tribe', icon: 'people-outline', public: false },
    { title: 'Patrocinadores y espacios', description: 'Propuestas y colaboraciones.', route: '/partners', icon: 'storefront-outline', public: true },
    { title: 'Servicios para eventos', description: 'Consulta proveedores disponibles.', route: '/services', icon: 'briefcase-outline', public: false },
  ] },
  { title: 'Tu cuenta', items: [
    { title: 'Notificaciones', description: 'Tus avisos y novedades.', route: '/notifications', icon: 'notifications-outline', public: false },
    { title: 'Configuración', description: 'Preferencias, privacidad y cuenta.', route: '/settings', icon: 'settings-outline', public: false },
    { title: 'Herramientas de cuenta', description: 'Preferencias y control de tus datos.', route: '/account-tools', icon: 'person-circle-outline', public: false },
  ] },
] as const;
export const MOBILE_RETURN_ROUTES: readonly string[] = MOBILE_SECTIONS.flatMap(section => section.items.map(item => item.route));
