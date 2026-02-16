/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const discount = purchase.discount / 100;

    const price =
        purchase.sale_price ??
        product.sale_price;

    const fullprice = price * purchase.quantity;

    return fullprice * (1 - discount);
}


/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;
    } else if (index === 1) {
        return seller.profit * 0.10;
    } else if (index === 2) {
        return seller.profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
     // Проверка опций
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


    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        top_products: {},
        products_sold: {},
        bonus: 0
    }));
    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(item => [item.seller_id, item]));
    const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item]));
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        // Увеличить количество продаж
        seller.sales_count += 1;
        // Увеличить общую сумму выручки всех продаж
       seller.revenue += record.items.reduce((sum, item) => {
            const product = productIndex[item.sku];

            const revenue =
                calculateRevenue(item, product);

            return sum + +revenue.toFixed(2);
        }, 0);


        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity;
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const revenue = calculateRevenue(item, product);
            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;
            // Увеличить общую накопленную прибыль (profit) у продавца
            seller.profit += +(revenue - cost).toFixed(2);

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku] += item.quantity;
        });
 });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(([sku, quantity]) => ({
            sku,
            quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,

        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),

        sales_count: seller.sales_count,

        top_products: seller.top_products,

        bonus: seller.bonus
    }));
}
