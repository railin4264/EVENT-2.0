const API_URL = 'http://localhost:5000/api';

// Sabana Perdida coordinates
const BASE_LAT = 18.5333;
const BASE_LNG = -69.8833;

function getRandomCoordinate(base, range) {
    return base + (Math.random() - 0.5) * range;
}

const CATEGORIES = ['music', 'sports', 'technology', 'food', 'art', 'business', 'education', 'other'];

async function seedEvents() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'demo@eventconnect.com',
                password: 'Demo123!'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Login successful.');

        // 2. Create 30 Events
        console.log('Creating 30 events in Sabana Perdida...');

        let createdCount = 0;

        for (let i = 0; i < 30; i++) {
            const lat = getRandomCoordinate(BASE_LAT, 0.04);
            const lng = getRandomCoordinate(BASE_LNG, 0.04);

            const eventData = {
                title: `Evento Sabana ${i + 1}`,
                description: `Este es un evento de prueba número ${i + 1} en Sabana Perdida. Ven a disfrutar con nosotros.`,
                category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
                date: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(), // Random date within 10 days
                location: {
                    type: 'Point',
                    coordinates: [lng, lat],
                    address: `Calle ${Math.floor(Math.random() * 100)}, Sabana Perdida`,
                    venue: `Local ${i + 1}`
                },
                price: {
                    amount: Math.floor(Math.random() * 1000),
                    currency: 'DOP'
                },
                maxAttendees: 50 + Math.floor(Math.random() * 200),
                tags: ['sabana', 'evento', 'prueba']
            };

            const res = await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });

            if (res.ok) {
                createdCount++;
                process.stdout.write('.');
            } else {
                const err = await res.json();
                console.error(`\nFailed to create event ${i + 1}:`, err.message);
            }
        }

        console.log(`\n\n✅ Successfully created ${createdCount} events in Sabana Perdida.`);

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
    }
}

seedEvents();
