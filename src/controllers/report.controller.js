const {
  getSalesReportData,
  generateSalesReportExcel,
  generateSalesReportPdf,
} = require("../services/report.service.js");

const getSalesReport = async (req, res) => {
  try {
    const report = await getSalesReportData(req.query);
    res.status(200).json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadSalesReportExcel = async (req, res) => {
  try {
    const reportData = await getSalesReportData(req.query);
    const buffer = await generateSalesReportExcel(reportData);

    const filename = `Audiro_Sales_Report_${reportData.period.range}_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadSalesReportPdf = async (req, res) => {
  try {
    const reportData = await getSalesReportData(req.query);
    const filename = `Audiro_Sales_Report_${reportData.period.range}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    generateSalesReportPdf(reportData, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  downloadSalesReportExcel,
  downloadSalesReportPdf,
};
