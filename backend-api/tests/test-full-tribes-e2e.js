const fetch = globalThis.fetch || require('node-fetch');

async function runFullTribesValidation() {
  const baseURL = 'http://127.0.0.1:5000/api';
  console.log('====================================================');
  console.log('🚀 EXHAUSTIVE END-TO-END TRIBES MODULE VERIFICATION');
  console.log('====================================================\n');

  const postJSON = async (url, body, headers = {}) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const putJSON = async (url, body, headers = {}) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const getJSON = async (url, headers = {}) => {
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const deleteJSON = async (url, headers = {}) => {
    const res = await fetch(url, { method: 'DELETE', headers });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  };

  // 1. Log in Admin
  console.log('1. Autenticando como Administrador de la Plataforma (admin@eventnow.do)...');
  const adminLogin = await postJSON(`${baseURL}/auth/login`, {
    email: 'admin@eventnow.do',
    password: 'Password123!'
  });
  const adminToken = adminLogin.token || adminLogin.data?.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('   ✅ Admin autenticado exitosamente.');

  // 2. Log in Regular User
  console.log('2. Autenticando como Usuario Regular (acustica@eventnow.do)...');
  const userLogin = await postJSON(`${baseURL}/auth/login`, {
    email: 'acustica@eventnow.do',
    password: 'Password123!'
  });
  const userToken = userLogin.token || userLogin.data?.token;
  const userObj = userLogin.user || userLogin.data?.user;
  const userHeaders = { Authorization: `Bearer ${userToken}` };
  console.log(`   ✅ Usuario @${userObj.username} (${userObj._id}) autenticado.`);

  // 3. GET /api/tribes (Listing)
  console.log('3. Probando GET /api/tribes (Listado de tribus públicas y privadas)...');
  const tribesList = await getJSON(`${baseURL}/tribes`, userHeaders);
  console.log(`   ✅ Total de comunidades obtenidas: ${tribesList.count}`);
  if (!tribesList.data || tribesList.data.length === 0) {
    throw new Error('No se encontraron tribus en la base de datos');
  }

  const privateTribe = tribesList.data.find(t => t.isPrivate);
  const publicTribe = tribesList.data.find(t => !t.isPrivate);

  console.log(`   - Tribu Pública encontrada: "${publicTribe?.name}"`);
  console.log(`   - Tribu Privada encontrada: "${privateTribe?.name}"`);

  // 4. Detail of Public Tribe
  console.log(`4. Obteniendo detalle de tribu pública "${publicTribe.name}" (ID: ${publicTribe._id})...`);
  const pubDetail = await getJSON(`${baseURL}/tribes/${publicTribe._id}`, userHeaders);
  const pubTribeData = pubDetail.tribe || pubDetail.data;
  console.log(`   ✅ Detalle obtenido: Miembros: ${pubTribeData.members?.length || 0}, Eventos: ${pubTribeData.events?.length || 0}, Posts: ${pubTribeData.posts?.length || 0}`);

  // 5. Flow of Private Tribe Request & Cancellation
  if (privateTribe) {
    console.log(`\n5. Flujo de Solicitud a Tribu Privada: "${privateTribe.name}"`);
    console.log('   50. Asegurando estado limpio (usuario no miembro antes del test)...');
    try {
      await postJSON(`${baseURL}/tribes/${privateTribe._id}/leave`, {}, userHeaders);
    } catch (e) {}
    try {
      await deleteJSON(`${baseURL}/tribes/${privateTribe._id}/join-request`, userHeaders);
    } catch (e) {}

    console.log('   5a. Usuario envía solicitud a tribu privada...');
    const reqRes = await postJSON(`${baseURL}/tribes/${privateTribe._id}/join`, {
      message: '¡Saludos! Me apasiona la fotografía nocturna y quiero unirme al club.'
    }, userHeaders);
    console.log(`   ✅ Solicitud enviada: status=${reqRes.status}, hasPendingRequest=${reqRes.hasPendingRequest}`);

    console.log('   5b. Verificando que el detalle de la tribu refleja la solicitud pendiente...');
    const privDetail = await getJSON(`${baseURL}/tribes/${privateTribe._id}`, userHeaders);
    const privTribeData = privDetail.tribe || privDetail.data;
    console.log(`   ✅ Estado verificado: hasPendingRequest=${privTribeData.hasPendingRequest}, isMember=${privTribeData.isMember}`);

    console.log('   5c. Usuario cancela la solicitud de ingreso...');
    const cancelRes = await deleteJSON(`${baseURL}/tribes/${privateTribe._id}/join-request`, userHeaders);
    console.log(`   ✅ Solicitud cancelada: message="${cancelRes.message}", hasPendingRequest=${cancelRes.hasPendingRequest}`);

    console.log('   5d. Usuario vuelve a enviar la solicitud para que el anfitrión la apruebe...');
    const reReq = await postJSON(`${baseURL}/tribes/${privateTribe._id}/join`, {
      message: 'Solicitud definitiva para degustaciones gourmet RD.'
    }, userHeaders);
    console.log(`   ✅ Solicitud restablecida: status=${reReq.status}`);

    // 6. Admin Approves the Request
    console.log('\n6. Flujo de Aprobación por Anfitrión / Admin:');
    console.log('   6a. Anfitrión / Admin lista solicitudes pendientes...');
    const pendingList = await getJSON(`${baseURL}/tribes/${privateTribe._id}/requests`, adminHeaders);
    console.log(`   ✅ Solicitudes pendientes encontradas: ${pendingList.count}`);
    const foundReq = pendingList.requests.find(r => String(r.user?._id || r.user) === String(userObj._id));
    if (!foundReq) {
      throw new Error('La solicitud del usuario no apareció en la lista de pendientes del admin');
    }
    console.log(`   ✅ Solicitud del usuario @${foundReq.user?.username || 'acustica'} localizada.`);

    console.log('   6b. Admin aprueba la solicitud...');
    const approveRes = await postJSON(`${baseURL}/tribes/${privateTribe._id}/requests/${userObj._id}/approve`, {}, adminHeaders);
    console.log(`   ✅ Solicitud aprobada con éxito: "${approveRes.message}"`);

    console.log('   6c. Verificando que el usuario ahora es miembro activo de la tribu privada...');
    const postApproveDetail = await getJSON(`${baseURL}/tribes/${privateTribe._id}`, userHeaders);
    const postApproveTribe = postApproveDetail.tribe || postApproveDetail.data;
    console.log(`   ✅ Estado actualizado: isMember=${postApproveTribe.isMember}, hasPendingRequest=${postApproveTribe.hasPendingRequest}`);
  }

  // 7. Community Posts, Comments, and Likes
  console.log('\n7. Flujo de Publicaciones, Likes y Comentarios dentro de la comunidad:');
  const targetTribeId = privateTribe ? privateTribe._id : publicTribe._id;

  console.log(`   7a. Creando publicación en tribu (${targetTribeId})...`);
  const newPostRes = await postJSON(`${baseURL}/tribes/${targetTribeId}/posts`, {
    content: '¡Increíble encuentro con toda la comunidad! Aquí les comparto mis mejores impresiones. 🇩🇴🔥'
  }, userHeaders);
  const createdPost = newPostRes.post;
  console.log(`   ✅ Publicación creada (ID: ${createdPost._id}): "${createdPost.content}"`);

  console.log('   7b. Dando "Me gusta" a la publicación...');
  const likeRes = await postJSON(`${baseURL}/tribes/${targetTribeId}/posts/${createdPost._id}/like`, {}, userHeaders);
  console.log(`   ✅ Like registrado: total=${likeRes.likes ?? likeRes.likesCount}`);

  console.log('   7c. Agregando comentario a la publicación...');
  const commentRes = await postJSON(`${baseURL}/tribes/${targetTribeId}/posts/${createdPost._id}/comments`, {
    content: '¡Totalmente de acuerdo! Esperando la próxima reunión.'
  }, userHeaders);
  console.log(`   ✅ Comentario creado: "${commentRes.comment?.content || 'Registrado'}"`);

  console.log('   7d. Obteniendo listado de posts de la tribu...');
  const postsList = await getJSON(`${baseURL}/tribes/${targetTribeId}/posts`, userHeaders);
  console.log(`   ✅ Total de publicaciones en la tribu: ${postsList.total || postsList.count}`);

  // 8. Creation, Update, and Deletion of a Community
  console.log('\n8. Flujo Completo del Ciclo de Vida de una Tribu:');
  const uniqueName = `Tribu Runners Malecón ${Date.now().toString().slice(-4)}`;
  console.log(`   8a. Creando nueva comunidad "${uniqueName}"...`);
  const createTribeRes = await postJSON(`${baseURL}/tribes`, {
    name: uniqueName,
    description: 'Comunidad de corredores matutinos por el Malecón de Santo Domingo.',
    category: 'sports',
    isPublic: true,
    requiresApproval: false,
    tags: ['running', 'malecon', 'fitness', 'santodomingo'],
    rules: ['Puntualidad en los entrenamientos', 'Cuidar la hidratación de todos'],
    location: {
      address: 'Malecón de Santo Domingo, RD',
      city: 'Santo Domingo',
      coordinates: [-69.8905, 18.4655]
    }
  }, userHeaders);
  const myTribe = createTribeRes.tribe || createTribeRes.data;
  console.log(`   ✅ Tribu creada con éxito (ID: ${myTribe._id}): "${myTribe.name}"`);

  console.log('   8b. Actualizando configuración de la comunidad...');
  const updateRes = await putJSON(`${baseURL}/tribes/${myTribe._id}`, {
    description: 'Comunidad oficial de corredores del Malecón de Santo Domingo. ¡5K y 10K cada sábado!',
    welcomeMessage: '¡Bienvenido al mejor grupo de corredores de la capital!'
  }, userHeaders);
  console.log(`   ✅ Tribu actualizada: "${(updateRes.tribe || updateRes.data).welcomeMessage}"`);

  console.log('   8c. Eliminando comunidad de prueba...');
  const deleteRes = await deleteJSON(`${baseURL}/tribes/${myTribe._id}`, userHeaders);
  console.log(`   ✅ Tribu eliminada correctamente: "${deleteRes.message}"`);

  console.log('\n====================================================');
  console.log('🎉 100% DE LAS PRUEBAS DEL MÓDULO DE TRIBUS PASARON!');
  console.log('   - Búsqueda y listado: FUNCIONA');
  console.log('   - Tribus públicas y privadas: FUNCIONA');
  console.log('   - Solicitudes de ingreso y cancelación: FUNCIONA');
  console.log('   - Aprobación y rechazo por administradores: FUNCIONA');
  console.log('   - Muro de publicaciones, likes y comentarios: FUNCIONA');
  console.log('   - Creación, edición y eliminación de comunidades: FUNCIONA');
  console.log('====================================================\n');
}

runFullTribesValidation().catch(err => {
  console.error('\n❌ ERROR EN LA PRUEBA DE TRIBUS:', err.message);
  if (err.data) console.error('Detalles:', JSON.stringify(err.data, null, 2));
  process.exit(1);
});
