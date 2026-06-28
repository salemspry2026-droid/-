import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';

export const productService = {
  subscribeToProducts: (companyId: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'products'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, onError);
  },

  subscribeToAllProducts: (onData: (data: any[]) => void, onError?: (err: any) => void) => {
    const q = query(
      collection(db, 'products'),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, onError);
  },

  getProductsByIds: async (productIds: string[]) => {
    if (!productIds || productIds.length === 0) return [];
    
    try {
      const chunks = [];
      for (let i = 0; i < productIds.length; i += 30) {
        chunks.push(productIds.slice(i, i + 30));
      }

      const allProducts = [];
      for (const chunk of chunks) {
        const q = query(
          collection(db, 'products'),
          where('__name__', 'in', chunk),
          where('isDeleted', '==', false)
        );
        const snap = await getDocs(q);
        allProducts.push(...snap.docs.map((d: any) => ({ id: d.id, displayId: d.id, ...d.data() })));
      }
      return allProducts;
    } catch (error) {
      console.error("Error fetching products by ids", error);
      throw error;
    }
  },

  subscribeToCategories: (companyId: string, onData: (data: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'productCategories'),
      where('companyId', '==', companyId)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  subscribeToBrands: (companyId: string, onData: (data: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'productBrands'),
      where('companyId', '==', companyId)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  /**
   * Soft deletes a product by setting isDeleted to true.
   * @param productId The ID of the product.
   * @param userId The ID of the user performing the deletion.
   */
  softDeleteProduct: async (productId: string, userId?: string, companyId?: string) => {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      isDeleted: true,
      updatedAt: serverTimestamp(),
      updatedBy: userId || null,
    });
    if (companyId && userId) {
      import('@/lib/services/auditLogService').then(({ auditLogService }) => {
        auditLogService.logAction(companyId, 'DELETE_PRODUCT', { productId }, userId);
      });
    }
  },

  updateProduct: async (productId: string, productData: any, userId: string, companyId?: string) => {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    if (companyId) {
      import('@/lib/services/auditLogService').then(({ auditLogService }) => {
        auditLogService.logAction(companyId, 'UPDATE_PRODUCT', { productId, keysChanged: Object.keys(productData) }, userId);
      });
    }
  },

  createProduct: async (productId: string, productData: any, userId: string, companyId?: string) => {
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      ...productData,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    });
    if (companyId) {
      import('@/lib/services/auditLogService').then(({ auditLogService }) => {
        auditLogService.logAction(companyId, 'CREATE_PRODUCT', { productId, name: productData.name }, userId);
      });
    }
  }
};
