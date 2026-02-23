/**
 * Centralized Branding Configuration
 * সহজে ব্র্যান্ডিং পরিবর্তনের জন্য এই ফাইল ব্যবহার করুন
 */

export const BrandingConfig = {
    // Brand Names
    mainBrand: "Green Tel",
    secondaryBrand: "Green Star",
    companyName: "Green Tel & Green Star",

    // Contact Information
    contact: {
        phone: "+8801XXXXXXXXX",
        email: "info@greentel.com",
        address: "Your Office Address, Bangladesh",
        website: "www.greentel.bd"
    },

    // Logo Paths
    logos: {
        greenTel: "/assets/logos/green-tel-logo.png",
        greenStar: "/assets/logos/green-star-logo.png",
        favicon: "/favicon.ico"
    },

    // Brand Colors
    colors: {
        greenTel: {
            primary: "#00796B",
            secondary: "#004D40",
            accent: "#26A69A",
            light: "#B2DFDB",
            gradient: "linear-gradient(135deg, #00796B 0%, #004D40 100%)"
        },
        greenStar: {
            primary: "#388E3C",
            secondary: "#1B5E20",
            accent: "#66BB6A",
            light: "#C8E6C9",
            gradient: "linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)"
        }
    },

    // Currency
    currency: "BDT",
    currencySymbol: "৳",

    // Invoice Settings
    invoice: {
        note: "Thank you for choosing our products!",
        terms: "All products are subject to our terms and conditions.",
        footer: "This is a computer-generated invoice."
    },

    // Districts (Bangladesh)
    districts: [
        "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogra", "Brahmanbaria",
        "Chandpur", "Chapainawabganj", "Chittagong", "Chuadanga", "Comilla", "Cox's Bazar",
        "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
        "Habiganj", "Jamalpur", "Jessore", "Jhalokati", "Jhenaidah", "Joypurhat",
        "Khagrachari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur",
        "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar",
        "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi",
        "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
        "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur",
        "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
        "Tangail", "Thakurgaon"
    ],

    // Product Types
    productTypes: ["Product", "Packet", "Others"],

    // Stock Conditions
    stockConditions: ["goodQty", "badQty", "damageQty", "repairQty"],

    // User Roles
    userRoles: ["Admin", "Manager", "Staff", "Sales", "Dealer", "Customer"],

    // Expense Categories
    expenseCategories: [
        "Green Tel", "Green Star", "Courier", "Repair",
        "Stationary", "Office", "Staff"
    ],

    // Loan Types
    loanTypes: ["Personal", "Office", "Bank", "Employee"],

    // Payment Methods
    paymentMethods: ["Cash", "Bank", "Mobile Banking", "Cheque", "Other"],

    // Date Format
    dateFormat: "DD/MM/YYYY",
    dateTimeFormat: "DD/MM/YYYY hh:mm A"
};

// Helper function to get brand theme
export const getBrandTheme = (brand) => {
    return brand === "Green Star"
        ? BrandingConfig.colors.greenStar
        : BrandingConfig.colors.greenTel;
};

// Helper function to get brand logo
export const getBrandLogo = (brand) => {
    return brand === "Green Star"
        ? BrandingConfig.logos.greenStar
        : BrandingConfig.logos.greenTel;
};

// Format currency
export const formatCurrency = (amount) => {
    return `${BrandingConfig.currencySymbol}${Number(amount || 0).toLocaleString('en-BD')}`;
};

export default BrandingConfig;
