import express from 'express';
import { prisma } from '../prisma';

const router = express.Router();

// Get all stores
router.get('/', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { loans: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stores'
    });
  }
});

// Get store by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { loans: true }
        },
        loans: {
          include: {
            member: {
              select: {
                id: true,
                cardToken: true,
                tier: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store'
    });
  }
});

// Create new store
router.post('/add', async (req, res) => {
  try {
    const { name, location, address, phone, email } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        error: 'Name and location are required'
      });
    }

    // Check if store name already exists
    const existingStore = await prisma.store.findUnique({
      where: { name }
    });

    if (existingStore) {
      return res.status(400).json({
        success: false,
        error: 'Store with this name already exists'
      });
    }

    const store = await prisma.store.create({
      data: {
        name,
        location,
        address,
        phone,
        email
      }
    });

    res.status(201).json({
      success: true,
      data: store,
      message: 'Store created successfully'
    });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create store'
    });
  }
});

// Update store
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, address, phone, email, isActive } = req.body;

    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        location,
        address,
        phone,
        email,
        isActive
      }
    });

    res.json({
      success: true,
      data: store,
      message: 'Store updated successfully'
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update store'
    });
  }
});

// Delete store (soft delete - set isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if store has active loans
    const activeLoans = await prisma.loan.count({
      where: {
        storeId: id,
        returnedAt: null
      }
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete store with active loans'
      });
    }

    await prisma.store.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete store'
    });
  }
});

// Get store statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await prisma.loan.groupBy({
      by: ['returnedAt'],
      where: { storeId: id },
      _count: { id: true }
    });

    const activeLoans = await prisma.loan.count({
      where: {
        storeId: id,
        returnedAt: null
      }
    });

    const totalLoans = await prisma.loan.count({
      where: { storeId: id }
    });

    res.json({
      success: true,
      data: {
        totalLoans,
        activeLoans,
        completedLoans: totalLoans - activeLoans,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching store stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store statistics'
    });
  }
});

export default router;
