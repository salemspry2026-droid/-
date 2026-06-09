import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface ProductStats {
  timesOrdered: number;
  unitsSold: number;
  totalSales: number;
}

export const orderService = {
  /**
   * Fetches statistics for a specific product across all active orders for a company.
   * @param companyId The ID of the company.
   * @param productId The ID of the product.
   */
  getProductStats: async (companyId: string, productId: string): Promise<ProductStats> => {
    let timesOrdered = 0;
    let unitsSold = 0;
    let totalSales = 0;

    if (!companyId || !productId) {
      return { timesOrdered, unitsSold, totalSales };
    }

    try {
      const q = query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('isDeleted', '==', false)
      );
      
      // In a highly optimized app, consider Cloud Functions or aggregations.
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach((doc) => {
        const order = doc.data();
        if (order.items && Array.isArray(order.items)) {
          // Check for product or product offer
          const productItems = order.items.filter(
            (item: any) => item.productId === productId || item.productId === `${productId}_offer`
          );
          
          if (productItems.length > 0) {
            timesOrdered += 1;
            productItems.forEach((item: any) => {
              const quantity = Number(item.quantity) || 0;
              const price = Number(item.price) || 0;
              unitsSold += quantity;
              totalSales += quantity * price;
            });
          }
        }
      });
    } catch (error) {
      console.error("Error fetching product stats:", error);
      throw error;
    }

    return { timesOrdered, unitsSold, totalSales };
  }
};
