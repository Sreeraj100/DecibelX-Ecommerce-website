const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

// Define fonts - I'm keeping the Afacad Flux but with more variants for styling
const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../public/fonts/Poppins-Regular.ttf'),
    bold: path.join(__dirname, '../public/fonts/Poppins-Bold.ttf'),
    italics: path.join(__dirname, '../public/fonts/Poppins-Italic.ttf'),
    bolditalics: path.join(__dirname, '../public/fonts/Poppins-BoldItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const generateInvoice = async (orderData) => {
  return new Promise((resolve, reject) => {
    const logoPath = path.join(__dirname, '../public/img', 'logo.png');
    
    // Color palette for the invoice
    const colors = {
      primary: '#3366CC',      // Blue for headers and important elements
      secondary: '#E6E6FA',    // Light lavender for backgrounds
      text: '#333333',         // Dark grey for text
      accent: '#6666CC'        // Accent color for highlights
    };
    
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      
      content: [
        // Header section with logo and invoice title
        {
          columns: [
            {
              width: '*',
              stack: [
                {
                  image: logoPath,
                  width: 190,
                  alignment: 'left',
                },
              ]
            },
            {
              width: '*',
              stack: [
                { text: 'INVOICE', style: 'invoiceTitle' },
                { text: `#${orderData._id.toString().slice(-6).toUpperCase()}`, style: 'invoiceNumber' }
              ],
              alignment: 'right'
            }
          ],
          margin: [0, 0, 0, 20]
        },
        
        // Separator line
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 5,
              x2: 515, y2: 5,
              lineWidth: 1,
              lineColor: colors.primary
            }
          ],
          margin: [0, 10, 0, 10]
        },
        
        // Company and client information
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'FROM', style: 'sectionHeader' },
                { 
                  table: {
                    widths: ['*'],
                    body: [
                      [{ 
                        stack: [
                          { text: 'DecibelX', style: 'companyName' },
                          { text: 'Thekkekara,pathiripala ', style: 'address' },
                          { text: 'Near Mount seena school', style: 'address' },
                          { text: 'Palakkad ,Kerala', style: 'address' },
                          { text: 'Phone: +91 9567952537', style: 'address' },
                          { text: 'Email: decibelx@gmail.com  , sreerajsrgmanu@gmail.com', style: 'address' }
                        ],
                        fillColor: colors.secondary,
                        padding: 10
                      }]
                    ]
                  },
                  layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingTop: () => 5,
                    paddingBottom: () => 5
                  }
                }
              ]
            },
            {
              width: '*',
              stack: [
                { text: 'BILL TO', style: 'sectionHeader' },
                {
                  table: {
                    widths: ['*'],
                    body: [
                      [{
                        stack: [
                          { text: orderData.fullName, style: 'customerName' },
                          { text: `${orderData.address.doorNo}, ${orderData.address.street}`, style: 'address' },
                          { text: `${orderData.address.city}, ${orderData.address.district}`, style: 'address' },
                          { text: `PIN: ${orderData.address.pinCode}`, style: 'address' },
                          { text: `Phone: +91 ${orderData.phone}`, style: 'address' },
                          { text: `Email: ${orderData.email}`, style: 'address' }
                        ],
                        fillColor: colors.secondary,
                        padding: 10
                      }]
                    ]
                  },
                  layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingTop: () => 5,
                    paddingBottom: () => 5
                  }
                }
              ]
            }
          ],
          columnGap: 20,
          margin: [0, 0, 0, 20]
        },
        
        // Invoice details
        {
          stack: [
            { text: 'INVOICE DETAILS', style: 'sectionHeader' },
            {
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [
                    {
                      stack: [
                        { text: 'Invoice Number', style: 'detailLabel' },
                        { text: `#${orderData._id.toString().slice(-6).toUpperCase()}`, style: 'detailValue' }
                      ],
                      fillColor: colors.secondary,
                      padding: 8
                    },
                    {
                      stack: [
                        { text: 'Invoice Date', style: 'detailLabel' },
                        { text: formatDate(orderData.createdAt), style: 'detailValue' }
                      ],
                      fillColor: colors.secondary,
                      padding: 8
                    },
                    {
                      stack: [
                        { text: 'Due Date', style: 'detailLabel' },
                        { text: formatDate(orderData.deliveryDate), style: 'detailValue' }
                      ],
                      fillColor: colors.secondary,
                      padding: 8
                    },
                    {
                      stack: [
                        { text: 'Payment Method', style: 'detailLabel' },
                        { text: orderData.paymentMethod, style: 'detailValue' }
                      ],
                      fillColor: colors.secondary,
                      padding: 8
                    }
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingTop: () => 5,
                paddingBottom: () => 5
              }
            }
          ],
          margin: [0, 0, 0, 20]
        },
        
        // Product table
        {
          stack: [
            { text: 'ORDER SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Product Name', style: 'tableHeader', fillColor: colors.primary, color: 'white' },
                    { text: 'Quantity', style: 'tableHeader', fillColor: colors.primary, color: 'white' },
                    { text: 'Unit Price', style: 'tableHeader', fillColor: colors.primary, color: 'white' },
                    { text: 'Total', style: 'tableHeader', fillColor: colors.primary, color: 'white' }
                  ],
                  ...orderData.products.map((product, i) => [
                    { text: product.productName, style: 'tableCell' },
                    { text: product.quantity, style: 'tableCell', alignment: 'center' },
                    { text: `₹${product.productPrice}`, style: 'tableCell', alignment: 'right' },
                    { text: `₹${product.productPrice * product.quantity}`, style: 'tableCell', alignment: 'right' }
                  ])
                ]
              },
              layout: {
                hLineWidth: function(i, node) {
                  return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
                },
                vLineWidth: function(i, node) {
                  return 0.5;
                },
                hLineColor: function(i, node) {
                  return (i === 0 || i === 1) ? colors.primary : '#CCCCCC';
                },
                vLineColor: function(i, node) {
                  return '#CCCCCC';
                },
                paddingLeft: function(i) { return 8; },
                paddingRight: function(i) { return 8; },
                paddingTop: function(i) { return 8; },
                paddingBottom: function(i) { return 8; }
              }
            }
          ],
          margin: [0, 0, 0, 20]
        },
        
        // Price summary
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                {
                  table: {
                    widths: [100, 80],
                    body: [
                      [
                        { text: 'Sub Total', style: 'summaryLabel', alignment: 'left' },
                        { text: `₹${orderData.priceDetails.subtotal}`, style: 'summaryValue', alignment: 'right' }
                      ],
                      [
                        { text: 'Delivery', style: 'summaryLabel', alignment: 'left' },
                        { text: 'Free', style: 'summaryValue', alignment: 'right' }
                      ],
                      [
                        { text: 'GST (18%)', style: 'summaryLabel', alignment: 'left' },
                        { text: `₹${orderData.priceDetails.tax.toFixed(2)}`, style: 'summaryValue', alignment: 'right' }
                      ],
                      [
                        { text: 'Coupon', style: 'summaryLabel', alignment: 'left' },
                        { text: `₹${orderData.priceDetails?.couponuser ? orderData.priceDetails.couponuser : 0}`, style: 'summaryValue', alignment: 'right' }
                      ],
                      [
                        { text: 'Total', style: 'totalLabel', alignment: 'left', fillColor: colors.primary, color: 'white' },
                        { text: `₹${orderData.priceDetails.total.toFixed(2)}`, style: 'totalValue', alignment: 'right', fillColor: colors.primary, color: 'white' }
                      ]
                    ]
                  },
                  layout: {
                    hLineWidth: function(i, node) {
                      return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
                    },
                    vLineWidth: function(i, node) {
                      return 0;
                    },
                    hLineColor: function(i, node) {
                      return colors.primary;
                    },
                    paddingLeft: function(i) { return 8; },
                    paddingRight: function(i) { return 8; },
                    paddingTop: function(i) { return 8; },
                    paddingBottom: function(i) { return 8; }
                  }
                }
              ]
            }
          ],
          margin: [0, 0, 0, 30]
        },
        
        // Footer
        {
          stack: [
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0, y1: 5,
                  x2: 515, y2: 5,
                  lineWidth: 1,
                  lineColor: colors.primary
                }
              ],
              margin: [0, 0, 0, 10]
            },
            {
              text: 'Thank you for your business!',
              style: 'footer',
              alignment: 'center'
            }
          ]
        }
      ],
      
      // Define all styles
      styles: {
        invoiceTitle: {
          fontSize: 20,
          bold: true,
          color: colors.primary,
          margin: [0, 5, 0, 0]
        },
        invoiceNumber: {
          fontSize: 14,
          color: colors.accent,
          margin: [0, 5, 0, 0]
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: colors.primary,
          margin: [0, 0, 0, 8]
        },
        companyName: {
          fontSize: 13,
          bold: true,
          color: colors.primary,
          margin: [0, 0, 0, 4]
        },
        customerName: {
          fontSize: 13,
          bold: true,
          color: colors.primary,
          margin: [0, 0, 0, 4]
        },
        address: {
          fontSize: 11,
          color: colors.text,
          lineHeight: 1.4
        },
        detailLabel: {
          fontSize: 10,
          color: colors.primary,
          bold: true
        },
        detailValue: {
          fontSize: 12,
          color: colors.text,
          margin: [0, 3, 0, 0]
        },
        tableHeader: {
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 5, 0, 5]
        },
        tableCell: {
          fontSize: 11,
          color: colors.text,
          margin: [0, 5, 0, 5]
        },
        summaryLabel: {
          fontSize: 12,
          color: colors.text,
          margin: [0, 2, 0, 2]
        },
        summaryValue: {
          fontSize: 12,
          color: colors.text,
          margin: [0, 2, 0, 2]
        },
        totalLabel: {
          fontSize: 14,
          bold: true,
          margin: [0, 2, 0, 2]
        },
        totalValue: {
          fontSize: 14,
          bold: true,
          margin: [0, 2, 0, 2]
        },
        footer: {
          fontSize: 14,
          color: colors.primary,
          bold: true
        }
      },
      
      // Add page numbers at the bottom
      footer: function(currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 9,
          color: colors.text,
          margin: [0, 10, 0, 0]
        };
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const pdfPath = path.join(
      __dirname,
      '../public',
      `invoice_${orderData._id}.pdf`
    );
    const writeStream = fs.createWriteStream(pdfPath);

    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    writeStream.on('finish', () => resolve(pdfPath));
    writeStream.on('error', reject);
  });
};

module.exports = { generateInvoice };