import fs from 'fs';
import path from 'path';

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV() {
  const exportFile = path.resolve(process.cwd(), 'database-export-clean.json');
  const rawData = fs.readFileSync(exportFile, 'utf-8');
  const exportData = JSON.parse(rawData);
  
  const { members, loans, loanPhotos } = exportData.data;
  
  // Members CSV
  const membersCSV = [
    ['ID', 'Card Token', 'Shopify Customer ID', 'Store Location', 'Tier', 'Status', 'Cycle Start', 'Cycle End', 'Items Used', 'Swaps Used', 'Items Out', 'Created At', 'Updated At'].join(','),
    ...members.map((m: any) => [
      escapeCSV(m.id),
      escapeCSV(m.cardToken),
      escapeCSV(m.shopifyCustomerId),
      escapeCSV(m.storeLocation),
      escapeCSV(m.tier),
      escapeCSV(m.status),
      escapeCSV(m.cycleStart),
      escapeCSV(m.cycleEnd),
      escapeCSV(m.itemsUsed),
      escapeCSV(m.swapsUsed),
      escapeCSV(m.itemsOut),
      escapeCSV(m.createdAt),
      escapeCSV(m.updatedAt),
    ].join(','))
  ].join('\n');
  
  // Loans CSV
  const loansCSV = [
    ['ID', 'Member ID', 'Store Location', 'Photo URL', 'Thumbnail URL', 'Checkout At', 'Due Date', 'Returned At', 'Swapped At', 'Swapped For ID', 'Swapped From ID', 'Created At'].join(','),
    ...loans.map((l: any) => [
      escapeCSV(l.id),
      escapeCSV(l.memberId),
      escapeCSV(l.storeLocation),
      escapeCSV(l.photoUrl),
      escapeCSV(l.thumbnailUrl),
      escapeCSV(l.checkoutAt),
      escapeCSV(l.dueDate),
      escapeCSV(l.returnedAt),
      escapeCSV(l.swappedAt),
      escapeCSV(l.swappedForId),
      escapeCSV(l.swappedFromId),
      escapeCSV(l.createdAt),
    ].join(','))
  ].join('\n');
  
  // Loan Photos CSV
  const photosCSV = [
    ['ID', 'R2 Key', 'Metadata', 'Loan ID', 'Created At'].join(','),
    ...loanPhotos.map((p: any) => [
      escapeCSV(p.id),
      escapeCSV(p.r2Key),
      escapeCSV(p.metadata),
      escapeCSV(p.loanId),
      escapeCSV(p.createdAt),
    ].join(','))
  ].join('\n');
  
  // Write CSV files
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const outputDir = path.resolve(process.cwd(), 'csv-backups');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  fs.writeFileSync(path.join(outputDir, `members-${timestamp}.csv`), membersCSV, 'utf-8');
  fs.writeFileSync(path.join(outputDir, `loans-${timestamp}.csv`), loansCSV, 'utf-8');
  fs.writeFileSync(path.join(outputDir, `loan-photos-${timestamp}.csv`), photosCSV, 'utf-8');
  
  console.log(`\n✅ CSV Export Complete!\n`);
  console.log(`📁 Location: ${outputDir}\n`);
  console.log(`📊 Files created:`);
  console.log(`   - members-${timestamp}.csv (${members.length} rows)`);
  console.log(`   - loans-${timestamp}.csv (${loans.length} rows)`);
  console.log(`   - loan-photos-${timestamp}.csv (${loanPhotos.length} rows)`);
}

exportToCSV();
