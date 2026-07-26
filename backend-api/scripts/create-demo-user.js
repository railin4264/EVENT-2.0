const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');
const connectDB = require('../src/config/database');

const createDemoUser = async () => {
    try {
        await connectDB();

        // Define demo user
        const demoUserData = {
            username: 'demo_user',
            email: 'demo@eventconnect.com',
            password: 'Password123!',
            firstName: 'Demo',
            lastName: 'User',
            acceptTerms: true,
            birthDate: '1990-01-01',
            role: 'user',
            verified: true
        };

        // Check if exists
        let user = await User.findOne({ email: demoUserData.email });

        if (user) {
            console.log('⚠️  Demo user already exists. Resetting password...');
            user.password = demoUserData.password;
            await user.save();
            console.log('✅ Password reset to: Password123!');
        } else {
            console.log('creating new demo user...');
            user = await User.create(demoUserData);
            console.log('✅ Demo user created.');
        }

        // Ensure wallet exists and has funds
        let wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
            wallet = await Wallet.create({
                user: user._id,
                balance: 5000,
                currency: 'MXN'
            });
            console.log('✅ Wallet created with $5,000 MXN');
        } else {
            wallet.balance = 5000;
            await wallet.save();
            console.log('✅ Wallet topped up to $5,000 MXN');
        }

        console.log('\n🎉 DEMO CREDENTIALS:');
        console.log('📧 Email:    demo@eventconnect.com');
        console.log('👤 Username: demo_user');
        console.log('🔑 Password: Password123!');

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createDemoUser();
