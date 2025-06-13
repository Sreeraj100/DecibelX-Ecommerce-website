const ExcelJS = require('exceljs');

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const generateExcel = async ({ orders, salesData, startDate, endDate }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  workbook.creator = 'Admin Panel';
  workbook.created = new Date();

  // Title Row
  worksheet.mergeCells('A1:H1');
  const titleRow = worksheet.getCell('A1');
  titleRow.value = 'Sales Report';
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF3366CC' } };
  titleRow.alignment = { horizontal: 'center' };

  // Period Row
  worksheet.mergeCells('A2:H2');
  const periodRow = worksheet.getCell('A2');
  periodRow.value = `Period: ${startDate ? formatDate(startDate) + ' to ' + formatDate(endDate) : 'All Time'}`;
  periodRow.font = { italic: true };
  periodRow.alignment = { horizontal: 'center' };

  // Summary Section
  worksheet.addRow([]);
  worksheet.addRow(['Financial Summary']).font = { bold: true, size: 14 };
  
  // Financial Summary Table
  const summaryTable = worksheet.addTable({
    name: 'SalesSummary',
    ref: 'A4',
    headerRow: true,
    totalsRow: false, // Disable totals row
    style: {
      theme: 'TableStyleMedium2',
      showFirstColumn: true
    },
    columns: [
      { name: 'Metric', filterButton: true },
      { name: 'Amount', filterButton: true }
    ],
    rows: [
      ['Total Orders', salesData.orderCount],
      ['Original Revenue', salesData.originalRevenue],
      ['Product Discounts', -salesData.productDiscounts],
      ['Coupon Discounts', -salesData.couponDiscounts],
      ['Total Discounts', -salesData.totalDiscount],
      ['Tax Collected', salesData.taxTotal],
      
    ]
  });

  // Format cells - only format currency cells (skip the first row for orders count)
  for (let i = 6; i <= 10; i++) {
    worksheet.getCell(`B${i}`).numFmt = '₹#,##0.00';
  }
  // Set the orders count as plain number
  worksheet.getCell('B5').numFmt = '0';

  // Order Details Section
  worksheet.addRow([]);
  worksheet.addRow(['Order Details']).font = { bold: true, size: 14 };
  
  const headerRow = worksheet.addRow([
    '#', 'Order ID', 'Customer', 'Date', 'Items', 'Amount', 'Payment', 'Discount'
  ]);
  
  // Style header
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3366CC' }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Add order data
  orders.forEach((order, index) => {
    const orderDiscount = (order.priceDetails.productDiscount || 0) + (order.priceDetails.couponDiscount || 0);
    const row = worksheet.addRow([
      index + 1,
      order.orderId,
      order.fullName,
      new Date(order.deliveryDate),
      order.products.length,
      order.priceDetails.total,
      order.paymentMethod,
      orderDiscount
    ]);
    
    row.getCell(4).numFmt = 'dd-mmm-yyyy';
    row.getCell(6).numFmt = '₹#,##0.00';
    row.getCell(8).numFmt = '₹#,##0.00';
  });

  // Set column widths
  worksheet.columns = [
    { width: 8 },   // #
    { width: 15 },  // Order ID
    { width: 25 },  // Customer
    { width: 15 },  // Date
    { width: 10 },  // Items
    { width: 15 },  // Amount
    { width: 15 },  // Payment
    { width: 15 }   // Discount
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer({
    useStyles: true,
    useSharedStrings: true
  });

  return buffer;
};

module.exports = generateExcel;