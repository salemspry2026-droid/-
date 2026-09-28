package com.flowexa.app.data.remote

import com.flowexa.app.data.local.entity.*
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import org.json.JSONArray
import org.json.JSONObject

object FirestoreMappers {

    fun docToUserProfile(doc: DocumentSnapshot): UserProfileEntity {
        val data = doc.data ?: emptyMap<String, Any?>()
        return UserProfileEntity(
            id = doc.id,
            email = data["email"] as? String ?: "",
            displayName = data["displayName"] as? String ?: "",
            companyId = data["companyId"] as? String,
            role = data["role"] as? String,
            companyName = data["companyName"] as? String,
            phone = data["phone"] as? String,
            storeName = data["storeName"] as? String,
            address = data["address"] as? String,
            addressCountry = data["addressCountry"] as? String,
            addressGov = data["addressGov"] as? String,
            addressCity = data["addressCity"] as? String,
            addressNeighborhood = data["addressNeighborhood"] as? String,
            logoUrl = data["logoUrl"] as? String,
            activityType = data["activityType"] as? String,
            activityTypeOther = data["activityTypeOther"] as? String,
            notes = data["notes"] as? String,
            favoriteProductIdsJson = (data["favoriteProductIds"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            permissionsJson = (data["permissions"] as? Map<*, *>)?.let { JSONObject(it).toString() } ?: "{}",
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time,
            updatedAtMs = (data["updatedAt"] as? Timestamp)?.toDate()?.time,
            isDeleted = data["isDeleted"] as? Boolean ?: false,
            syncState = "SYNCED"
        )
    }

    fun docToCompany(doc: DocumentSnapshot): CompanyEntity {
        val data = doc.data ?: emptyMap<String, Any?>()
        return CompanyEntity(
            id = doc.id,
            name = data["name"] as? String ?: "",
            ownerId = data["ownerId"] as? String,
            joinCode = data["joinCode"] as? String,
            clientJoinCode = data["clientJoinCode"] as? String,
            logoUrl = data["logoUrl"] as? String,
            phone = data["phone"] as? String,
            address = data["address"] as? String,
            taxId = data["taxId"] as? String,
            contactNumbersJson = (data["contactNumbers"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            aboutUs = data["aboutUs"] as? String,
            email = data["email"] as? String,
            notes = data["notes"] as? String,
            workingHours = data["workingHours"] as? String,
            companyType = data["companyType"] as? String,
            primaryCurrency = data["primaryCurrency"] as? String ?: "SAR",
            secondaryCurrenciesJson = (data["secondaryCurrencies"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            exchangeRatesJson = (data["exchangeRates"] as? Map<*, *>)?.let { JSONObject(it).toString() } ?: "{}",
            productUnitsJson = (data["productUnits"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time,
            updatedAtMs = (data["updatedAt"] as? Timestamp)?.toDate()?.time,
            isDeleted = data["isDeleted"] as? Boolean ?: false,
            syncState = "SYNCED"
        )
    }

    fun docToProduct(doc: DocumentSnapshot): ProductEntity {
        val data = doc.data ?: emptyMap<String, Any?>()
        return ProductEntity(
            id = doc.id,
            companyId = data["companyId"] as? String ?: "",
            name = data["name"] as? String ?: "",
            scientificName = data["scientificName"] as? String,
            description = data["description"] as? String,
            price = (data["price"] as? Number)?.toDouble() ?: 0.0,
            currency = data["currency"] as? String ?: "SAR",
            categoryId = data["categoryId"] as? String,
            unit = data["unit"] as? String,
            brandId = data["brandId"] as? String,
            imageUrl = data["imageUrl"] as? String,
            notes = data["notes"] as? String,
            expiryDatesJson = (data["expiryDates"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            inStock = data["inStock"] as? Boolean ?: true,
            isNewProduct = data["isNewProduct"] as? Boolean ?: false,
            isLowStock = data["isLowStock"] as? Boolean ?: false,
            specialOfferJson = (data["specialOffer"] as? Map<*, *>)?.let { JSONObject(it).toString() },
            invoiceTypeRestriction = data["invoiceTypeRestriction"] as? String ?: "both",
            currencyRestrictionType = data["currencyRestrictionType"] as? String ?: "all",
            specificCurrenciesJson = (data["specificCurrencies"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            bonusType = data["bonusType"] as? String ?: "none",
            bonusFixedPercent = (data["bonusFixedPercent"] as? Number)?.toDouble(),
            bonusTiersJson = (data["bonusTiers"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            isActive = data["isActive"] as? Boolean ?: true,
            isDeleted = data["isDeleted"] as? Boolean ?: false,
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time,
            updatedAtMs = (data["updatedAt"] as? Timestamp)?.toDate()?.time,
            syncState = "SYNCED"
        )
    }

    fun docToCustomer(doc: DocumentSnapshot): CustomerEntity {
        val data = doc.data ?: emptyMap<String, Any?>()
        return CustomerEntity(
            id = doc.id,
            companyId = data["companyId"] as? String ?: "",
            name = data["name"] as? String ?: "",
            email = data["email"] as? String,
            phone = data["phone"] as? String,
            contactNumbersJson = (data["contactNumbers"] as? List<*>)?.let { JSONArray(it).toString() } ?: "[]",
            address = data["address"] as? String,
            notes = data["notes"] as? String,
            appUserId = data["appUserId"] as? String,
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time,
            updatedAtMs = (data["updatedAt"] as? Timestamp)?.toDate()?.time,
            isDeleted = data["isDeleted"] as? Boolean ?: false,
            syncState = "SYNCED"
        )
    }

    fun docToOrder(doc: DocumentSnapshot): Pair<OrderEntity, List<OrderItemEntity>> {
        val data = doc.data ?: emptyMap<String, Any?>()
        val order = OrderEntity(
            id = doc.id,
            companyId = data["companyId"] as? String ?: "",
            customerId = data["customerId"] as? String ?: "",
            customerName = data["customerName"] as? String ?: "",
            customerPhone = data["customerPhone"] as? String,
            customerAddress = data["customerAddress"] as? String,
            companyName = data["companyName"] as? String,
            status = data["status"] as? String ?: "pending",
            invoiceType = data["invoiceType"] as? String,
            dueDate = data["dueDate"] as? String,
            source = data["source"] as? String ?: "admin",
            clientUid = data["clientUid"] as? String,
            linkedCrmCustomerId = data["linkedCrmCustomerId"] as? String,
            totalAmountByCurrencyJson = (data["totalAmountByCurrency"] as? Map<*, *>)?.let { JSONObject(it).toString() } ?: "{}",
            notes = data["notes"] as? String,
            createdBy = data["createdBy"] as? String ?: "",
            createdByName = data["createdByName"] as? String,
            updatedBy = data["updatedBy"] as? String ?: "",
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time,
            updatedAtMs = (data["updatedAt"] as? Timestamp)?.toDate()?.time,
            isDeleted = data["isDeleted"] as? Boolean ?: false,
            syncState = "SYNCED"
        )

        val rawItems = data["items"] as? List<Map<String, Any?>> ?: emptyList()
        val items = rawItems.map { itemMap ->
            OrderItemEntity(
                orderId = doc.id,
                productId = itemMap["productId"] as? String ?: "",
                productName = itemMap["productName"] as? String ?: "",
                quantity = (itemMap["quantity"] as? Number)?.toDouble() ?: 0.0,
                bonusQuantity = (itemMap["bonusQuantity"] as? Number)?.toDouble() ?: 0.0,
                price = (itemMap["price"] as? Number)?.toDouble() ?: 0.0,
                currency = itemMap["currency"] as? String ?: "SAR",
                note = itemMap["note"] as? String,
                isManualBonus = itemMap["isManualBonus"] as? Boolean ?: false
            )
        }

        return Pair(order, items)
    }

    fun docToNotification(doc: DocumentSnapshot, currentUid: String? = null): NotificationEntity {
        val data = doc.data ?: emptyMap<String, Any?>()
        val readBy = (data["readBy"] as? List<*>) ?: emptyList<Any>()
        val isRead = if (!currentUid.isNullOrEmpty()) readBy.contains(currentUid) else readBy.isNotEmpty()
        return NotificationEntity(
            id = doc.id,
            companyId = data["companyId"] as? String ?: "",
            title = data["title"] as? String ?: "",
            message = data["message"] as? String ?: "",
            type = data["type"] as? String ?: "general",
            orderId = data["orderId"] as? String,
            clientUid = data["clientUid"] as? String,
            isRead = isRead,
            createdAtMs = (data["createdAt"] as? Timestamp)?.toDate()?.time
        )
    }
}
