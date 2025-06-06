const Order = require('../../models/orderSchema');
const generatePDF = require('../../services/pdfService');
const generateExcel = require('../../services/xlsxService');
const AppError = require('../../middlewares/errorHandling');

const buildDateQuery = (filters) => {
  let query = { status: 'Delivered' };
  
  if (filters?.startDate && filters?.endDate) {
    query.deliveryDate = { 
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  } else if (filters?.timePeriod) {
    const today = new Date();
    const periodStart = new Date();
    
    switch(filters.timePeriod) {
      case 'week': periodStart.setDate(today.getDate() - 7); break;
      case 'month': periodStart.setMonth(today.getMonth() - 1); break;
      case 'year': periodStart.setFullYear(today.getFullYear() - 1); break;
    }
    
    query.deliveryDate = { $gte: periodStart, $lte: today };
  }
  
  return query;
};

const calculateSalesTotals = (orders) => {
  return orders.reduce((acc, order) => {
    // Calculate from stored values in priceDetails
    const originalSubtotal = order.priceDetails.originalSubtotal || 0;
    const productDiscount = order.priceDetails.productDiscount || 0;
    const couponDiscount = order.priceDetails.couponDiscount || 0;
    const taxAmount = order.priceDetails.tax || 0;
    const paidAmount = order.priceDetails.total || 0;

    // Breakdown of discounts
    const totalDiscount = productDiscount + couponDiscount;
    
    return {
      totalAmount: acc.totalAmount + paidAmount,
      originalRevenue: acc.originalRevenue + originalSubtotal,
      productDiscounts: acc.productDiscounts + productDiscount,
      couponDiscounts: acc.couponDiscounts + couponDiscount,
      totalDiscount: acc.totalDiscount + totalDiscount,
      taxTotal: acc.taxTotal + taxAmount,
      netRevenue: acc.netRevenue + (originalSubtotal - totalDiscount),
      orderCount: acc.orderCount + 1
    };
  }, { 
    totalAmount: 0,
    originalRevenue: 0,
    productDiscounts: 0,
    couponDiscounts: 0,
    totalDiscount: 0,
    taxTotal: 0,
    netRevenue: 0,
    orderCount: 0
  });
};

exports.getSalesReport = async (req, res, next) => {
  try {
    const filters = req.session.salesFilters || {};
    const query = buildDateQuery(filters);
    
    const orders = await Order.find(query)
      .sort({ deliveryDate: -1 })
      .lean();
    
    const salesData = calculateSalesTotals(orders);
    
    res.render('sales', {
      orders,
      salesData: {
        totalAmount: Math.floor(salesData.totalAmount),
        originalRevenue: Math.floor(salesData.originalRevenue),
        productDiscounts: Math.floor(salesData.productDiscounts),
        couponDiscounts: Math.floor(salesData.couponDiscounts),
        totalDiscount: Math.floor(salesData.totalDiscount),
        taxTotal: Math.floor(salesData.taxTotal),
        netRevenue: Math.floor(salesData.netRevenue),
        orderCount: salesData.orderCount,
        averageOrderValue: salesData.orderCount > 0 
          ? Math.floor(salesData.totalAmount / salesData.orderCount)
          : 0
      },
      filters
    });
  } catch (error) {
    next(new AppError('Failed to load sales report', 500));
  }
};

exports.applyDateFilter = async (req, res, next) => {
  try {
    req.session.salesFilters = {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      timePeriod: null
    };
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to apply date filter', 500));
  }
};

exports.applyPeriodFilter = async (req, res, next) => {
  try {
    req.session.salesFilters = {
      startDate: null,
      endDate: null,
      timePeriod: req.body.timePeriod
    };
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to apply period filter', 500));
  }
};

exports.clearSalesFilters = async (req, res, next) => {
  try {
    req.session.salesFilters = null;
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to clear filters', 500));
  }
};

exports.generatePDF = async (req, res, next) => {
  try {
    const filters = req.session.salesFilters || {};
    const query = buildDateQuery(filters);
    
    const orders = await Order.find(query)
      .sort({ deliveryDate: -1 })
      .lean();
    
    const salesData = calculateSalesTotals(orders);
    
    const pdfBuffer = await generatePDF({
      orders,
      salesData,
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=sales_report.pdf',
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    next(new AppError('Failed to generate PDF report', 500));
  }
};

exports.generateExcel = async (req, res, next) => {
  try {
    const filters = req.session.salesFilters || {};
    const query = buildDateQuery(filters);
    
    const orders = await Order.find(query)
      .sort({ deliveryDate: -1 })
      .lean();
    
    const salesData = calculateSalesTotals(orders);
    
    const excelBuffer = await generateExcel({
      orders,
      salesData,
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sales_report.xlsx"',
      'Content-Length': excelBuffer.length
    });
    
    res.end(excelBuffer);
  } catch (error) {
    console.error('Excel generation error:', error);
    next(new AppError('Failed to generate Excel report', 500));
  }
};