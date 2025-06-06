const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../public/fonts/Poppins-Regular.ttf'),
    bold: path.join(__dirname, '../public/fonts/Poppins-Bold.ttf'),
    italics: path.join(__dirname, '../public/fonts/Poppins-Italic.ttf'),
    bolditalics: path.join(__dirname, '../public/fonts/Poppins-BoldItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (amount) => {
  return '₹' + amount.toLocaleString('en-IN');
};

const generatePDF = async ({ orders, salesData, startDate, endDate }) => {
  return new Promise((resolve, reject) => {
    try {
      const colors = {
        primary: '#3366CC',
        secondary: '#E6E6FA',
        text: '#333333',
        accent: '#6666CC',
        success: '#28a745',
        warning: '#ffc107',
        dark: '#212529'
      };
      
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        header: {
          text: 'SALES REPORT',
          style: 'reportTitle',
          margin: [40, 20, 40, 0]
        },
        footer: function(currentPage, pageCount) {
          return {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'center',
            margin: [0, 10, 0, 0]
          };
        },
        content: [
          {
            text: `Period: ${startDate ? formatDate(startDate) + ' to ' + formatDate(endDate) : 'All Time'}`,
            style: 'periodText',
            margin: [0, 0, 0, 20]
          },
          {
            style: 'table',
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Total Orders', style: 'tableHeader' },
                  { text: 'Original Revenue', style: 'tableHeader' },
                  { text: 'Total Discounts', style: 'tableHeader' },
                  { text: 'Net Revenue', style: 'tableHeader' }
                ],
                [
                  salesData.orderCount.toString(),
                  formatCurrency(salesData.originalRevenue),
                  formatCurrency(salesData.totalDiscount),
                  formatCurrency(salesData.netRevenue)
                ]
              ]
            }
          },
          {
            text: 'Discount Breakdown',
            style: 'sectionHeader',
            margin: [0, 20, 0, 10]
          },
          {
            style: 'table',
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: 'Product Discounts', style: 'tableHeader' },
                  { text: 'Coupon Discounts', style: 'tableHeader' }
                ],
                [
                  formatCurrency(salesData.productDiscounts),
                  formatCurrency(salesData.couponDiscounts)
                ]
              ]
            }
          },
          {
            text: 'Order Details',
            style: 'sectionHeader',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
          },
          {
            style: 'table',
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: '#', style: 'tableHeader' },
                  { text: 'Order ID', style: 'tableHeader' },
                  { text: 'Date', style: 'tableHeader' },
                  { text: 'Amount', style: 'tableHeader' },
                  { text: 'Discount', style: 'tableHeader' },
                  { text: 'Payment', style: 'tableHeader' }
                ],
                ...orders.map((order, index) => {
                  const orderDiscount = (order.priceDetails.productDiscount || 0) + 
                                       (order.priceDetails.couponDiscount || 0);
                  return [
                    (index + 1).toString(),
                    order.orderId,
                    formatDate(order.deliveryDate),
                    formatCurrency(order.priceDetails.total),
                    formatCurrency(orderDiscount),
                    order.paymentMethod
                  ];
                })
              ]
            }
          }
        ],
        styles: {
          reportTitle: {
            fontSize: 18,
            bold: true,
            color: colors.primary,
            alignment: 'center'
          },
          periodText: {
            fontSize: 12,
            color: colors.text,
            alignment: 'center'
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: colors.primary
          },
          tableHeader: {
            bold: true,
            fontSize: 11,
            color: 'white',
            fillColor: colors.primary,
            alignment: 'center'
          },
          table: {
            margin: [0, 5, 0, 15]
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generatePDF;