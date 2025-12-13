/**
 * api_server.js
 * Update: เพิ่มการแสดงผล "วันที่" (S.DateTime)
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

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

const query = `
    SELECT TOP 2000
        -- 🟢 วันที่เอกสาร (DateTime)
        S.[DateTime] AS SellDate, 
        
        S.BranchNumber,
        ISNULL(S.DocNumber, '-') AS DocNumber,
        ISNULL(S.BillNumber, S.SellNumber) AS BillNumber,
        ISNULL(C.Name, 'ลูกค้าทั่วไป') AS CustomerName,
        
        ISNULL(P.ProductCode, P.PN) AS ProductCode,
        ISNULL(P.Barcode, '-') AS Barcode, 
        ISNULL(P.Name, 'ระบุชื่อไม่ได้') AS ProductName, 
        
        ISNULL(PG.Name, 'ไม่ระบุกลุ่ม') AS GroupName,
        ISNULL(B.Name, '-') AS BrandName,
        
        ISNULL(SD.Number, 0) AS Number,
        ISNULL(SD.Lunit, 'หน่วย') AS Lunit,
        ISNULL(SD.Price, 0) AS Price,
        (ISNULL(SD.Number, 0) * ISNULL(SD.Price, 0)) AS SumPrice

    FROM dbo.Sell S
    INNER JOIN dbo.SellD SD ON S.BranchNumber = SD.BranchNumber AND S.SellNumber = SD.SellNumber
    LEFT JOIN dbo.Customer C ON S.CustomerNumber = C.CustomerNumber
    LEFT JOIN dbo.Product P ON SD.PN = P.PN
    LEFT JOIN dbo.ProductGroup PG ON P.GroupID = PG.ID
    LEFT JOIN dbo.Brand B ON P.BrandID = B.ID
    
    WHERE ISNULL(S.Status, 0) <> 1 
    ORDER BY S.[DateTime] DESC
`;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sales_report.html'));
});

app.get('/api/sales', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(query);
        
        const formattedData = result.recordset.map((item, index) => ({
            id: index + 1,
            // แปลง DateTime เป็นรูปแบบ YYYY-MM-DD
            date: item.SellDate ? new Date(item.SellDate).toISOString().split('T')[0] : '-', 
            
            branch: item.BranchNumber,
            docNo: item.DocNumber,
            billNo: item.BillNumber,
            customer: item.CustomerName,
            productCode: item.ProductCode,
            barcode: item.Barcode,
            productName: item.ProductName,
            group: item.GroupName,
            brand: item.BrandName,
            qty: item.Number,
            unit: item.Lunit,
            price: item.Price,
            total: item.SumPrice
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
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
});