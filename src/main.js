/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const discount = purchase.discount / 100;

    const price = purchase.sale_price;

    const fullprice = price * purchase.quantity;

    const revenue =
        fullprice * (1 - discount);

    return revenue;
}

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    let percent = 0;

    if (index === 0) percent = 0.15;
    else if (index === 1) percent = 0.10;
    else if (index === 2) percent = 0.10;
    else if (index === total - 1) percent = 0;
    else percent = 0.05;

    return +(seller.profit * percent).toFixed(2);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (
        typeof options !== "object" ||
        options === null
    ) {
        throw new Error("Некорректные опции");
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== "function" ||
        typeof calculateBonus !== "function"
    ) {
        throw new Error("Некорректные опции");
    }

    if (
        !data ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0 ||
        !Array.isArray(data.products) ||
        data.products.length === 0 ||
        !Array.isArray(data.purchase_records) ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }

    // Статы продавцов
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {},
        top_products: [],
        bonus: 0
    }));

    // Индексы
    const sellerIndex = Object.fromEntries(
        sellerStats.map(s => [s.seller_id, s])
    );

    const productIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Обход чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        // ---- ВЫРУЧКА (без округления внутри)
     const recordRevenue = record.items.reduce((sum, item) => {
    const product = productIndex[item.sku];
    if (!product) return sum;

    const revenue = round2(
        calculateRevenue(item, product)
    );

    return sum + revenue;
}, 0);

        seller.revenue += recordRevenue;

        // ---- ПРИБЫЛЬ
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost =
                product.purchase_price * item.quantity;

            const revenue =
                calculateRevenue(item, product);

            const profit = revenue - cost;

            seller.profit += profit;

            // Учёт товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] +=
                item.quantity;
        });
    });

sellerStats.sort((a, b) => b.profit - a.profit);

// 👉 Зафиксировать прибыль
sellerStats.forEach(seller => {
    seller.profit = round2(seller.profit);
});

// Бонусы + топы
sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(
        index,
        sellerStats.length,
        seller
    );

    seller.top_products = Object.entries(
        seller.products_sold
    )
        .map(([sku, quantity]) => ({
            sku,
            quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
});

    // Финальный результат (тут округляем)
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: round2(seller.revenue),
        profit: round2(seller.profit),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: round2(seller.bonus)
    }));
}
