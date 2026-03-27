import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importData() {
  try {
    // Use the clean export file
    const filePath = path.resolve(process.cwd(), 'database-export-clean.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Export file not found: database-export-clean.json');
    }

    const latestFile = 'database-export-clean.json';
    
    console.log(`📂 Reading from: ${latestFile}`);
    
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const exportData = JSON.parse(rawData);
    
    if (!exportData.success || !exportData.data) {
      throw new Error('Invalid export data format');
    }

    const { members, loanPhotos } = exportData.data;

    console.log(`\n📊 Import Summary:`);
    console.log(`   Members: ${members.length}`);
    console.log(`   Loan Photos: ${loanPhotos.length}`);
    console.log(`\n🚀 Starting import...\n`);

    // Import Members (without relations first)
    console.log('⏳ Importing Members...');
    for (const member of members) {
      await prisma.member.create({
        data: {
          id: member.id,
          cardToken: member.cardToken,
          shopifyCustomerId: member.shopifyCustomerId,
          storeLocation: member.storeLocation,
          tier: member.tier,
          status: member.status,
          cycleStart: new Date(member.cycleStart),
          cycleEnd: new Date(member.cycleEnd),
          itemsUsed: member.itemsUsed,
          swapsUsed: member.swapsUsed,
          itemsOut: member.itemsOut,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${members.length} members\n`);

    // Import Loans (without swap relations first)
    console.log('⏳ Importing Loans (pass 1)...');
    const allLoans = members.flatMap((m: any) => m.loans || []);
    for (const loan of allLoans) {
      await prisma.loan.create({
        data: {
          id: loan.id,
          memberId: loan.memberId,
          storeLocation: loan.storeLocation,
          photoUrl: loan.photoUrl,
          thumbnailUrl: loan.thumbnailUrl,
          checkoutAt: new Date(loan.checkoutAt),
          dueDate: new Date(loan.dueDate),
          returnedAt: loan.returnedAt ? new Date(loan.returnedAt) : null,
          swappedAt: loan.swappedAt ? new Date(loan.swappedAt) : null,
          createdAt: new Date(loan.createdAt),
          // Skip swap relations for now
        },
      });
    }
    console.log(`✅ Imported ${allLoans.length} loans\n`);

    // Update swap relations (pass 2)
    console.log('⏳ Updating swap relations...');
    let swapCount = 0;
    for (const loan of allLoans) {
      if (loan.swappedForId || loan.swappedFromId) {
        await prisma.loan.update({
          where: { id: loan.id },
          data: {
            swappedForId: loan.swappedForId,
            swappedFromId: loan.swappedFromId,
          },
        });
        swapCount++;
      }
    }
    console.log(`✅ Updated ${swapCount} swap relations\n`);

    // Import Loan Photos
    console.log('⏳ Importing Loan Photos...');
    for (const photo of loanPhotos) {
      await prisma.loanPhoto.create({
        data: {
          id: photo.id,
          r2Key: photo.r2Key,
          metadata: photo.metadata,
          loanId: photo.loanId,
          createdAt: new Date(photo.createdAt),
        },
      });
    }
    console.log(`✅ Imported ${loanPhotos.length} loan photos\n`);

    console.log(`\n🎉 Import completed successfully!`);
    console.log(`\n📈 Final Stats:`);
    const finalStats = {
      members: await prisma.member.count(),
      loans: await prisma.loan.count(),
      loanPhotos: await prisma.loanPhoto.count(),
      auditEvents: await prisma.auditEvent.count(),
    };
    console.log(JSON.stringify(finalStats, null, 2));

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData();
