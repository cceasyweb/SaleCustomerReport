/**
 * api_server.js (Final: Mapped with Excel Schema)
 * อ้างอิง: SQL ราคาขายสินค้าลูกค้าตามสินค้า - Sheet1.csv
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();

app.use(cors());

// --- Database Configuration ---
const dbConfig = {
    user: 'NewStock',
    password: 'NewTech', // <--- 🔴 แก้รหัสผ่านให้ถูกต้อง
    server: 'localhost',    
    database: 'NewStock',
    port: 2301,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

// --- SQL Query ---
const query = `
    SELECT TOP 2000
        -- [20] SellDate: วันที่เอกสาร (DateTime)
        S.SellDate, 
        
        -- [5] SellNumber: เลขที่เอกสาร (Key)
        S.SellNumber,
        
        -- Customer Name
        ISNULL(C.CustomerName, 'ลูกค้าทั่วไป') AS CustomerName,
        
        -- Product Info
        P.PN AS ProductCode,
        ISNULL(P.Barcode, P.PN) AS Barcode, 
        ISNULL(P.ProductName, SD.ItemName) AS ProductName, 
        
        -- Group & Brand
        ISNULL(PG.GroupName, 'ไม่ระบุกลุ่ม') AS GroupName,
        ISNULL(B.BrandName, '-') AS BrandName,
        
        -- Sale Details
        SD.Amount,
        ISNULL(U.UnitName, 'หน่วย') AS UnitName,
        SD.Price AS UnitPrice,
        
        -- Discount & Net
        ISNULL(SD.Discount, 0) AS TotalDiscount,
        (SD.Amount * SD.Price) - ISNULL(SD.Discount, 0) AS NetTotal

    FROM dbo.Sell S
    INNER JOIN dbo.SellD SD ON S.BranchNumber = SD.BranchNumber AND S.SellNumber = SD.SellNumber
    LEFT JOIN dbo.Customer C ON S.CustomerNumber = C.CustomerNumber
    LEFT JOIN dbo.Product P ON SD.PN = P.PN
    LEFT JOIN dbo.ProductGroup PG ON P.GroupID = PG.ID
    LEFT JOIN dbo.Brand B ON P.BrandID = B.ID
    LEFT JOIN dbo.Unit U ON P.UnitID = U.ID
    
    -- กรองสถานะยกเลิก (Status 1) ออก
    WHERE ISNULL(S.Status, 0) <> 1 

    ORDER BY S.SellDate DESC
`;

app.get('/', (req, res) => {
    res.send('<h1>Sales API Online 🟢</h1>');
});

app.get('/api/sales', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(query);
        
        const formattedData = result.recordset.map((item, index) => ({
            id: index + 1,
            // แปลง DateTime เป็นวันที่ YYYY-MM-DD (ตัดเวลาออกเพื่อแสดงผล)
            date: item.SellDate ? new Date(item.SellDate).toISOString().split('T')[0] : '-', 
            // ถ้าอยากแสดงเวลาด้วย ให้ใช้บรรทัดล่างนี้แทนครับ
            // date: item.SellDate ? new Date(item.SellDate).toLocaleString('th-TH') : '-',
            
            billNo: item.SellNumber,
            customer: item.CustomerName,
            productCode: item.ProductCode,
            barcode: item.Barcode,
            product: item.ProductName,
            group: item.GroupName,
            brand: item.BrandName,
            qty: item.Amount,
            unit: item.UnitName,
            price: item.UnitPrice,
            discount: item.TotalDiscount,
            netTotal: item.NetTotal
        }));

        res.json(formattedData);
    } catch (err) {
        console.error('SQL Error:', err);
        res.status(500).send('Database Error: ' + err.message);
    }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
