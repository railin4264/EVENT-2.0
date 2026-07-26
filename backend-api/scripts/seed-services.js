const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Service = require('../src/models/Service');
const connectDB = require('../src/config/database');

const services = [
    {
        name: 'Transporte',
        identifier: 'transport',
        description: 'Viajes seguros a tu evento',
        icon: 'car',
        colors: ['#3B82F6', '#2563EB'],
        image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop',
        order: 1
    },
    {
        name: 'Hospedaje',
        identifier: 'accommodation',
        description: 'Encuentra donde quedarte',
        icon: 'bed',
        colors: ['#F59E0B', '#D97706'],
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
        order: 2
    },
    {
        name: 'Comida',
        identifier: 'dining',
        description: 'Restaurantes y delivery',
        icon: 'fast-food',
        colors: ['#10B981', '#059669'],
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop',
        order: 3
    },
    {
        name: 'Salud',
        identifier: 'health',
        description: 'Asistencia médica 24/7',
        icon: 'medkit',
        colors: ['#EF4444', '#DC2626'],
        image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1000&auto=format&fit=crop',
        order: 4
    },
];

const seedServices = async () => {
    try {
        await connectDB();

        await Service.deleteMany();
        console.log('Services cleared');

        await Service.insertMany(services);
        console.log('Services seeded');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

seedServices();
