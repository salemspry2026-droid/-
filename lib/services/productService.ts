import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const productService = {
  /**
   * Soft deletes a product by setting isDeleted to true.
   * @param productId The ID of the product.
   * @param userId The ID of the user performing the deletion.
   */
  softDeleteProduct: async (productId: string, userId?: string) => {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      isDeleted: true,
      updatedAt: serverTimestamp(),
      updatedBy: userId || null,
    });
  }
};
