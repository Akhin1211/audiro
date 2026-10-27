const Order = require("../models/order.model.js");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const getDateRange = (rangeType, startDate, endDate) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (rangeType) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "weekly":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "yearly":
      start.setFullYear(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(now.getDate() - 30);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
};

const getSalesReportData = async ({ range = "monthly", startDate, endDate }) => {
  const { start, end } = getDateRange(range, startDate, endDate);

  const query = {
    createdAt: { $gte: start, $lte: end },
    orderStatus: { $ne: "Cancelled" },
  };

  const orders = await Order.find(query)
    .populate("user", "username email phone")
    .sort({ createdAt: -1 });

  let totalOrdersCount = orders.length;
  let totalSalesAmount = 0;
  let totalCouponDiscount = 0;
  let totalOfferDiscount = 0;
  let netRevenue = 0;

  orders.forEach((o) => {
    const subtotal = o.pricing?.subtotal || 0;
    const couponDisc = o.pricing?.couponDiscount || 0;
    const offerDisc = o.pricing?.offerDiscount || 0;
    const finalTotal = o.pricing?.finalTotal || 0;

    totalSalesAmount += subtotal;
    totalCouponDiscount += couponDisc;
    totalOfferDiscount += offerDisc;

    // Revenue includes only successfully delivered orders
    if (o.orderStatus === "Delivered") {
      netRevenue += finalTotal;
    }
  });

  const totalDiscounts = totalCouponDiscount + totalOfferDiscount;

  return {
    period: {
      range,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    summary: {
      totalOrdersCount,
      totalSalesAmount,
      totalCouponDiscount,
      totalOfferDiscount,
      totalDiscounts,
      netRevenue,
    },
    orders,
  };
};

const generateSalesReportExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Audiro E-Commerce Admin";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Sales Report");

  // Title & Metadata
  worksheet.addRow(["AUDIRO SALES REPORT"]);
  worksheet.addRow([`Period: ${reportData.period.range.toUpperCase()} (${new Date(reportData.period.startDate).toLocaleDateString()} to ${new Date(reportData.period.endDate).toLocaleDateString()})`]);
  worksheet.addRow([`Generated At: ${new Date().toLocaleString()}`]);
  worksheet.addRow([]);

  // Summary Metrics Table
  worksheet.addRow(["SUMMARY METRICS"]);
  worksheet.addRow(["Total Orders", reportData.summary.totalOrdersCount]);
  worksheet.addRow(["Gross Sales (₹)", reportData.summary.totalSalesAmount]);
  worksheet.addRow(["Coupon Discounts (₹)", reportData.summary.totalCouponDiscount]);
  worksheet.addRow(["Offer Discounts (₹)", reportData.summary.totalOfferDiscount]);
  worksheet.addRow(["Total Discounts (₹)", reportData.summary.totalDiscounts]);
  worksheet.addRow(["Net Revenue (₹)", reportData.summary.netRevenue]);
  worksheet.addRow([]);

  // Orders Table Header
  worksheet.addRow([
    "Order ID",
    "Date",
    "Customer",
    "Email",
    "Items Count",
    "Subtotal (₹)",
    "Coupon Discount (₹)",
    "Offer Discount (₹)",
    "Delivery Fee (₹)",
    "Tax (₹)",
    "Net Total (₹)",
    "Payment Method",
    "Order Status",
  ]);

  // Orders Data Rows
  reportData.orders.forEach((o) => {
    worksheet.addRow([
      o.orderId,
      new Date(o.createdAt).toLocaleDateString(),
      o.user?.username || o.shippingAddress?.name || "Customer",
      o.user?.email || "N/A",
      o.items?.length || 0,
      o.pricing?.subtotal || 0,
      o.pricing?.couponDiscount || 0,
      o.pricing?.offerDiscount || 0,
      o.pricing?.deliveryCharge || 0,
      o.pricing?.tax || 0,
      o.pricing?.finalTotal || 0,
      o.paymentMethod || "COD",
      o.orderStatus,
    ]);
  });

  // Auto-fit column widths
  worksheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 3, 35);
  });

  return await workbook.xlsx.writeBuffer();
};

const generateSalesReportPdf = (reportData, res) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  doc.pipe(res);

  // Header Banner
  doc
    .rect(0, 0, doc.page.width, 70)
    .fill("#1d3557");

  doc
    .fillColor("#ffffff")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("Audiro Sales Report", 40, 24);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Period: ${reportData.period.range.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`,
      doc.page.width - 260,
      28,
      { align: "right", width: 220 }
    );

  doc.moveDown(4);

  // Summary Cards Box
  const summaryY = 95;
  doc
    .rect(40, summaryY, doc.page.width - 80, 85)
    .fillColor("#f8fafc")
    .fill()
    .strokeColor("#cbd5e1")
    .stroke();

  doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold");
  doc.text("EXECUTIVE SALES SUMMARY", 55, summaryY + 12);

  doc.font("Helvetica").fontSize(10).fillColor("#334155");
  doc.text(`Total Completed Orders: ${reportData.summary.totalOrdersCount}`, 55, summaryY + 34);
  doc.text(`Gross Sales Volume: Rs. ${reportData.summary.totalSalesAmount.toLocaleString("en-IN")}`, 55, summaryY + 52);
  doc.text(`Total Discounts Given: Rs. ${reportData.summary.totalDiscounts.toLocaleString("en-IN")}`, 55, summaryY + 70);

  doc.text(`Coupon Deductions: Rs. ${reportData.summary.totalCouponDiscount.toLocaleString("en-IN")}`, 280, summaryY + 34);
  doc.text(`Promotional Offers: Rs. ${reportData.summary.totalOfferDiscount.toLocaleString("en-IN")}`, 280, summaryY + 52);
  doc.font("Helvetica-Bold").fillColor("#15803d");
  doc.text(`Net Revenue: Rs. ${reportData.summary.netRevenue.toLocaleString("en-IN")}`, 280, summaryY + 70);

  // Orders Table Heading
  const tableTop = summaryY + 105;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e293b");
  doc.text("Orders Breakdown", 40, tableTop);

  // Table Columns Header
  const headerY = tableTop + 20;
  doc.rect(40, headerY, doc.page.width - 80, 22).fillColor("#1e293b").fill();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  doc.text("Order ID", 48, headerY + 6);
  doc.text("Date", 150, headerY + 6);
  doc.text("Customer", 220, headerY + 6);
  doc.text("Payment", 320, headerY + 6);
  doc.text("Discount", 400, headerY + 6);
  doc.text("Net Total", 475, headerY + 6);

  let currentY = headerY + 22;
  doc.font("Helvetica").fontSize(8.5);

  const displayOrders = reportData.orders.slice(0, 40); // Print up to 40 recent orders in PDF

  displayOrders.forEach((o, index) => {
    if (currentY > doc.page.height - 60) {
      doc.addPage();
      currentY = 40;
    }

    const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    doc.rect(40, currentY, doc.page.width - 80, 18).fillColor(rowBg).fill();

    doc.fillColor("#1e293b");
    doc.text(o.orderId, 48, currentY + 5, { width: 95 });
    doc.text(new Date(o.createdAt).toLocaleDateString(), 150, currentY + 5);
    doc.text(o.user?.username || o.shippingAddress?.name || "Customer", 220, currentY + 5, { width: 95 });
    doc.text(o.paymentMethod || "COD", 320, currentY + 5);
    const disc = (o.pricing?.couponDiscount || 0) + (o.pricing?.offerDiscount || 0);
    doc.text(`Rs. ${disc}`, 400, currentY + 5);
    doc.font("Helvetica-Bold");
    doc.text(`Rs. ${o.pricing?.finalTotal || 0}`, 475, currentY + 5);
    doc.font("Helvetica");

    currentY += 18;
  });

  // Footer
  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text(
      "Audiro E-Commerce Platform | Confidential Business Report",
      40,
      doc.page.height - 30,
      { align: "center", width: doc.page.width - 80 }
    );

  doc.end();
};

module.exports = {
  getSalesReportData,
  generateSalesReportExcel,
  generateSalesReportPdf,
};
