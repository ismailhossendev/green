/**
 * Database Seed Script
 * Run: npm run seed
 * This populates the database with demo data for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Invoice = require('./models/Invoice');
const Purchase = require('./models/Purchase');
const Expense = require('./models/Expense');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greentel';

const seedDatabase = async () => {
    try {
        console.log('🌱 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Product.deleteMany({}),
            Customer.deleteMany({}),
            Supplier.deleteMany({}),
            Invoice.deleteMany({}),
            Purchase.deleteMany({}),
            Expense.deleteMany({})
        ]);

        // ============ USERS ============
        console.log('👤 Creating users...');
        const hashedPassword = await bcrypt.hash('123456', 10);

        const users = await User.insertMany([
            {
                name: 'Admin User',
                email: 'admin@greentel.com',
                password: hashedPassword,
                phone: '01711111111',
                role: 'Admin',
                designation: 'System Administrator',
                department: 'Management',
                status: 'Active',
                salary: 50000,
                joiningDate: new Date('2020-01-01')
            },
            {
                name: 'Manager One',
                email: 'manager@greentel.com',
                password: hashedPassword,
                phone: '01722222222',
                role: 'Manager',
                designation: 'Sales Manager',
                department: 'Sales',
                area: 'Dhaka',
                status: 'Active',
                salary: 35000,
                joiningDate: new Date('2021-03-15')
            },
            {
                name: 'Staff One',
                email: 'staff@greentel.com',
                password: hashedPassword,
                phone: '01733333333',
                role: 'Staff',
                designation: 'Sales Executive',
                department: 'Sales',
                area: 'Chittagong',
                status: 'Active',
                salary: 20000,
                joiningDate: new Date('2022-06-01')
            },
            {
                name: 'Sales Rep',
                email: 'sales@greentel.com',
                password: hashedPassword,
                phone: '01744444444',
                role: 'Sales',
                designation: 'Field Sales',
                department: 'Sales',
                area: 'Rajshahi',
                status: 'Active',
                salary: 18000,
                taDA: 5000,
                joiningDate: new Date('2023-01-10')
            }
        ]);
        console.log(`   ✅ Created ${users.length} users`);

        // ============ PRODUCTS ============
        console.log('📦 Creating products...');
        const products = await Product.insertMany([
            // Green Tel Products
            {
                modelName: 'GT-100 Basic',
                brand: 'Green Tel',
                type: 'Product',
                purchasePrice: 800,
                salesPrice: 1000,
                stock: { goodQty: 100, badQty: 5, damageQty: 2, repairQty: 3 }
            },
            {
                modelName: 'GT-200 Standard',
                brand: 'Green Tel',
                type: 'Product',
                purchasePrice: 1500,
                salesPrice: 1900,
                stock: { goodQty: 75, badQty: 3, damageQty: 1, repairQty: 2 }
            },
            {
                modelName: 'GT-300 Premium',
                brand: 'Green Tel',
                type: 'Product',
                purchasePrice: 2500,
                salesPrice: 3200,
                stock: { goodQty: 50, badQty: 2, damageQty: 0, repairQty: 1 }
            },
            {
                modelName: 'GT Packet Basic',
                brand: 'Green Tel',
                type: 'Packet',
                purchasePrice: 200,
                salesPrice: 300,
                stock: { goodQty: 200, badQty: 10, damageQty: 5, repairQty: 0 }
            },
            {
                modelName: 'GT Packet Pro',
                brand: 'Green Tel',
                type: 'Packet',
                purchasePrice: 350,
                salesPrice: 500,
                stock: { goodQty: 150, badQty: 5, damageQty: 3, repairQty: 0 }
            },
            // Green Star Products
            {
                modelName: 'GS-A1 Entry',
                brand: 'Green Star',
                type: 'Product',
                purchasePrice: 700,
                salesPrice: 950,
                stock: { goodQty: 120, badQty: 8, damageQty: 3, repairQty: 2 }
            },
            {
                modelName: 'GS-B2 Mid',
                brand: 'Green Star',
                type: 'Product',
                purchasePrice: 1200,
                salesPrice: 1600,
                stock: { goodQty: 80, badQty: 4, damageQty: 2, repairQty: 1 }
            },
            {
                modelName: 'GS-C3 High',
                brand: 'Green Star',
                type: 'Product',
                purchasePrice: 2000,
                salesPrice: 2700,
                stock: { goodQty: 40, badQty: 2, damageQty: 1, repairQty: 0 }
            },
            {
                modelName: 'GS Packet Lite',
                brand: 'Green Star',
                type: 'Packet',
                purchasePrice: 180,
                salesPrice: 280,
                stock: { goodQty: 180, badQty: 8, damageQty: 4, repairQty: 0 }
            },
            // Others
            {
                modelName: 'Charger Universal',
                brand: 'Green Tel',
                type: 'Others',
                purchasePrice: 100,
                salesPrice: 150,
                stock: { goodQty: 300, badQty: 20, damageQty: 10, repairQty: 5 }
            }
        ]);
        console.log(`   ✅ Created ${products.length} products`);

        // ============ SUPPLIERS ============
        console.log('🚚 Creating suppliers...');
        const suppliers = await Supplier.insertMany([
            {
                name: 'TechParts Ltd',
                phone: '01811111111',
                email: 'tech@parts.com',
                address: 'Uttara, Dhaka',
                type: 'Product',
                totalPurchaseAmount: 500000,
                totalPayment: 450000,
                totalDues: 50000
            },
            {
                name: 'PacketWorld',
                phone: '01822222222',
                email: 'hello@packetworld.com',
                address: 'Gulshan, Dhaka',
                type: 'Packet',
                totalPurchaseAmount: 200000,
                totalPayment: 180000,
                totalDues: 20000
            },
            {
                name: 'Accessories Hub',
                phone: '01833333333',
                email: 'info@accessories.com',
                address: 'Motijheel, Dhaka',
                type: 'Others',
                totalPurchaseAmount: 100000,
                totalPayment: 100000,
                totalDues: 0
            }
        ]);
        console.log(`   ✅ Created ${suppliers.length} suppliers`);

        // ============ CUSTOMERS ============
        console.log('👥 Creating customers...');
        const customers = await Customer.insertMany([
            // Dealers
            {
                name: 'Dhaka Mobile Zone',
                phone: '01911111111',
                address: 'Farmgate, Dhaka',
                district: 'Dhaka',
                type: 'Dealer',
                brand: 'Green Tel',
                totalSales: 150000,
                totalPayment: 120000,
                totalDues: 30000
            },
            {
                name: 'Chittagong Electronics',
                phone: '01922222222',
                address: 'GEC Circle, Chittagong',
                district: 'Chittagong',
                type: 'Dealer',
                brand: 'Green Tel',
                totalSales: 200000,
                totalPayment: 180000,
                totalDues: 20000
            },
            {
                name: 'Rajshahi Telecom',
                phone: '01933333333',
                address: 'Saheb Bazar, Rajshahi',
                district: 'Rajshahi',
                type: 'Dealer',
                brand: 'Green Star',
                totalSales: 100000,
                totalPayment: 100000,
                totalDues: 0
            },
            {
                name: 'Sylhet Mobile House',
                phone: '01944444444',
                address: 'Zindabazar, Sylhet',
                district: 'Sylhet',
                type: 'Dealer',
                brand: 'Green Star',
                totalSales: 80000,
                totalPayment: 60000,
                totalDues: 20000
            },
            {
                name: 'Khulna Digital Store',
                phone: '01955555555',
                address: 'Shibbari, Khulna',
                district: 'Khulna',
                type: 'Dealer',
                brand: 'Both',
                totalSales: 250000,
                totalPayment: 200000,
                totalDues: 50000
            },
            // Retail Customers
            {
                name: 'Rahim Ahmed',
                phone: '01711112222',
                address: 'Mirpur 10',
                district: 'Dhaka',
                type: 'Retail',
                brand: 'Green Tel',
                totalSales: 5000,
                totalPayment: 5000,
                totalDues: 0
            },
            {
                name: 'Karim Hasan',
                phone: '01711113333',
                address: 'Dhanmondi',
                district: 'Dhaka',
                type: 'Retail',
                brand: 'Green Star',
                totalSales: 8000,
                totalPayment: 8000,
                totalDues: 0
            }
        ]);
        console.log(`   ✅ Created ${customers.length} customers`);

        // ============ INVOICES ============
        console.log('🧾 Creating invoices...');
        const invoices = await Invoice.insertMany([
            {
                invoiceNo: 'GT-INV-001',
                customer: customers[0]._id,
                brand: 'Green Tel',
                items: [
                    { productId: products[0]._id, productName: 'GT-100 Basic', type: 'Product', qty: 10, price: 1000, total: 10000 },
                    { productId: products[3]._id, productName: 'GT Packet Basic', type: 'Packet', qty: 20, price: 300, total: 6000 }
                ],
                totalQty: 30,
                subTotal: 16000,
                discount: 500,
                rebate: 0,
                grandTotal: 15500,
                paidAmount: 10000,
                dues: 5500,
                previousDues: 24500,
                createdBy: users[2]._id,
                date: new Date('2026-01-15')
            },
            {
                invoiceNo: 'GT-INV-002',
                customer: customers[1]._id,
                brand: 'Green Tel',
                items: [
                    { productId: products[1]._id, productName: 'GT-200 Standard', type: 'Product', qty: 5, price: 1900, total: 9500 },
                    { productId: products[2]._id, productName: 'GT-300 Premium', type: 'Product', qty: 3, price: 3200, total: 9600 }
                ],
                totalQty: 8,
                subTotal: 19100,
                discount: 1000,
                rebate: 500,
                grandTotal: 17600,
                paidAmount: 17600,
                dues: 0,
                previousDues: 2400,
                createdBy: users[2]._id,
                date: new Date('2026-01-20')
            },
            {
                invoiceNo: 'GS-INV-001',
                customer: customers[3]._id,
                brand: 'Green Star',
                items: [
                    { productId: products[5]._id, productName: 'GS-A1 Entry', type: 'Product', qty: 15, price: 950, total: 14250 },
                    { productId: products[8]._id, productName: 'GS Packet Lite', type: 'Packet', qty: 30, price: 280, total: 8400 }
                ],
                totalQty: 45,
                subTotal: 22650,
                discount: 650,
                rebate: 0,
                grandTotal: 22000,
                paidAmount: 15000,
                dues: 7000,
                previousDues: 13000,
                createdBy: users[3]._id,
                date: new Date('2026-01-25')
            },
            {
                invoiceNo: 'GS-INV-002',
                customer: customers[2]._id,
                brand: 'Green Star',
                items: [
                    { productId: products[6]._id, productName: 'GS-B2 Mid', type: 'Product', qty: 8, price: 1600, total: 12800 },
                    { productId: products[7]._id, productName: 'GS-C3 High', type: 'Product', qty: 4, price: 2700, total: 10800 }
                ],
                totalQty: 12,
                subTotal: 23600,
                discount: 600,
                rebate: 1000,
                grandTotal: 22000,
                paidAmount: 22000,
                dues: 0,
                previousDues: 0,
                createdBy: users[3]._id,
                date: new Date('2026-01-28')
            },
            {
                invoiceNo: 'GT-INV-003',
                customer: customers[4]._id,
                brand: 'Green Tel',
                items: [
                    { productId: products[0]._id, productName: 'GT-100 Basic', type: 'Product', qty: 20, price: 1000, total: 20000 },
                    { productId: products[1]._id, productName: 'GT-200 Standard', type: 'Product', qty: 10, price: 1900, total: 19000 },
                    { productId: products[4]._id, productName: 'GT Packet Pro', type: 'Packet', qty: 50, price: 500, total: 25000, isCombined: true }
                ],
                totalQty: 80,
                subTotal: 64000,
                discount: 4000,
                rebate: 2000,
                grandTotal: 58000,
                paidAmount: 40000,
                dues: 18000,
                previousDues: 32000,
                createdBy: users[2]._id,
                date: new Date('2026-02-01')
            }
        ]);
        console.log(`   ✅ Created ${invoices.length} invoices`);

        // ============ PURCHASES ============
        console.log('📥 Creating purchases...');
        const purchases = await Purchase.insertMany([
            {
                purchaseNo: 'PUR-001',
                supplier: suppliers[0]._id,
                brand: 'Green Tel',
                items: [
                    { productId: products[0]._id, productName: 'GT-100 Basic', qty: 50, price: 800, total: 40000 },
                    { productId: products[1]._id, productName: 'GT-200 Standard', qty: 30, price: 1500, total: 45000 }
                ],
                totalQty: 80,
                totalAmount: 85000,
                paidAmount: 70000,
                dues: 15000,
                status: 'Received',
                createdBy: users[0]._id,
                date: new Date('2026-01-10')
            },
            {
                purchaseNo: 'PUR-002',
                supplier: suppliers[1]._id,
                brand: 'Green Tel',
                items: [
                    { productId: products[3]._id, productName: 'GT Packet Basic', qty: 100, price: 200, total: 20000 },
                    { productId: products[4]._id, productName: 'GT Packet Pro', qty: 75, price: 350, total: 26250 }
                ],
                totalQty: 175,
                totalAmount: 46250,
                paidAmount: 46250,
                dues: 0,
                status: 'Received',
                createdBy: users[0]._id,
                date: new Date('2026-01-12')
            },
            {
                purchaseNo: 'PUR-003',
                supplier: suppliers[0]._id,
                brand: 'Green Star',
                items: [
                    { productId: products[5]._id, productName: 'GS-A1 Entry', qty: 60, price: 700, total: 42000 },
                    { productId: products[6]._id, productName: 'GS-B2 Mid', qty: 40, price: 1200, total: 48000 }
                ],
                totalQty: 100,
                totalAmount: 90000,
                paidAmount: 60000,
                dues: 30000,
                status: 'Received',
                createdBy: users[0]._id,
                date: new Date('2026-01-18')
            }
        ]);
        console.log(`   ✅ Created ${purchases.length} purchases`);

        // ============ EXPENSES ============
        console.log('💸 Creating expenses...');
        const expenses = await Expense.insertMany([
            { category: 'Office', amount: 15000, description: 'Office rent for January', date: new Date('2026-01-05'), addedBy: users[0]._id },
            { category: 'Staff', amount: 5000, description: 'Staff refreshments', date: new Date('2026-01-10'), addedBy: users[1]._id },
            { category: 'Courier', amount: 3500, description: 'Product shipping to Chittagong', date: new Date('2026-01-12'), addedBy: users[2]._id },
            { category: 'Stationary', amount: 2000, description: 'Printer paper and ink', date: new Date('2026-01-15'), addedBy: users[1]._id },
            { category: 'Repair', amount: 8000, description: 'Phone repair batch', date: new Date('2026-01-20'), addedBy: users[0]._id },
            { category: 'Green Tel', amount: 12000, description: 'GT marketing materials', date: new Date('2026-01-22'), addedBy: users[1]._id },
            { category: 'Green Star', amount: 10000, description: 'GS promotional event', date: new Date('2026-01-25'), addedBy: users[1]._id },
            { category: 'Office', amount: 4500, description: 'Electricity bill', date: new Date('2026-01-28'), addedBy: users[0]._id }
        ]);
        console.log(`   ✅ Created ${expenses.length} expenses`);

        // ============ SUMMARY ============
        console.log('\n' + '='.repeat(50));
        console.log('🎉 Database seeded successfully!');
        console.log('='.repeat(50));
        console.log('\n📊 Summary:');
        console.log(`   👤 Users: ${users.length}`);
        console.log(`   📦 Products: ${products.length}`);
        console.log(`   🚚 Suppliers: ${suppliers.length}`);
        console.log(`   👥 Customers: ${customers.length}`);
        console.log(`   🧾 Invoices: ${invoices.length}`);
        console.log(`   📥 Purchases: ${purchases.length}`);
        console.log(`   💸 Expenses: ${expenses.length}`);
        console.log('\n🔐 Login Credentials:');
        console.log('   Email: admin@greentel.com');
        console.log('   Password: 123456');
        console.log('\n   (All users have the same password: 123456)');
        console.log('='.repeat(50) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
