import { apiClient } from './apiClient';

/**
 * Dashboard API Services
 */
export const dashboardService = {
  async getKpis() {
    return apiClient('/dashboard/kpis');
  },
  async getCharts() {
    return apiClient('/dashboard/charts');
  },
  async getActivity(limit = 20, offset = 0) {
    return apiClient(`/dashboard/activity?limit=${limit}&offset=${offset}`);
  },
  async getNotifications() {
    return apiClient('/dashboard/notifications');
  },
  
  // Analytics
  async getAnalyticsAverages() {
    return apiClient('/analytics/averages');
  },
  async getAnalyticsVendorUtilization() {
    return apiClient('/analytics/vendor-utilization');
  },
  async getAnalyticsTopVendors() {
    return apiClient('/analytics/top-vendors');
  },
  async getAnalyticsTopCategories() {
    return apiClient('/analytics/top-categories');
  },
  async getAnalyticsCycleTimes() {
    return apiClient('/analytics/cycle-times');
  },

  // Reports
  async getVendorsReport(filters = {}) {
    return apiClient('/reports/vendors', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  },
  async getPurchaseOrdersReport(filters = {}) {
    return apiClient('/reports/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  },
  async getInvoicesReport(filters = {}) {
    return apiClient('/reports/invoices', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  }
};
