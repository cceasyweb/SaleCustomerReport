/**
 * api_server.js (Update: Fix Branch Column Name)
 * แก้ไข:
 * 1. เปลี่ยน BR.Name เป็น BR.BranchName (ตามตาราง dbo.Branch)
 * 2. ยังคงรองรับ Web Server และ Date Filter เหมือนเดิม
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sales_report.html'));
});

app.get('/api/sales', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const { startDate, endDate } = req.query;

        let dateCondition = "";
        let topClause = "TOP 2000";

        if (startDate && endDate) {
            dateCondition = `AND S.[DateTime] BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
            topClause = "";
        }

        const query = `
            SELECT ${topClause}
                S.[DateTime] AS SellDate, 
                
                -- 🟢 แก้ไข: ใช้ BranchName ตามที่แจ้ง
                ISNULL(BR.BranchName, CAST(S.BranchNumber AS VARCHAR)) AS BranchName,
                
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
            
            -- Join สาขา
            LEFT JOIN dbo.Branch BR ON S.BranchNumber = BR.BranchNumber
            
            LEFT JOIN dbo.ProductGroup PG ON P.GroupID = PG.ID
            LEFT JOIN dbo.Brand B ON P.BrandID = B.ID
            
            WHERE ISNULL(S.Status, 0) <> 1 
            AND ISNULL(PG.Status, 0) <> 1
            AND ISNULL(B.Status, 0) <> 1
            
            ${dateCondition}

            ORDER BY S.[DateTime] DESC
        `;

        let result = await pool.request().query(query);
        
        const formattedData = result.recordset.map((item, index) => ({
            id: index + 1,
            date: item.SellDate ? new Date(item.SellDate).toISOString().split('T')[0] : '-', 
            branch: item.BranchName,
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
});