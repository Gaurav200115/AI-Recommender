import fs from 'fs';

export const loadProducts = () => {
  const rawData = fs.readFileSync('./skus.json', 'utf-8');
  const jsonProducts = JSON.parse(rawData);

  return jsonProducts.map((item, index) => ({
    id: (index + 1).toString(),
    name: `${item.brand} - ${item.product_name}`,
    desc: item.description,
    price: item.price,
    category: item.category
  }));
};
