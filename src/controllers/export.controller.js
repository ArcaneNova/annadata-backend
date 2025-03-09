const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const json2csv = require('json2csv').parse;
const ExcelJS = require('exceljs');

// Export orders data
const exportOrders = async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv', status } = req.query;
    const user = req.user;

    // Build query
    const query = {};
    if (user.role !== 'admin') {
      query[user.role === 'consumer' ? 'buyer' : 'seller'] = user._id;
    }
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get orders with populated data
    const orders = await Order.find(query)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('items.product', 'name category unit');

    // Transform data for export
    const exportData = orders.map(order => ({
      OrderID: order._id,
      Date: order.createdAt.toISOString().split('T')[0],
      Buyer: order.buyer.name,
      BuyerEmail: order.buyer.email,
      BuyerPhone: order.buyer.phone,
      Seller: order.seller.name,
      SellerEmail: order.seller.email,
      SellerPhone: order.seller.phone,
      Items: order.items.map(item => 
        `${item.product.name} (${item.quantity} ${item.product.unit})`
      ).join('; '),
      TotalAmount: order.totalAmount,
      Status: order.status,
      PaymentStatus: order.paymentStatus,
      PaymentMethod: order.paymentMethod,
      DeliveryAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
    }));

    // Generate export file based on format
    if (format === 'csv') {
      const csv = json2csv(exportData);
      res.header('Content-Type', 'text/csv');
      res.attachment(`orders_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders');

      // Add headers
      worksheet.columns = Object.keys(exportData[0]).map(key => ({
        header: key,
        key,
        width: 20
      }));

      // Add rows
      worksheet.addRows(exportData);

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      return workbook.xlsx.write(res);
    }

    res.status(400).json({ message: 'Invalid export format' });
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ message: 'Error exporting orders' });
  }
};

// Export inventory data
const exportInventory = async (req, res) => {
  try {
    const { format = 'csv', category, stockStatus } = req.query;
    const seller = req.user._id;

    // Build query
    const query = { seller };
    if (category) query.category = category;
    if (stockStatus === 'low') {
      query.stock = { $lte: 10 };
    } else if (stockStatus === 'out') {
      query.stock = 0;
    }

    // Get products
    const products = await Product.find(query);

    // Transform data for export
    const exportData = products.map(product => ({
      ProductID: product._id,
      Name: product.name,
      Category: product.category,
      Stock: product.stock,
      Unit: product.unit,
      Price: product.price,
      Status: product.stock === 0 ? 'Out of Stock' : 
        product.stock <= 10 ? 'Low Stock' : 'In Stock',
      LastUpdated: product.updatedAt.toISOString().split('T')[0]
    }));

    // Generate export file based on format
    if (format === 'csv') {
      const csv = json2csv(exportData);
      res.header('Content-Type', 'text/csv');
      res.attachment(`inventory_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventory');

      // Add headers
      worksheet.columns = Object.keys(exportData[0]).map(key => ({
        header: key,
        key,
        width: 15
      }));

      // Add rows
      worksheet.addRows(exportData);

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
      return workbook.xlsx.write(res);
    }

    res.status(400).json({ message: 'Invalid export format' });
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({ message: 'Error exporting inventory' });
  }
};

// Export sales analytics
const exportSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv', groupBy = 'day' } = req.query;
    const user = req.user;

    // Build match stage
    const matchStage = {
      status: 'delivered',
      paymentStatus: 'completed'
    };

    if (user.role !== 'admin') {
      matchStage[user.role === 'consumer' ? 'buyer' : 'seller'] = user._id;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Get analytics data
    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'month' ? '%Y-%m' : 
                groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Transform data for export
    const exportData = analytics.map(record => ({
      Period: record._id,
      TotalOrders: record.totalOrders,
      TotalRevenue: record.totalRevenue.toFixed(2),
      AverageOrderValue: record.averageOrderValue.toFixed(2)
    }));

    // Generate export file based on format
    if (format === 'csv') {
      const csv = json2csv(exportData);
      res.header('Content-Type', 'text/csv');
      res.attachment(`sales_analytics_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Analytics');

      // Add headers
      worksheet.columns = Object.keys(exportData[0]).map(key => ({
        header: key,
        key,
        width: 15
      }));

      // Add rows
      worksheet.addRows(exportData);

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add summary row
      const summaryRow = {
        Period: 'Total',
        TotalOrders: exportData.reduce((sum, row) => sum + row.TotalOrders, 0),
        TotalRevenue: exportData.reduce((sum, row) => sum + parseFloat(row.TotalRevenue), 0).toFixed(2),
        AverageOrderValue: (exportData.reduce((sum, row) => sum + parseFloat(row.AverageOrderValue), 0) / exportData.length).toFixed(2)
      };
      worksheet.addRow(summaryRow);

      // Style summary row
      const lastRow = worksheet.lastRow;
      lastRow.font = { bold: true };
      lastRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF0B3' }
      };

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`sales_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      return workbook.xlsx.write(res);
    }

    res.status(400).json({ message: 'Invalid export format' });
  } catch (error) {
    console.error('Export sales analytics error:', error);
    res.status(500).json({ message: 'Error exporting sales analytics' });
  }
};

module.exports = {
  exportOrders,
  exportInventory,
  exportSalesAnalytics
}; 