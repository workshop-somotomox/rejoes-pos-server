import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ReJoEs POS Server API',
      version: '1.0.0',
      description: 'API for managing members, loans, and uploads',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {},
            message: { type: 'string' },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm123abc' },
            cardToken: { type: 'string', example: 'member-123' },
            tier: { type: 'string', example: 'PREMIUM' },
            status: { type: 'string', example: 'ACTIVE' },
            cycleStart: { type: 'string', format: 'date-time' },
            cycleEnd: { type: 'string', format: 'date-time' },
            itemsUsed: { type: 'integer', example: 2 },
            swapsUsed: { type: 'integer', example: 1 },
            itemsOut: { type: 'integer', example: 1 },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
