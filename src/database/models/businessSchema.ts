// src/database/models/businessSchema.ts
export const businessSchema = {
    title: 'business',
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
      }
    },
    required: ['id', 'name'],
    indexes: ['name']
  };
  
  export type Business = {
    id: string;
    name: string;
  };