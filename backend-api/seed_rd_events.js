const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Setup environment
dotenv.config({ path: __dirname + '/.env' });

// Load models
const User = require('./src/models/User');
const Event = require('./src/models/Event');

// RD cities with some typical coords: [longitude, latitude]
const cities = [
    { name: 'Santo Domingo', lng: -69.9312, lat: 18.4861 },
    { name: 'Santiago', lng: -70.6970, lat: 19.4517 },
    { name: 'Punta Cana', lng: -68.3739, lat: 18.5820 },
    { name: 'Puerto Plata', lng: -70.6973, lat: 19.7934 },
    { name: 'La Romana', lng: -68.9728, lat: 18.4273 },
    { name: 'Samaná', lng: -69.3368, lat: 19.2056 },
    { name: 'San Cristóbal', lng: -70.1084, lat: 18.4167 },
    { name: 'Boca Chica', lng: -69.5966, lat: 18.4485 },
    { name: 'Baní', lng: -70.3259, lat: 18.2796 },
    { name: 'Barahona', lng: -71.1008, lat: 18.2085 }
];

const categories = ['music', 'sports', 'technology', 'food', 'art', 'business', 'education', 'other'];

const eventTitles = [
    "Festival de Jazz Caribeño",
    "Tech Summit DR 2026",
    "Maratón del Sol",
    "Feria Gastronómica",
    "Exposición de Arte Moderno",
    "Conferencia de Emprendedores",
    "Taller de Desarrollo Web",
    "Concierto Sinfónico",
    "Torneo de Voleibol de Playa",
    "Tasting de Ron Dominicano",
    "Exposición de Fotografía Local",
    "Danza Folklórica en Vivo",
    "Meetup de Creadores de Contenido",
    "Feria del Libro Independiente",
    "Charla de Inteligencia Artificial",
    "Clases de Salsa Múltiples",
    "Torneo de Ajedrez Nacional",
    "Exposición de Vehículos Clásicos",
    "Yoga al Amanecer",
    "Concierto de Rock Local",
    "Festival de Cerveza Artesanal",
    "Torneo de Surf",
    "Simposio de Energía Renovable",
    "Hackathon Caribe",
    "Taller de Pintura al Óleo",
    "Noche de Comedia Staund-up",
    "Cumbre de Liderazgo Femenino",
    "Feria de Adopción de Mascotas",
    "Mercado de Productos Orgánicos",
    "Observación de Estrellas"
];

function getRandomDate() {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2); // Up to 2 months in the future
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const seedDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI ? process.env.MONGODB_URI.replace('localhost', '127.0.0.1') : 'mongodb://127.0.0.1:27017/eventconnect';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB...');

        // 1. Create Test User
        const email = 'rd_tester@eventnow.com';
        let user = await User.findOne({ email });

        if (!user) {
            console.log('Créando usuario de prueba: rd_tester@eventnow.com');
            user = await User.create({
                username: 'rd_tester_pro',
                email: email,
                password: 'Password123!',
                firstName: 'Jose',
                lastName: 'Pruebas',
                bio: 'Tester oficial de RD',
                birthDate: new Date('1995-01-01'),
                verified: true
            });
        } else {
            console.log('Usuario de prueba ya existe, reutilizando ID...');
        }

        // 2. Generate 30 Events
        console.log('Borrando eventos anteriores de prueba si existen...');
        await Event.deleteMany({ createdBy: user._id });

        const eventsToCreate = [];
        for (let i = 0; i < 30; i++) {
            const city = cities[i % cities.length];
            const category = categories[i % categories.length];

            // Add slight randomization to coordinates so they don't overlap completely
            const randomLng = city.lng + (Math.random() * 0.05 - 0.025);
            const randomLat = city.lat + (Math.random() * 0.05 - 0.025);

            const eventDate = getRandomDate();
            const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours later

            eventsToCreate.push({
                title: eventTitles[i] || `Evento Masivo en RD #${i + 1}`,
                description: `Este es un evento de prueba masivo generado automáticamente en la ciudad de ${city.name}. Ven a disfrutar de una experiencia inolvidable. Creado para la demostración y verificación de QA de EventConnect.`,
                category: category,
                date: eventDate,
                endDate: endDate,
                location: {
                    type: 'Point',
                    coordinates: [randomLng, randomLat],
                    address: `Centro de Eventos de ${city.name}, República Dominicana`,
                    venue: `Plaza Principal ${city.name}`
                },
                maxAttendees: Math.floor(Math.random() * 500) + 50,
                price: {
                    amount: Math.floor(Math.random() * 2000),
                    currency: 'DOP'
                },
                createdBy: user._id,
                status: 'published',
                isPrivate: false,
                ageRestriction: {
                    minAge: 18,
                    isAdultOnly: true
                },
                tags: [city.name.toLowerCase().replace(' ', ''), category, 'rd', 'test']
            });
        }

        const createdEvents = await Event.insertMany(eventsToCreate);
        console.log(`✅ ${createdEvents.length} eventos creados exitosamente en toda RD.`);

        console.log('\n--- DATOS DE ACCESO PARA QA ---');
        console.log('Email: rd_tester@eventnow.com');
        console.log('Password: Password123!');
        console.log('-------------------------------');

    } catch (err) {
        console.error('❌ Error during seeding:', err);
    } finally {
        process.exit();
    }
};

seedDatabase();
