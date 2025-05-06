const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require("fs");
const path = require("path");

const folderName = "uploads";
const folderPath = path.join(__dirname, "../routes/files", folderName);
// Check if the folder already exists
!fs.existsSync(folderPath)
  ? // Create the folder
    fs.mkdirSync(folderPath)
  : console.log(`Folder "${folderPath}" already exists.`);

const endpoints = [
  "rolePermission",
  "permission",
  "user",
  "role",
  "settings",
  "branch",
  "menu",
  "table",
  "vouchers",
  "weeklyMenu",
  "reservations",
  "holiday",
  "dailyMenu",
  "tasteMenu",
  "emailConfig",
  "waitingList",
  "vourchers"
];

const permissionTypes = ["create", "readAll", "readSingle", "update", "delete"];

// create permissions for each endpoint by combining permission type and endpoint name
const permissions = endpoints.reduce((acc, cur) => {
  const permission = permissionTypes.map((type) => {
    return `${type}-${cur}`;
  });
  return [...acc, ...permission];
}, []);

const roles = ["admin", "staff", "customer", "branchOwner"];

//Menu
const menuList = [
  {
      name: "Black Beans",
      description: "Creamy black beans with Pineapples & pomegranate",
      menuSliderHeader: "Black Beans",
      menuImage: "https://staging2.arag.ma/wp-content/uploads/2024/01/website-plate-01.png",
      menuType: "Veg",
      "branchId": 1,
      "createdAt": new Date("2025-01-01"),
      "updatedAt": new Date("2025-01-01")
  },
  {
    name: "Coconut",
    description: "Hearty stew with spiced sourough bread",
    menuSliderHeader: "Coconut",
    menuImage: "https://staging2.arag.ma/wp-content/uploads/2024/01/website-plate-01.png",
    menuType: "Veg",
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    name: "Fingre Millet",
    description: "Texture of carrot, grapefruit, & fresh fennel",
    menuSliderHeader: "Fingre Millet",
    menuImage: "https://staging2.arag.ma/wp-content/uploads/2024/01/website-plate-01.png",
    menuType: "Veg",
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  }
];

const tables = [
  {
    "tableName": "Table 1",
    "tableSize": 4,
    "tableShape": "Square",
    "branchId": 1,
  },
  {
    "tableName": "Table 2",
    "tableSize": 4,
    "tableShape": "Square",
    "branchId": 1,
  },
  {
    "tableName": "Table 3",
    "tableSize": 6,
    "tableShape": "Rectangle",
    "branchId": 1,
  },
  {
    "tableName": "Table 4",
    "tableSize": 6,
    "tableShape": "Rectangle",
    "branchId": 1,
  },
  {
    "tableName": "Table 5",
    "tableSize": 4,
    "tableShape": "Square",
    "branchId": 1,
  }
]

const vouchersList = [
  {
    "voucherCode": "FLAT100",
    "description": "Flat 100 Rs off.",
    "amount": 100,
    "startDate": new Date("2025-01-01"),
    "endDate": new Date("2025-12-31"),
    "availability": "Active",
    "branchId": 1,
    "isGiftCard": false,
    "isGiftCardUsed": false,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "voucherCode": "FLAT200",
    "description": "Flat 200 Rs off.",
    "amount": 200,
    "startDate": new Date("2025-01-01"),
    "endDate": new Date("2025-12-31"),
    "availability": "Active",
    "branchId": 1,
    "isGiftCard": false,
    "isGiftCardUsed": false,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "voucherCode": "FLAT300",
    "description": "Flat 300 Rs off.",
    "amount": 300,
    "startDate": new Date("2025-01-01"),
    "endDate": new Date("2025-12-31"),
    "availability": "Active",
    "branchId": 1,
    "isGiftCard": false,
    "isGiftCardUsed": false,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "voucherCode": "FLAT400",
    "description": "Flat 400 Rs off.",
    "amount": 400,
    "startDate": new Date("2025-01-01"),
    "endDate": new Date("2025-12-31"),
    "availability": "Active",
    "branchId": 1,
    "isGiftCard": false,
    "isGiftCardUsed": false,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  }
]

const settings = [
  {
    "settingkey": "foodType",
    "settingName": "Food Type",
    "settingValue": "Veg",
    "status": true,
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "settingkey": "foodType",
    "settingName": "Food Type",
    "settingValue": "Non-Veg",
    "status": true,
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "settingkey": "foodType",
    "settingName": "Food Type",
    "settingValue": "Vegan",
    "status": true,
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  },
  {
    "settingkey": "maxGuest",
    "settingName": "Max Guest Size",
    "settingValue": "15",
    "status": true,
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "updatedAt": new Date("2025-01-01")
  }
]

const waitingListRecords = [
  {
    "name": "Ajay Kumar",
    "email": "ajaykumar@yopmail.com",
    "phoneNumber": "9898765432",
    "reservationDate": new Date("2025-05-22"),
    "numberOfGuest": 12,
    "reservationSlot": "Dinner",
    "branchId": 1,
    "createdAt": new Date("2025-01-01"),
    "isDeleted": false,

  }
]

const tasteMenu =[
  {
    "title": "Grilled Chicken Platter",
    "description": "Juicy grilled chicken served with roasted vegetables and garlic bread.",
    "image": "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094323790-download (1).jpg",
    "type": "lunch",
    "price": 12.99,
    "days": "Monday,Wednesday,Friday",
    "branchId":1,
  },
  {
    "title": "Pasta Primavera",
    "description": "Penne pasta tossed with fresh vegetables and a light tomato sauce.",
    "image": "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094323790-download (1).jpg",
    "type": "dinner",
    "price": 10.50,
    "days": "Tuesday,Thursday,Saturday",
    "branchId":1,
  },
  {
    "title": "Veggie Burger",
    "description": "A delicious plant-based burger with fresh lettuce, tomato, and vegan mayo.",
    "image": "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094323790-download (1).jpg",
    "type": "lunch",
    "price": 8.99,
    "days": "Tuesday,Saturday",
    "branchId":1,
  }
]

const reservation = [
  {
    "numberOfGuest": 2,
    "reservationDate": new Date("2025-01-01"),
    "reservationMode": "Online",
    "reservationType": "Dinner",
    "name": "John Doe",
    "phoneNumber": "1234567890",
    "email": "john.doe@example.com",
    "foodpreference": "Veg",
    "paymentType": "Online",
    "voucherId": null,
    "originalAmount": 5000,
    "voucherDiscount": null,
    "CGST": 250,
    "SGST": 250,
    "finalAmount": 5500,
    "transactionCode": "TXN12345",
    "transactionDetails": "Paid via UPI",
    "status": "Available",
    "createdAt": "2025-04-01T10:00:00.000Z",
    "updatedAt": "2025-04-01T10:00:00.000Z",
    "isDeleted": false,
    "userId": 1,
    "branchId": 1,
  },
]


const emailConfig = [
  {
    emailConfigName: "gmail",
    emailHost: "smtp.gmail.com",
    emailPort: 465,
    emailUser: "sample@gmail.com",
    emailPass: "Sample@123"
  }
];

const rolePermission = [
  {
    role_id: 3,
    permission_id: 146,
  },
  ,
  {
    role_id: 3,
    permission_id: 147,
  },
  {
    role_id: 3,
    permission_id: 148,
  },
  {
    role_id: 3,
    permission_id: 153,
  },
  {
    role_id: 3,
    permission_id: 154,
  },
  {
    role_id: 3,
    permission_id: 155,
  },
  {
    role_id: 3,
    permission_id: 156,
  },
  {
    role_id: 3,
    permission_id: 157,
  },
  ,
  {
    role_id: 3,
    permission_id: 158,
  },
  ,
  {
    role_id: 3,
    permission_id: 162,
  },
  ,
  {
    role_id: 3,
    permission_id: 167,
  },
  {
    role_id: 3,
    permission_id: 172,
  },
];

async function main() {
  
  await prisma.role.createMany({
    data: roles.map((role) => {
      return {
        name: role,
      };
    }),
  });
  await prisma.permission.createMany({
    data: permissions.map((permission) => {
      return {
        name: permission,
      };
    }),
  });
  for (let i = 1; i <= permissions.length; i++) {
    await prisma.rolePermission.create({
      data: {
        role: {
          connect: {
            id: 1,
          },
        },
        permission: {
          connect: {
            id: i,
          },
        },
      },
    });
  }

  await prisma.branch.create({
    data:{
      "paymentGatewayID": "12345",
      "cgstNumber": "27AATFV1462C",
      "sgstNumber": "27AATFV1462C",
      "weekDays": "Tuesday,Wednesday,Thursday,Friday",
      "weekendDays": "Saturday,Sunday",
      "weekOffDay": "Monday",
      "openingTime": "11:00 AM",
      "closingTime": "11:00 PM",
      "weekendOpeningTime": "11:00 AM",
      "weekendClosingTime": "11:00 PM",
      "maxGuestSize": 15,    
      "email": "admin.aragma@yopmail.com",
      "createdAt": new Date("2025-01-01"),
      "updatedAt": new Date("2025-01-01"),
      "deletedAt": null,
      "isDeleted": false,
      "createdBy": null,
      "updatedBy": null,
      "deletedBy": null,
    }
  })

  const adminHash = await bcrypt.hash("admin", saltRounds);
  await prisma.user.create({
    data: {
      name: "Aragma",
      password: adminHash,
      email: "admin@aragma.com",
      phoneNumber: "0000000000",
      address: "Koregaon Pune - 411001 ",
      city: "Pune",
      status: "Active",
      profileImage: "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094007756-download.jpg",
      branchId:1,
      roleId: 1,
    },
  });



  await prisma.menu.createMany({
    data: menuList,
  });
await prisma.emailConfig.createMany({
    data: emailConfig,
  });
  await prisma.vouchers.createMany({
    data: vouchersList,
  });

  await prisma.table.createMany({
    data: tables,
  });

  await prisma.settings.createMany({
    data: settings,
  });

  await prisma.waitingList.createMany({
    data: waitingListRecords
  })
  await prisma.tasteMenu.createMany({
    data: tasteMenu
  })
  // await prisma.reservations.createMany({
  //   data: reservation
  // })
}

main()
.then(async () => {
  await prisma.$disconnect();
})
.catch(async (e) => {
  console.log(e);
  await prisma.$disconnect();
  process.exit(1);
});
