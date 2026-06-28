import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, serverTimestamp, setDoc, onSnapshot, getCountFromServer, getAggregateFromServer, sum, average, limit, orderBy, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore';

export interface ProductStats {
  timesOrdered: number;
  unitsSold: number;
  totalSales: number;
}

export const orderService = {
  getDashboardStats: async (companyId: string, companyCurrency: string, orderStages: any[]) => {
    if (!companyId) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const qAllOrders = query(
      collection(db, 'orders'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );

    const qTodayOrders = query(
      collection(db, 'orders'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false),
      where('createdAt', '>=', today)
    );

    const qTodayDelegate = query(qTodayOrders, where('source', '!=', 'customer'));
    const qTodayCustomer = query(qTodayOrders, where('source', '==', 'customer'));

    // Get today's total sales
    const todayAggPromise = getAggregateFromServer(qTodayOrders, {
      totalSales: sum(`totalAmountByCurrency.${companyCurrency}`)
    });

    const todayCountSnapPromise = getCountFromServer(qTodayOrders);
    const delegateCountPromise = getCountFromServer(qTodayDelegate);
    const customerCountPromise = getCountFromServer(qTodayCustomer);
    
    const stagePromises = orderStages.map(stage => 
      getCountFromServer(query(qAllOrders, where('status', '==', stage.id || stage.name)))
    );

    const [todayAgg, todayCountSnap, delegateCountSnap, customerCountSnap, ...stageSnaps] = await Promise.all([
      todayAggPromise,
      todayCountSnapPromise,
      delegateCountPromise,
      customerCountPromise,
      ...stagePromises
    ]);

    const todayCount = todayCountSnap.data().count;
    
    const stageCounts: Record<string, number> = {};
    orderStages.forEach((stage, idx) => {
      stageCounts[stage.id || stage.name] = stageSnaps[idx].data().count;
    });

    return {
      todayCount,
      delegateCount: delegateCountSnap.data().count,
      customerCount: customerCountSnap.data().count,
      totalSalesToday: todayAgg.data().totalSales || 0,
      avgSalesToday: todayCount > 0 ? (todayAgg.data().totalSales || 0) / todayCount : 0,
      stageCounts
    };
  },

  subscribeToRecentOrders: (companyId: string, limitCount: number, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'orders'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, onError);
  },

  getPaginatedOrders: async (
    companyId: string, 
    lastDoc: DocumentSnapshot | null, 
    pageSize: number = 20, 
    filters?: { status?: string; invoiceType?: string }
  ) => {
    if (!companyId) return { data: [], lastDoc: null };

    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    ];

    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.invoiceType) {
      constraints.push(where('invoiceType', '==', filters.invoiceType));
    }

    // orderBy createdAt desc
    constraints.push(orderBy('createdAt', 'desc'));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, 'orders'), ...constraints);
    
    try {
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { data, lastDoc: newLastDoc };
    } catch (error) {
      console.error("Error fetching paginated orders:", error);
      throw error;
    }
  },
  
  subscribeToOrders: (
    companyId: string, 
    limitCountOrOnData: number | ((data: any[]) => void), 
    onDataOrOnError?: ((data: any[]) => void) | ((err: any) => void),
    onErrorCb?: (err: any) => void
  ) => {
    if (!companyId) return () => {};
    
    let limitCount: number | undefined;
    let onData: (data: any[]) => void;
    let onError: ((err: any) => void) | undefined;

    if (typeof limitCountOrOnData === 'number') {
      limitCount = limitCountOrOnData;
      onData = onDataOrOnError as (data: any[]) => void;
      onError = onErrorCb;
    } else {
      limitCount = undefined;
      onData = limitCountOrOnData as (data: any[]) => void;
      onError = onDataOrOnError as (err: any) => void;
    }

    let q;
    if (limitCount !== undefined) {
      q = query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );
    }
    
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, onError);
  },

  subscribeToOrderStages: (companyId: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'orderStages'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snap) => {
      const stages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).sort((a, b) => a.index - b.index);
      onData(stages);
    }, onError);
  },

  subscribeToClientOrders: (userId: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!userId) return () => {};

    let myOrders: any[] = [];
    let mappedOrders: any[] = [];

    const updateCombined = () => {
      const combined = [...myOrders, ...mappedOrders];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      unique.sort((a, b) => {
        const da = a.createdAt?.toMillis?.() || 0;
        const db = b.createdAt?.toMillis?.() || 0;
        return db - da;
      });
      onData(unique);
    };

    const qSelf = query(
      collection(db, 'orders'), 
      where('createdBy', '==', userId)
    );
    const qClientUid = query(
      collection(db, 'orders'), 
      where('clientUid', '==', userId)
    );

    const unsubSelf = onSnapshot(qSelf, (snapshot) => {
      myOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(d => !(d as any).isDeleted);
      updateCombined();
    }, onError);

    const unsubClientUid = onSnapshot(qClientUid, (snapshot) => {
      mappedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(d => !(d as any).isDeleted);
      updateCombined();
    }, onError);

    return () => { unsubSelf(); unsubClientUid(); };
  },

  updateOrderStatus: async (orderId: string, newStatus: string, userId: string, companyId?: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    if (companyId) {
      import('@/lib/services/auditLogService').then(({ auditLogService }) => {
        auditLogService.logAction(companyId, 'UPDATE_ORDER_STATUS', { orderId, newStatus }, userId);
      });
    }
  },

  updateOrder: async (orderId: string, data: any, userId: string, companyId?: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    if (companyId) {
      import('@/lib/services/auditLogService').then(({ auditLogService }) => {
        auditLogService.logAction(companyId, 'UPDATE_ORDER', { orderId, keysChanged: Object.keys(data) }, userId);
      });
    }
  },

  updateClientOrdersWithCustomerInfo: async (orders: any[], storeName: string, phone: string, fullAddress: string) => {
    try {
      const promises = orders.map(async (order) => {
        if (order.status === 'pending' || order.status === 'processing') {
          await updateDoc(doc(db, 'orders', order.id), {
            customerName: storeName,
            customerPhone: phone,
            customerAddress: fullAddress
          });
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Error updating client orders with customer info:", error);
      throw error;
    }
  },

  createOrder: async (orderData: any, userId: string) => {
    const orderId = orderData.id || `ord_${crypto.randomUUID()}`;
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      ...orderData,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    });
    return orderId;
  },

  placeClientOrder: async (
    userUid: string,
    profile: any,
    companyId: string,
    items: any[],
    invoiceType: string,
    totalAmountByCurrency: Record<string, number>,
    status: string = 'pending'
  ) => {
    // Check if user has an existing CRM linked ID for this company
    let existingLinkedCrmCustomerId = null;
    let existingCustomerId = userUid;
    try {
      const qOrders = query(
        collection(db, 'orders'),
        where('createdBy', '==', userUid)
      );
      const prevOrdersSnap = await getDocs(qOrders);
      const linkedOrder = prevOrdersSnap.docs.find(d => {
        const data = d.data();
        return data.companyId === companyId && !data.isDeleted && data.linkedCrmCustomerId;
      });
      if (linkedOrder) {
        existingLinkedCrmCustomerId = linkedOrder.data().linkedCrmCustomerId;
        existingCustomerId = existingLinkedCrmCustomerId;
      }
    } catch (err) {
      console.error('Error fetching past orders for linking:', err);
    }

    const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
    const orderData = {
      companyId,
      customerId: existingCustomerId,
      ...(existingLinkedCrmCustomerId && { linkedCrmCustomerId: existingLinkedCrmCustomerId }),
      clientUid: userUid,
      customerName: profile?.storeName || profile?.displayName || 'عميل',
      customerPhone: profile?.phone || '',
      customerAddress: profile?.address || 'طلب عبر التطبيق',
      source: 'customer',
      items,
      totalAmountByCurrency,
      status,
      invoiceType,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userUid,
      createdByName: profile?.displayName || 'عميل',
      updatedBy: userUid,
    };

    await setDoc(doc(db, 'orders', orderId), orderData);

    const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      companyId,
      title: 'طلب جديد من عميل',
      message: `تم تسجيل طلب جديد رقم #${orderId.substring(0, 6)} من قِبل العميل المباشر`,
      type: 'client_order',
      orderId: orderId,
      readBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userUid,
      updatedBy: userUid,
      isDeleted: false
    }).catch(() => {});

    return orderId;
  },

  createNotification: async (companyId: string, customProps: any) => {
    const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      companyId: companyId,
      createdAt: serverTimestamp(),
      isDeleted: false,
      ...customProps
    });
  },

  getOrderById: async (orderId: string) => {
    if (!orderId) return null;
    try {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists() && snap.data().isDeleted !== true) {
        return { id: snap.id, ...snap.data() as any };
      }
      return null;
    } catch (error) {
      console.error("Error fetching order by ID:", error);
      throw error;
    }
  },

  getOrdersByCustomerId: async (companyId: string, customerId: string) => {
    if (!companyId || !customerId) return [];
    try {
      const q = query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('customerId', '==', customerId),
        where('isDeleted', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      throw error;
    }
  },

  getOrderStages: async (companyId: string) => {
    if (!companyId) return [];
    try {
      const q = query(
        collection(db, 'orderStages'),
        where('companyId', '==', companyId),
        where('isDeleted', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => a.index - b.index);
    } catch (error) {
      console.error("Error fetching order stages:", error);
      throw error;
    }
  },
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
