export interface MonthlyRevenueDto {
  month: string;
  revenue: number;
}

export interface DailyRevenueDto {
  date: string;
  revenue: number;
}

export interface UserGrowthDto {
  date: string;
  count: number;
}

export interface OrderStatusDistributionDto {
  status: string;
  count: number;
}

export interface TopShopDto {
  shopName: string;
  revenue: number;
}

export interface TopProductDto {
  productName: string;
  quantitySold: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalShops: number;
  totalProducts: number;
  totalRevenue: number;
  totalSales: number;
  monthlyRevenue: MonthlyRevenueDto[];
  userGrowth: UserGrowthDto[];
  orderStatusDistribution: OrderStatusDistributionDto[];
  topShops: TopShopDto[];
}

export interface SellerDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  totalRevenue: number;
  availableBalance: number;
  lockedBalance: number;
  totalProducts: number;
  averageRating: number;
  dailyRevenue: DailyRevenueDto[];
  orderStatusSummary: OrderStatusDistributionDto[];
  topProducts: TopProductDto[];
}
