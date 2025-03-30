export const articleSchema = {
    title: 'article',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 100
      },
      name: {
        type: 'string',
        maxLength: 100
      },
      qty: {
        type: 'number',
        minimum: 0
      },
      selling_price: {
        type: 'number',
        minimum: 0
      },
      business_id: {
        type: 'string',
        ref: 'business',
        maxLength: 100
      }
    },
    required: ['id', 'name', 'qty', 'selling_price', 'business_id'],
    indexes: ['business_id', 'name']
  };
  
  export type Article = {
    id: string;
    name: string;
    qty: number;
    selling_price: number;
    business_id: string;
  };